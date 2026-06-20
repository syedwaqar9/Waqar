import { NextRequest, NextResponse } from "next/server";
import { getPost, saveWeek } from "@/lib/store";
import { revisePost } from "@/lib/generate/generate";

export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const { weekId, note, by } = await req.json();
    if (!note || !weekId) {
      return NextResponse.json({ error: "weekId and note are required." }, { status: 400 });
    }
    const found = await getPost(weekId, id);
    if (!found) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const revised = await revisePost(found.post, String(note), by === "waqar" ? "waqar" : "jaya");
    const idx = found.week.posts.findIndex((p) => p.id === id);
    found.week.posts[idx] = revised;
    found.week.status = "changes_requested";
    await saveWeek(found.week);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
