// Store with two backends:
//  - Local dev: JSON files under .data/ (zero setup).
//  - Vercel: Vercel Blob, used automatically when BLOB_READ_WRITE_TOKEN is set.
// Callers do not change when we switch backends.

import { promises as fs } from "fs";
import path from "path";
import type { Instruction, KnowledgeEntry, Post, PostMetric, Week } from "@/lib/types";

// Read at call time so a freshly added env var is picked up without surprises.
function useBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ── Filesystem backend (local) ───────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), ".data");
const WEEKS_DIR = path.join(DATA_DIR, "weeks");

async function fsEnsure(): Promise<void> {
  await fs.mkdir(WEEKS_DIR, { recursive: true });
}
async function fsList(): Promise<Week[]> {
  try {
    await fsEnsure();
    const files = await fs.readdir(WEEKS_DIR);
    const weeks: Week[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        weeks.push(JSON.parse(await fs.readFile(path.join(WEEKS_DIR, f), "utf8")));
      } catch {
        // skip corrupt file
      }
    }
    return weeks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    // Read-only filesystem (e.g. Vercel without Blob configured). Degrade to empty.
    return [];
  }
}
async function fsGet(id: string): Promise<Week | null> {
  await fsEnsure();
  try {
    return JSON.parse(await fs.readFile(path.join(WEEKS_DIR, `${id}.json`), "utf8")) as Week;
  } catch {
    return null;
  }
}
async function fsSave(week: Week): Promise<void> {
  try {
    await fsEnsure();
    await fs.writeFile(path.join(WEEKS_DIR, `${week.id}.json`), JSON.stringify(week, null, 2), "utf8");
  } catch (e) {
    if (process.env.VERCEL) {
      throw new Error(
        "Storage is not configured. Add Vercel Blob to this project (Storage tab) so content can be saved, then redeploy.",
      );
    }
    throw e;
  }
}
async function fsDel(id: string): Promise<void> {
  await fsEnsure();
  try {
    await fs.unlink(path.join(WEEKS_DIR, `${id}.json`));
  } catch {
    // already gone
  }
}

// ── Vercel Blob backend (production), SDK v2 ─────────────────────────────────
const blobPath = (id: string) => `weeks/${id}.json`;
// Match the store's access mode. Default public; set BLOB_ACCESS=private if the
// connected store is private.
const BLOB_ACCESS: "public" | "private" =
  process.env.BLOB_ACCESS === "private" ? "private" : "public";

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

