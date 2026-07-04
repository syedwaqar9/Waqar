import { NextRequest, NextResponse } from "next/server";
import { listWeeks } from "@/lib/store";
import { notifyDailyPost } from "@/lib/slack";

export const maxDuration = 60;

// Weekday morning nudge: sends today's post to Slack, caption ready to copy.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  const weeks = await listWeeks();
  for (const week of weeks) {
    if (week.source !== "auto") continue;
    const post = week.posts.find((p) => p.date === today);
    if (post) {
      await notifyDailyPost(week, post);
      return NextResponse.json({ ok: true, posted: post.day, approved: post.status === "approved" });
    }
  }
  // No post scheduled today: stay silent, no Slack noise.
  return NextResponse.json({ ok: true, skipped: true });
}
