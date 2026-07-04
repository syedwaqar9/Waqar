import { NextRequest, NextResponse } from "next/server";
import { getMetrics, mergeMetrics } from "@/lib/store";
import type { PostMetric } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ metrics: await getMetrics() });
}

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows to import." }, { status: 400 });
    }
    const cleaned: PostMetric[] = rows
      .map((r: Record<string, unknown>) => ({
        postId: r.postId ? String(r.postId) : undefined,
        date: r.date ? String(r.date).slice(0, 10) : undefined,
        label: r.label ? String(r.label).slice(0, 120) : undefined,
        impressions: num(r.impressions),
        reactions: num(r.reactions),
        comments: num(r.comments),
        reposts: num(r.reposts),
        followers: num(r.followers),
        profileViews: num(r.profileViews),
        updatedAt: new Date().toISOString(),
      }))
      .filter((r) => r.postId || r.date || r.label);
    const merged = await mergeMetrics(cleaned);
    return NextResponse.json({ ok: true, imported: cleaned.length, total: merged.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(String(v).replace(/[,\s%]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}
