// Store with two backends:
//  - Local dev: JSON files under .data/ (zero setup).
//  - Vercel: Vercel Blob, used automatically when BLOB_READ_WRITE_TOKEN is set.
// Callers do not change when we switch backends.

import { promises as fs } from "fs";
import path from "path";
import type { Post, Week } from "@/lib/types";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const useBlob = !!TOKEN;

// ── Filesystem backend (local) ───────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), ".data");
const WEEKS_DIR = path.join(DATA_DIR, "weeks");

async function fsEnsure(): Promise<void> {
  await fs.mkdir(WEEKS_DIR, { recursive: true });
}
async function fsList(): Promise<Week[]> {
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
  await fsEnsure();
  await fs.writeFile(path.join(WEEKS_DIR, `${week.id}.json`), JSON.stringify(week, null, 2), "utf8");
}
async function fsDel(id: string): Promise<void> {
  await fsEnsure();
  try {
    await fs.unlink(path.join(WEEKS_DIR, `${id}.json`));
  } catch {
    // already gone
  }
}

// ── Vercel Blob backend (production) ─────────────────────────────────────────
const blobPath = (id: string) => `weeks/${id}.json`;

async function blobSave(week: Week): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(blobPath(week.id), JSON.stringify(week), {
    access: "public",
    token: TOKEN,
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}
async function blobFetch(url: string): Promise<Week | null> {
  try {
    const r = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
    return r.ok ? ((await r.json()) as Week) : null;
  } catch {
    return null;
  }
}
async function blobList(): Promise<Week[]> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: "weeks/", token: TOKEN });
  const weeks: Week[] = [];
  for (const b of blobs) {
    const w = await blobFetch(b.url);
    if (w) weeks.push(w);
  }
  return weeks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function blobGet(id: string): Promise<Week | null> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: blobPath(id), token: TOKEN });
  const b = blobs.find((x) => x.pathname === blobPath(id)) || blobs[0];
  return b ? blobFetch(b.url) : null;
}
async function blobDel(id: string): Promise<void> {
  const { list, del } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: blobPath(id), token: TOKEN });
  for (const b of blobs) await del(b.url, { token: TOKEN });
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function listWeeks(): Promise<Week[]> {
  return useBlob ? blobList() : fsList();
}
export async function getWeek(id: string): Promise<Week | null> {
  return useBlob ? blobGet(id) : fsGet(id);
}
export async function saveWeek(week: Week): Promise<void> {
  return useBlob ? blobSave(week) : fsSave(week);
}
export async function deleteWeek(id: string): Promise<void> {
  return useBlob ? blobDel(id) : fsDel(id);
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
