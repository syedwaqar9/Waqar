import { NextRequest, NextResponse } from "next/server";
import { getWeek, saveWeek } from "@/lib/store";
import { notifyApproved } from "@/lib/slack";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const { weekId } = await req.json();
    const week = await getWeek(weekId);
    if (!week) return NextResponse.json({ error: "Week not found." }, { status: 404 });

    const post = week.posts.find((p) => p.id === id);
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    const wasApproved = week.status === "approved";
    post.status = "approved";

    if (week.posts.every((p) => p.status === "approved")) {
      week.status = "approved";
      await saveWeek(week);
      if (!wasApproved) await notifyApproved(week);
    } else {
      await saveWeek(week);
    }
    return NextResponse.json({ ok: true, weekStatus: week.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
