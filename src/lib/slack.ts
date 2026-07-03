// Slack delivery via incoming webhook (SLACK_WEBHOOK_URL). Every sender
// reports success/failure so the UI can surface real delivery status.
import type { Post, Week } from "@/lib/types";

export function slackConfigured(): boolean {
  return !!process.env.SLACK_WEBHOOK_URL;
}

async function postSlack(text: string): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function base(): string {
  return (
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "")
  );
}

function link(week: Week): string {
  return `${base()}/week/${week.id}`;
}

// The link Jaya gets: reviewer mode, clean approve/request-changes surface.
function reviewerLink(week: Week): string {
  return `${link(week)}?reviewer=1`;
}

// Content is ready: send Jaya the review link.
export async function notifyReview(week: Week): Promise<boolean> {
  return postSlack(
    `Hi Jaya, next week's content is ready for your review: *${week.label}*\n` +
      `${reviewerLink(week)}\n` +
      `Open the link, then on each post click Approve, or Request changes and type what to change. It will be revised and ready for another look. Approve all clears the week in one click.`,
  );
}

// Jaya approved one post: keep Waqar in the loop as it happens.
export async function notifyPostApproved(
  week: Week,
  post: Post,
  approvedCount: number,
  total: number,
): Promise<boolean> {
  return postSlack(
    `Jaya approved ${post.day} (${post.topic}). ${approvedCount}/${total} approved for ${week.label}.\n${link(week)}`,
  );
}

// Whole week approved: Waqar schedules it on LinkedIn.
export async function notifyApproved(week: Week): Promise<boolean> {
  return postSlack(
    `All posts approved and ready to schedule: *${week.label}*\n${link(week)}`,
  );
}

// Free-form report delivery (improvement loop).
export async function notifyReport(text: string): Promise<boolean> {
  return postSlack(text);
}

// Connectivity check for the Test Slack button.
export async function sendTestMessage(): Promise<boolean> {
  return postSlack(
    "Sunnyvale test message. Slack is connected: review links and approval updates will arrive in this channel.",
  );
}
