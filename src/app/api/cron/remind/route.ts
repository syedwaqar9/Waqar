import { NextRequest, NextResponse } from "next/server";
import { listWeeks } from "@/lib/store";
import { notifyReviewReminder } from "@/lib/slack";

export const maxDuration = 60;

// Weekend reminders (Sunday morning and Sunday evening Dallas): if the latest
// generated week is not fully reviewed, nudge Jaya with the link.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const weeks = await listWeeks();
  const NINE_DAYS = 9 * 86400000;
  const latest = weeks.find(
    (w) =>
      w.source === "auto" &&
      w.posts.length > 0 &&
      Date.now() - new Date(w.createdAt).getTime() < NINE_DAYS,
  );
  if (!latest || latest.status === "approved") {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const reviewed = latest.posts.filter(
    (p) => p.status === "approved" || p.status === "changes_requested",
  ).length;
  if (reviewed === latest.posts.length) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  await notifyReviewReminder(latest, reviewed, latest.posts.length);
  return NextResponse.json({ ok: true, reminded: true });
}
