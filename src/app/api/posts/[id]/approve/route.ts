import { NextRequest, NextResponse } from "next/server";
import { getWeek, saveWeek } from "@/lib/store";
import { notifyApproved } from "@/lib/slack";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const { weekId, by } = await req.json();
    const week = await getWeek(weekId);
    if (!week) return NextResponse.json({ error: "Week not found." }, { status: 404 });

    const post = week.posts.find((p) => p.id === id);
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    const wasApproved = week.status === "approved";
    if (post.status !== "approved") {
      post.status = "approved";
      // Approvals are logged for the in-product Activity feed, never Slacked.
      post.history.push({
        at: new Date().toISOString(),
        source: by === "jaya" ? "jaya" : "waqar",
        action: "approved",
      });
    }

    if (week.posts.every((p) => p.status === "approved")) {
      week.status = "approved";
      await saveWeek(week);
      // The one Slack message about review: the week is approved.
      if (!wasApproved) await notifyApproved(week);
    } else {
      await saveWeek(week);
    }
    return NextResponse.json({ ok: true, weekStatus: week.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
