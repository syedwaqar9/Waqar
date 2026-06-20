import { NextRequest, NextResponse } from "next/server";
import { getWeek, saveWeek } from "@/lib/store";
import { notifyReview } from "@/lib/slack";

// Send the week's review link to Jaya on Slack (on demand).
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const week = await getWeek(id);
  if (!week) return NextResponse.json({ error: "Week not found." }, { status: 404 });

  const hasSlack = !!process.env.SLACK_WEBHOOK_URL;
  if (hasSlack) {
    await notifyReview(week);
    if (week.status === "generating") {
      week.status = "in_review";
      await saveWeek(week);
    }
  }
  return NextResponse.json({ ok: true, sent: hasSlack });
}
