// Store with two backends:
//  - Local dev: JSON files under .data/ (zero setup).
//  - Vercel: Vercel Blob, used automatically when BLOB_READ_WRITE_TOKEN is set.
// Callers do not change when we switch backends.

import { promises as fs } from "fs";
import path from "path";
import type { Post, Week } from "@/lib/types";

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

// Read straight from origin (useCache: false) so edits are never stale.
async function blobRead(pathname: string): Promise<Week | null> {
  try {
    const { get } = await import("@vercel/blob");
    const res = await get(pathname, { access: BLOB_ACCESS, token: blobToken(), useCache: false });
    if (!res || !res.stream) return null;
    const text = await new Response(res.stream).text();
    return JSON.parse(text) as Week;
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
      const w = await blobRead(b.pathname);
      if (w) weeks.push(w);
    }
    return weeks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

async function blobGet(id: string): Promise<Week | null> {
  return blobRead(blobPath(id));
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
