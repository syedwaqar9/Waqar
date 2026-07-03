// THE GUARDRAIL LINTER
// Section 11 of Waqar's manual as automated pre-checks. Runs on every post
// before it reaches review. Errors block, warnings flag for a human.

import type { LintIssue, LintResult, Post, SingleVisual, Slide } from "@/lib/types";
import { VOICE, DESIGN } from "@/brand/brandBrain";

// Crude width estimate for DM Sans. The renderer also auto-fits, so this is a
// warning-level safety net for headline lines that will overflow the 960px card.
export function estimateTextWidth(text: string, fontSize: number, bold = true): number {
  const factor = bold ? 0.6 : 0.53;
  return text.length * fontSize * factor;
}

function headlineLines(post: Post): string[] {
  const lines: string[] = [];
  if (post.single) {
    lines.push(...(post.single.headlineWhite || []), ...(post.single.headlineAccent || []));
  }
  for (const s of post.slides || []) {
    lines.push(...(s.headlineWhite || []), ...(s.headlineAccent || []));
  }
  return lines.filter(Boolean);
}

function allText(post: Post): string {
  const parts: string[] = [post.caption, post.hook, post.topic, post.rationale];
  if (post.hookOptions) parts.push(...post.hookOptions);
  if (post.firstComment) parts.push(post.firstComment);
  parts.push(...headlineLines(post));
  for (const s of post.slides || []) {
    if (s.eyebrow) parts.push(s.eyebrow);
    if (s.subhead) parts.push(s.subhead);
    if (s.bullets) parts.push(...s.bullets);
    if (s.gridItems) parts.push(...s.gridItems.map((g) => `${g.label} ${g.caption || ""}`));
    if (s.compareRows) parts.push(...s.compareRows.map((r) => `${r.left} ${r.right}`));
    if (s.cta) parts.push(s.cta);
  }
  if (post.single?.subhead) parts.push(post.single.subhead);
  if (post.reshareCommentary) parts.push(post.reshareCommentary);
  return parts.join("\n");
}

export function lintPost(post: Post): LintResult {
  const issues: LintIssue[] = [];
  const text = allText(post);
  const captionLower = post.caption.toLowerCase();

  // Em dashes (and en dashes used as dashes).
  if (/[—–]/.test(text)) {
    issues.push({ rule: "no-em-dash", level: "error", message: "Contains an em or en dash. Use commas, colons, or periods." });
  }

  // Exclamation marks.
  if (/!/.test(text)) {
    issues.push({ rule: "no-exclamation", level: "error", message: "Contains an exclamation mark." });
  }

  // Exactly 3 hashtags.
  if (post.hashtags.length !== 3) {
    issues.push({ rule: "exactly-3-hashtags", level: "error", message: `Has ${post.hashtags.length} hashtags, needs exactly 3.` });
  }

  // Standard CTA present.
  if (!captionLower.includes("iaimscience.org")) {
    issues.push({ rule: "cta-present", level: "error", message: "Caption is missing the standard CTA (iaimscience.org)." });
  }

  // No comment-trigger CTAs. Quoted trigger words, "comment below", "in the
  // comments", "drop X below". Plain "comment period" (FDA language) must pass.
  if (
    /comment\s+["'“”‘’]\w+|comment below|in the comments|drop (a|your|it|them) .{0,20}below|share in the comments/i.test(
      text,
    )
  ) {
    issues.push({ rule: "no-comment-cta", level: "error", message: "Contains a comment-trigger CTA. Jaya removed these permanently." });
  }

  // Anti-slop patterns that read as AI-generated.
  if (/\bnot just\b/i.test(text)) {
    issues.push({ rule: "no-slop", level: "warn", message: `Uses the "not just X, it is Y" reversal cliche.` });
  }
  if (/here's (the thing|why|how|what)/i.test(text)) {
    issues.push({ rule: "no-slop", level: "warn", message: `Uses a "Here's the..." crutch opener.` });
  }
  if (/\p{Extended_Pictographic}/u.test(text)) {
    issues.push({ rule: "no-emoji", level: "warn", message: "Contains an emoji." });
  }
  // Duplicate hashtags.
  if (new Set(post.hashtags.map((h) => h.toLowerCase())).size !== post.hashtags.length) {
    issues.push({ rule: "unique-hashtags", level: "error", message: "Hashtags are duplicated." });
  }

  // Colorado stale-date guard.
  if (/colorado/i.test(text) && /june\s*30|30\s*june/i.test(text)) {
    issues.push({ rule: "colorado-date", level: "error", message: "Cites the stale Colorado June 30 date. Current law is SB 26-189, effective Jan 1, 2027." });
  }

  // Banned hype terms.
  for (const term of VOICE.bannedTerms) {
    const re = new RegExp(`\\b${term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) {
      issues.push({ rule: "no-ai-vocab", level: "warn", message: `Uses banned term "${term}".` });
    }
  }

  // Headline width: warn on lines likely to overflow the 960px card.
  for (const line of headlineLines(post)) {
    // Single posts use very large type (~96px). Carousels ~64px.
    const approx = estimateTextWidth(line, post.single ? 92 : 64);
    if (approx > DESIGN.usableWidth + 40) {
      issues.push({ rule: "headline-width", level: "warn", message: `Headline line may overflow: "${line}".` });
    }
  }

  // Source labels that will clip on the card.
  const labels = [post.single?.sourceLabel, ...(post.slides || []).map((s) => s.sourceLabel)].filter(
    Boolean,
  ) as string[];
  for (const l of labels) {
    if (l.length > 45) {
      issues.push({ rule: "source-label-length", level: "warn", message: `Source label may clip: "${l}".` });
    }
  }

  // Caption length sanity.
  if (post.caption.length < 120) {
    issues.push({ rule: "caption-too-short", level: "warn", message: "Caption looks short for LinkedIn." });
  }

  return { ok: issues.every((i) => i.level !== "error"), issues };
}
