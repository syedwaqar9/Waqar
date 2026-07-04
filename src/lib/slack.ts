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

// Weekday morning: today's approved post, ready to copy and publish.
export async function notifyDailyPost(week: Week, post: Post): Promise<boolean> {
  const assetCount = post.format === "carousel" ? post.slides?.length || 7 : 1;
  const pngs = Array.from(
    { length: assetCount },
    (_, i) => `${base()}/api/render?weekId=${week.id}&postId=${post.id}&slide=${i}`,
  );
  if (post.status !== "approved") {
    return postSlack(
      `Today's post (${post.day}) is NOT approved yet: ${post.topic}\nReview it before posting: ${link(week)}#post-${post.id}`,
    );
  }
  return postSlack(
    `Time to post (${post.day} 8:30 AM ET): *${post.topic}*\n\n` +
      `Caption (copy below):\n${post.caption}\n\n${post.hashtags.join(" ")}\n\n` +
      (post.firstComment ? `First comment (post within the hour):\n${post.firstComment}\n\n` : "") +
      `${assetCount > 1 ? `${assetCount} slides` : "Image"}: ${pngs.join("\n")}\n` +
      (post.reshareBy ? `Reminder: Jaya reshares this one.\n` : "") +
      `${link(week)}#post-${post.id}`,
  );
}

// Weekend reminder when the week has not been fully reviewed.
export async function notifyReviewReminder(
  week: Week,
  reviewed: number,
  total: number,
): Promise<boolean> {
  return postSlack(
    `Hi Jaya, next week's content is still waiting for your review: *${week.label}*\n` +
      `${reviewedLine(reviewed, total)}\n${reviewerLink(week)}`,
  );
}

function reviewedLine(reviewed: number, total: number): string {
  return reviewed === 0
    ? `None of the ${total} posts are reviewed yet.`
    : `${reviewed} of ${total} posts reviewed so far.`;
}

// Connectivity check for the Test Slack button.
export async function sendTestMessage(): Promise<boolean> {
  return postSlack(
    "Sunnyvale test message. Slack is connected: review links and approval updates will arrive in this channel.",
  );
}
