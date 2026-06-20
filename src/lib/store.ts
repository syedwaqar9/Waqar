// File-based store for the first cut: zero setup, runs anywhere with a disk.
// Swap this module for Postgres later without touching callers.

import { promises as fs } from "fs";
import path from "path";
import type { Post, Week } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const WEEKS_DIR = path.join(DATA_DIR, "weeks");

async function ensure(): Promise<void> {
  await fs.mkdir(WEEKS_DIR, { recursive: true });
}

export async function listWeeks(): Promise<Week[]> {
  await ensure();
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

export async function getWeek(id: string): Promise<Week | null> {
  await ensure();
  try {
    return JSON.parse(
      await fs.readFile(path.join(WEEKS_DIR, `${id}.json`), "utf8"),
    ) as Week;
  } catch {
    return null;
  }
}

export async function saveWeek(week: Week): Promise<void> {
  await ensure();
  await fs.writeFile(
    path.join(WEEKS_DIR, `${week.id}.json`),
    JSON.stringify(week, null, 2),
    "utf8",
  );
}

export async function deleteWeek(id: string): Promise<void> {
  await ensure();
  try {
    await fs.unlink(path.join(WEEKS_DIR, `${id}.json`));
  } catch {
    // already gone
  }
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

// Mutate one post and persist the week. Returns the updated pair.
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