async function blobSave(week: Week): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(blobPath(week.id), JSON.stringify(week), {
    access: BLOB_ACCESS,
    token: blobToken(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// Read a public blob by its URL. The ?t cache-bust guarantees fresh content
// after an overwrite at the same pathname.
async function blobReadByUrl(url: string): Promise<Week | null> {
  try {
    const r = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
    return r.ok ? ((await r.json()) as Week) : null;
  } catch {
    return null;
  }
}

async function blobList(): Promise<Week[]> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "weeks/", token: blobToken() });
    const weeks: Week[] = [];
    for (const b of blobs) {
      const w = await blobReadByUrl(b.url);
      if (w) weeks.push(w);
    }
    return weeks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

// Resolve a week by id. Retries briefly to cover read-after-write propagation
// right after a placeholder is created.
async function blobGet(id: string): Promise<Week | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: blobPath(id), token: blobToken() });
      const b = blobs.find((x) => x.pathname === blobPath(id)) || blobs[0];
      if (b) {
        const w = await blobReadByUrl(b.url);
        if (w) return w;
      }
    } catch {
      // fall through to retry
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

async function blobDel(id: string): Promise<void> {
  const { del } = await import("@vercel/blob");
  await del(blobPath(id), { token: blobToken() });
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function listWeeks(): Promise<Week[]> {
  return useBlob() ? blobList() : fsList();
}
export async function getWeek(id: string): Promise<Week | null> {
  return useBlob() ? blobGet(id) : fsGet(id);
}
export async function saveWeek(week: Week): Promise<void> {
  return useBlob() ? blobSave(week) : fsSave(week);
}
export async function deleteWeek(id: string): Promise<void> {
  return useBlob() ? blobDel(id) : fsDel(id);
}

export async function getPost(
  weekId: string,
  postId: string,
): Promise<{ week: Week; post: Post } | null> {
  const week = await getWeek(weekId);
  if (!week) return null;
  const post = week.posts.find((p) => p.id === postId);
  if (!post) return null;
  return { week, post };
}

export async function updatePost(
  weekId: string,
  postId: string,
  mutate: (post: Post) => void,
): Promise<{ week: Week; post: Post } | null> {
  const week = await getWeek(weekId);
  if (!week) return null;
  const post = week.posts.find((p) => p.id === postId);
  if (!post) return null;
  mutate(post);
  await saveWeek(week);
  return { week, post };
}

// ── Instructions (custom rules) ──────────────────────────────────────────────
const INSTRUCTIONS_PATH = "config/instructions.json";

async function fsReadInstructions(): Promise<Instruction[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, "config", "instructions.json"), "utf8"));
  } catch {
    return [];
  }
}
async function fsWriteInstructions(list: Instruction[]): Promise<void> {
  await fs.mkdir(path.join(DATA_DIR, "config"), { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, "config", "instructions.json"),
    JSON.stringify(list, null, 2),
    "utf8",
  );
}
async function blobReadInstructions(): Promise<Instruction[]> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: INSTRUCTIONS_PATH, token: blobToken() });
    const b = blobs.find((x) => x.pathname === INSTRUCTIONS_PATH) || blobs[0];
    if (!b) return [];
    const r = await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" });
    return r.ok ? ((await r.json()) as Instruction[]) : [];
  } catch {
    return [];
  }
}
async function blobWriteInstructions(list: Instruction[]): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(INSTRUCTIONS_PATH, JSON.stringify(list), {
    access: BLOB_ACCESS,
    token: blobToken(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getInstructions(): Promise<Instruction[]> {
  return useBlob() ? blobReadInstructions() : fsReadInstructions();
}
export async function saveInstructions(list: Instruction[]): Promise<void> {
  if (useBlob()) await blobWriteInstructions(list);
  else await fsWriteInstructions(list);
}

// ── Metrics (LinkedIn performance) ───────────────────────────────────────────
const METRICS_PATH = "config/metrics.json";

async function fsReadMetrics(): Promise<PostMetric[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, "config", "metrics.json"), "utf8"));
  } catch {
    return [];
  }
}
async function fsWriteMetrics(list: PostMetric[]): Promise<void> {
  await fs.mkdir(path.join(DATA_DIR, "config"), { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "config", "metrics.json"), JSON.stringify(list, null, 2), "utf8");
}
async function blobReadMetrics(): Promise<PostMetric[]> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: METRICS_PATH, token: blobToken() });
    const b = blobs.find((x) => x.pathname === METRICS_PATH) || blobs[0];
    if (!b) return [];
    const r = await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" });
    return r.ok ? ((await r.json()) as PostMetric[]) : [];
  } catch {
    return [];
  }
}
async function blobWriteMetrics(list: PostMetric[]): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(METRICS_PATH, JSON.stringify(list), {
    access: BLOB_ACCESS,
    token: blobToken(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getMetrics(): Promise<PostMetric[]> {
  return useBlob() ? blobReadMetrics() : fsReadMetrics();
}

// ── Knowledge (the memory layer) ─────────────────────────────────────────────
const KNOWLEDGE_PATH = "config/knowledge.json";

async function fsReadKnowledge(): Promise<KnowledgeEntry[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, "config", "knowledge.json"), "utf8"));
  } catch {
    return [];
  }
}
async function fsWriteKnowledge(list: KnowledgeEntry[]): Promise<void> {
  await fs.mkdir(path.join(DATA_DIR, "config"), { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "config", "knowledge.json"), JSON.stringify(list, null, 2), "utf8");
}
async function blobReadKnowledge(): Promise<KnowledgeEntry[]> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: KNOWLEDGE_PATH, token: blobToken() });
    const b = blobs.find((x) => x.pathname === KNOWLEDGE_PATH) || blobs[0];
    if (!b) return [];
    const r = await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" });
    return r.ok ? ((await r.json()) as KnowledgeEntry[]) : [];
  } catch {
    return [];
  }
}
async function blobWriteKnowledge(list: KnowledgeEntry[]): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(KNOWLEDGE_PATH, JSON.stringify(list), {
    access: BLOB_ACCESS,
    token: blobToken(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getKnowledge(): Promise<KnowledgeEntry[]> {
  return useBlob() ? blobReadKnowledge() : fsReadKnowledge();
}
export async function saveKnowledge(list: KnowledgeEntry[]): Promise<void> {
  if (useBlob()) await blobWriteKnowledge(list);
  else await fsWriteKnowledge(list);
}

// Merge rows into the store. Key: postId when present, else date+label.
export async function mergeMetrics(rows: PostMetric[]): Promise<PostMetric[]> {
  const list = await getMetrics();
  const key = (m: PostMetric) => m.postId || `${m.date || ""}|${(m.label || "").slice(0, 60)}`;
  const byKey = new Map(list.map((m) => [key(m), m]));
  for (const row of rows) {
    if (!row || (!row.postId && !row.date && !row.label)) continue;
    const k = key(row);
    byKey.set(k, { ...byKey.get(k), ...row, updatedAt: new Date().toISOString() });
  }
  const merged = [...byKey.values()];
  if (useBlob()) await blobWriteMetrics(merged);
  else await fsWriteMetrics(merged);
  return merged;
}
