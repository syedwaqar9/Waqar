// Slack delivery. First cut uses an incoming webhook (one env var). If unset,
// these are no-ops so the tool runs without Slack configured.
import type { Week } from "@/lib/types";

async function postSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // best effort
  }
}

function link(week: Week): string {
  // Fall back to the Vercel production domain so Slack links work even before
  // APP_BASE_URL is configured.
  const base =
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");
  return `${base}/week/${week.id}`;
}

// Saturday: send Jaya the review link.
export async function notifyReview(week: Week): Promise<void> {
  await postSlack(`A new week is ready for your review: ${week.label}\n${link(week)}`);
}

// On full approval: ping Waqar to schedule.
export async function notifyApproved(week: Week): Promise<void> {
  await postSlack(`Approved and ready to post: ${week.label}\n${link(week)}`);
}
