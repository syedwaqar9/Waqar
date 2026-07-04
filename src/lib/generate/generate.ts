import { nanoid } from "nanoid";
import {
  WEEK_RHYTHM,
  POST_TYPES,
  ICPS,
  DESIGN,
  VOICE,
  ORG,
  HASHTAG_POOL,
} from "@/brand/brandBrain";
import { SEED_FACTS } from "@/brand/facts";
import { completeJSON, getClient, textOf, MODEL } from "@/lib/anthropic";
import { researchWeb } from "@/lib/anthropic";
import { brandSystemPrompt, POST_JSON_SHAPE } from "@/lib/generate/prompts";
import { lintPost } from "@/lib/linter";
import { addDays, isoDate, longLabel, nextMonday, lastWeekRange } from "@/lib/dates";
import { getInstructions, getMetrics, getWeek, listWeeks, saveInstructions, saveWeek } from "@/lib/store";
import { notifyReview } from "@/lib/slack";
import type {
  ICP,
  Instruction,
  Post,
  PostFormat,
  PostType,
  Slide,
  SingleVisual,
  Source,
  Week,
} from "@/lib/types";

const ICP_KEYS = Object.keys(ICPS) as ICP[];

interface DaySpec {
  dayIndex: number;
  day: string;
  type: PostType;
  format: PostFormat;
  reshareBy: "jaya" | null;
  topic: string;
  angle: string;
  geography: string;
  icps: ICP[];
}

function activeFactsText(): string {
  return SEED_FACTS.filter((f) => f.status === "active")
    .map((f) => `- [${f.jurisdiction}] ${f.claim} (${f.publisher}, ${f.sourceUrl}). ${f.detail}`)
    .join("\n");
}

function blockedFactsText(): string {
  return SEED_FACTS.filter((f) => f.status === "blocked")
    .map((f) => `- ${f.doNotCite}`)
    .join("\n");
}

// Custom rules from the Instructions tab that apply to this post (global, or
// targeted to this post type / ICP).
function customRulesText(instructions: Instruction[], type: PostType, icps: ICP[]): string {
  const relevant = instructions.filter(
    (i) =>
      i.enabled &&
      (!i.postType || i.postType === type) &&
      (!i.icp || icps.includes(i.icp)),
  );
  if (!relevant.length) return "";
  return relevant.map((i) => `- ${i.body}`).join("\n");
}

function rulesBlock(customRules: string): string {
  return customRules
    ? `CUSTOM INSTRUCTIONS FROM THE GROWTH ADVISOR (must follow; these win if they conflict with defaults):\n${customRules}\n\n`
    : "";
}

function coerceICPs(raw: unknown, fallback: ICP[]): ICP[] {
  if (!Array.isArray(raw)) return fallback;
  const out = raw.filter((x): x is ICP => typeof x === "string" && ICP_KEYS.includes(x as ICP));
  return out.length ? out : fallback;
}

// ── Planner ──────────────────────────────────────────────────────────────────
async function planWeek(
  startDate: Date,
  research: string,
  existingTopics: string[],
): Promise<DaySpec[]> {
  const rhythm = WEEK_RHYTHM.map((r) => ({
    dayIndex: r.dayIndex,
    day: r.day,
    type: r.type,
    typeLabel: POST_TYPES[r.type].label,
    format: r.format,
    reshare: r.reshareBy === "jaya",
  }));

  const user = `This week's verified research:
${research}

Verified facts available to cite:
${activeFactsText()}

Do NOT cite (stale or blocked):
${blockedFactsText()}

Already covered in past weeks, do NOT repeat these topics or angles:
${existingTopics.length ? existingTopics.map((t) => `- ${t}`).join("\n") : "- (none yet)"}

The fixed weekly rhythm (keep day, type, format, reshare as given):
${JSON.stringify(rhythm, null, 2)}

Assign each of the 5 days a concrete topic for the week of ${longLabel(startDate)}.
Rules:
- Balance all four ICPs across the week: ${ICP_KEYS.map((k) => ICPS[k].label).join(", ")}.
- Vary geography across the week. Do not make it look like an EU AI Act newsletter. Mix EU, US federal, US state, sector, and standards.
- Each topic must be supported by the research or the verified facts.
- Tuesday and Friday are Jaya reshares.

Return JSON array of 5 objects in day order:
[{ "dayIndex": number, "topic": string, "angle": string, "geography": string, "icps": [icp keys] }]
icp keys are: ${ICP_KEYS.join(", ")}.`;

  type PlannedDay = { dayIndex: number; topic: string; angle: string; geography: string; icps: string[] };
  let planned: PlannedDay[] = [];
  for (let attempt = 0; attempt < 2 && planned.length === 0; attempt++) {
    try {
      const raw = await completeJSON<unknown>({
        system: brandSystemPrompt(),
        user,
        maxTokens: 2500,
      });
      // Accept a bare array or a common wrapper key.
      const arr = Array.isArray(raw)
        ? raw
        : ((raw as { days?: unknown[]; plan?: unknown[]; posts?: unknown[] })?.days ??
          (raw as { plan?: unknown[] })?.plan ??
          (raw as { posts?: unknown[] })?.posts ??
          []);
      planned = (arr as PlannedDay[]).filter((x) => x && typeof x === "object");
    } catch {
      // retry once
    }
  }
  if (planned.length === 0) {
    throw new Error("The planner did not return a usable plan.");
  }

  return WEEK_RHYTHM.map((r) => {
    const p = planned.find((x) => x.dayIndex === r.dayIndex) || planned[r.dayIndex];
    return {
      dayIndex: r.dayIndex,
      day: r.day,
      type: r.type,
      format: r.format,
      reshareBy: r.reshareBy,
      topic: p?.topic || POST_TYPES[r.type].label,
      angle: p?.angle || "",
      geography: p?.geography || "",
      icps: coerceICPs(p?.icps, POST_TYPES[r.type].icps),
    };
  });
}

// ── Per-post draft ───────────────────────────────────────────────────────────
interface PostDraft {
  topic?: string;
  hook?: string;
  hookOptions?: string[];
  firstComment?: string;
  caption?: string;
  hashtags?: string[];
  rationale?: string;
  reshareCommentary?: string;
  sources?: Source[];
  single?: Partial<SingleVisual>;
  slides?: Partial<Slide>[];
}

function coerceCaption(caption: string): string {
  let c = (caption || "").trim();
  if (!c.toLowerCase().includes("iaimscience.org")) {
    c += `\n\n${VOICE.cta}`;
  }
  return c;
}

function coerceHashtags(tags: unknown): string[] {
  const raw = Array.isArray(tags) ? tags.map((t) => String(t).trim()) : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (let t of raw) {
    if (!t) continue;
    t = t.startsWith("#") ? t : `#${t.replace(/\s+/g, "")}`;
    const k = t.toLowerCase();
    if (t.length > 1 && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
    if (out.length === 3) return out;
  }
  // Top up from the pool without duplicating.
  for (const p of HASHTAG_POOL) {
    if (out.length === 3) break;
    if (!seen.has(p.toLowerCase())) {
      seen.add(p.toLowerCase());
      out.push(p);
    }
  }
  return out.slice(0, 3);
}

function coerceSlides(raw: Partial<Slide>[] | undefined): Slide[] {
  const slides = (raw || []).slice(0, 7);
  return slides.map((s, i) => ({
    index: i + 1,
    theme: s.theme === "light" || s.theme === "dark" ? s.theme : DESIGN.carouselRhythm[i] || "dark",
    layout: s.layout || (i === 0 ? "hook" : i === slides.length - 1 ? "takeaway" : "statement"),
    eyebrow: s.eyebrow,
    headlineWhite: s.headlineWhite || [],
    headlineAccent: s.headlineAccent || [],
    subhead: s.subhead,
    bullets: s.bullets,
    gridItems: s.gridItems,
    compareTitleLeft: s.compareTitleLeft,
    compareTitleRight: s.compareTitleRight,
    compareRows: s.compareRows,
    cta: s.cta,
    sourceLabel: s.sourceLabel,
  }));
}

function coerceSingle(raw: Partial<SingleVisual> | undefined, type: PostType): SingleVisual {
  const dark = type === "regulation_alert" || type === "founder_moment";
  return {
    theme: raw?.theme === "light" || raw?.theme === "dark" ? raw.theme : dark ? "dark" : "light",
    eyebrow: raw?.eyebrow || POST_TYPES[type].label.toUpperCase(),
    headlineWhite: raw?.headlineWhite || [],
    headlineAccent: raw?.headlineAccent || [],
    subhead: raw?.subhead,
    cta: raw?.cta,
    sourceLabel: raw?.sourceLabel,
  };
}

function draftToPost(
  draft: PostDraft,
  spec: DaySpec,
  weekId: string,
  startDate: Date,
): Post {
  const date = isoDate(addDays(startDate, spec.dayIndex));
  const post: Post = {
    id: nanoid(10),
    weekId,
    dayIndex: spec.dayIndex,
    day: spec.day,
    date,
    type: spec.type,
    format: spec.format,
    icps: spec.icps,
    reshareBy: spec.reshareBy,
    status: "in_review",
    topic: draft.topic || spec.topic,
    hook: draft.hook || draft.hookOptions?.[0] || "",
    hookOptions: Array.isArray(draft.hookOptions) ? draft.hookOptions.slice(0, 3) : undefined,
    firstComment: draft.firstComment,
    caption: coerceCaption(draft.caption || ""),
    hashtags: coerceHashtags(draft.hashtags),
    cta: VOICE.cta,
    rationale: draft.rationale || spec.angle,
    reshareCommentary: spec.reshareBy ? draft.reshareCommentary || "" : undefined,
    sources: Array.isArray(draft.sources) ? draft.sources : [],
    single: spec.format === "single" ? coerceSingle(draft.single, spec.type) : undefined,
    slides: spec.format === "carousel" ? coerceSlides(draft.slides) : undefined,
    history: [],
    comments: [],
  };
  post.lint = lintPost(post);
  return post;
}

async function generatePost(
  spec: DaySpec,
  research: string,
  weekId: string,
  startDate: Date,
  customRules: string,
  alreadyDrafted: string[] = [],
  qaFeedback = "",
): Promise<Post> {
  const reshareNote = spec.reshareBy
    ? `This is a Jaya reshare. Also write "reshareCommentary": a short first-person line in Jaya Kandaswamy's voice (${ORG.founderTitle}), honest and specific, using "${VOICE.hedges.observation}" for any observational claim.`
    : `Not a reshare. Leave reshareCommentary empty.`;
  const typeNote =
    spec.type === "founder_moment"
      ? `This is a Founder Moment. Write in Jaya's first-person, mission-level voice (I or we), a reflection on why this matters, not a news alert. The eyebrow must be a mission or founder label, never an "ALERT" label. No unsourced statistics.`
      : "";

  const user = `Create the ${POST_TYPES[spec.type].label} for ${spec.day}, ${longLabel(
    addDays(startDate, spec.dayIndex),
  )}.
Format: ${spec.format}${spec.format === "carousel" ? " (exactly 7 slides)" : ""}.
Topic: ${spec.topic}
Angle: ${spec.angle}
Geography: ${spec.geography}
Target ICPs: ${spec.icps.map((k) => ICPS[k].label).join(", ")}.
Type guidance: ${POST_TYPES[spec.type].description}
${reshareNote}
${typeNote}
${
  alreadyDrafted.length
    ? `\nAlready drafted this week (your hook and opening rhythm must take a DIFFERENT shape from these, so the week does not read as one template):\n${alreadyDrafted
        .map((h) => `- ${h}`)
        .join("\n")}\n`
    : ""
}
This week's verified research (cite from here and from the verified facts only):
${research}

Verified facts you may cite:
${activeFactsText()}

Never cite:
${blockedFactsText()}

${
  qaFeedback
    ? `THE QUALITY REVIEWER REJECTED THE PREVIOUS DRAFT. Fix ALL of these before anything else:\n${qaFeedback}\n\n`
    : ""
}${rulesBlock(customRules)}${POST_JSON_SHAPE}`;

  const draft = await completeJSON<PostDraft>({
    system: brandSystemPrompt(),
    user,
    maxTokens: spec.format === "carousel" ? 8000 : 4500,
  });
  return draftToPost(draft, spec, weekId, startDate);
}

// ── THE QA AGENT ─────────────────────────────────────────────────────────────
// Every drafted post passes a quality gate before it enters the week:
// 1. Deterministic layout checks (text that will not fit its card).
// 2. Blocking lint errors (voice rules).
// 3. A model reviewer that rejects AI-sounding copy and unsourced claims.
// A rejected draft is regenerated with the reviewer's reasons, up to 2 rounds.

function layoutQA(post: Post): string[] {
  const issues: string[] = [];
  const label = (l: string | undefined, where: string) => {
    if (l && l.length > 45) issues.push(`${where}: sourceLabel is ${l.length} chars, hard limit 40: "${l}"`);
  };
  if (post.format === "single") {
    if (!post.single || (!post.single.headlineWhite?.length && !post.single.headlineAccent?.length)) {
      issues.push("Single image has no headline.");
    } else {
      label(post.single.sourceLabel, "Single image");
      const lines = [...post.single.headlineWhite, ...post.single.headlineAccent];
      if (lines.length > 5) issues.push(`Single has ${lines.length} headline lines, max 5.`);
      for (const l of lines) if (l.length > 30) issues.push(`Single headline line too long to render large: "${l}"`);
      if ((post.single.subhead || "").length > 150) issues.push("Single subhead over 150 chars will clip to 3 lines.");
    }
  }
  if (post.format === "carousel") {
    const slides = post.slides || [];
    if (slides.length < 7) issues.push(`Carousel has ${slides.length} slides, needs exactly 7.`);
    for (const s of slides) {
      label(s.sourceLabel, `Slide ${s.index}`);
      if ((s.bullets || []).length > 5) issues.push(`Slide ${s.index} has ${s.bullets!.length} bullets, max 5 render.`);
      if ((s.gridItems || []).length > 6) issues.push(`Slide ${s.index} has ${s.gridItems!.length} grid items, max 6 render.`);
      if ((s.compareRows || []).length > 4) issues.push(`Slide ${s.index} has ${s.compareRows!.length} compare rows, max 4 render.`);
      const lines = [...(s.headlineWhite || []), ...(s.headlineAccent || [])];
      if (lines.length > 5) issues.push(`Slide ${s.index} has ${lines.length} headline lines, max 5.`);
    }
  }
  return issues;
}

async function contentQA(post: Post): Promise<{ pass: boolean; issues: string[] }> {
  return completeJSON<{ pass: boolean; issues: string[] }>({
    system:
      "You are the final quality gate for IAIMS LinkedIn content. You reject drafts with real problems. You do not nitpick style choices that follow the rules. Respond with valid JSON only.",
    user: `Review this LinkedIn post draft. REJECT only for real problems:
1. Copy that reads AI-generated: template phrasing, hollow filler lines, hype words (${VOICE.bannedTerms.slice(0, 12).join(", ")}, ...), the "not just X, it is Y" reversal.
2. Text that will not fit its card: any sourceLabel over 40 characters, single-image headline lines over 30 characters, subheads over 150 characters.
3. Broken voice rules: em dashes, exclamation marks, hashtag count not exactly 3, comment-bait CTA, caption missing "${VOICE.cta}".
4. Specific claims (statutes, dates, penalty figures) with no matching entry in sources.

Post JSON:
${JSON.stringify(
      {
        format: post.format,
        topic: post.topic,
        hook: post.hook,
        caption: post.caption,
        hashtags: post.hashtags,
        sources: post.sources,
        single: post.single,
        slides: post.slides,
      },
      null,
      1,
    )}

Return {"pass": boolean, "issues": [up to 6 short, specific, actionable reasons]}`,
    maxTokens: 800,
  });
}

async function qaGate(post: Post, regen: (feedback: string) => Promise<Post>): Promise<Post> {
  for (let round = 0; round < 2; round++) {
    const issues: string[] = [
      ...layoutQA(post),
      ...(post.lint?.issues || []).filter((i) => i.level === "error").map((i) => i.message),
    ];
    if (issues.length === 0) {
      try {
        const c = await contentQA(post);
        if (!c.pass && c.issues?.length) issues.push(...c.issues.slice(0, 6));
      } catch {
        // QA reviewer unavailable: deterministic checks already passed.
      }
    }
    if (issues.length === 0) return post;
    try {
      const fixed = await regen(issues.map((i) => `- ${i}`).join("\n"));
      fixed.history = [
        ...post.history,
        {
          at: new Date().toISOString(),
          source: "system",
          note: `Quality gate rejected a draft and regenerated it: ${issues.join(" | ")}`,
        },
      ];
      post = fixed;
    } catch {
      return post; // keep the last draft rather than lose the day
    }
  }
  return post;
}

// ── Weekly run (background-safe) ─────────────────────────────────────────────
// startWeek saves an empty placeholder immediately so it shows in the inbox and
// has an id. runWeek does the slow work and saves after each post, so progress
// is visible and the job is decoupled from the browser. generateWeek runs both
// (used by the cron).
export async function startWeek(opts?: { startDate?: Date }): Promise<Week> {
  const startDate = opts?.startDate || nextMonday();
  const week: Week = {
    id: nanoid(10),
    label: `Week of ${longLabel(startDate)}`,
    startDate: isoDate(startDate),
    status: "generating",
    theme: "",
    source: "auto",
    posts: [],
    createdAt: new Date().toISOString(),
  };
  await saveWeek(week);
  return week;
}

export async function runWeek(weekId: string): Promise<void> {
  const week = await getWeek(weekId);
  if (!week) return;
  const startDate = new Date(week.startDate);
  try {
    const existing = await listWeeks();
    const existingTopics = existing
      .filter((w) => w.id !== weekId)
      .flatMap((w) => w.posts.map((p) => p.topic))
      .slice(0, 60);

    const { sunday, saturday } = lastWeekRange();
    const research = (
      await researchWeb(
        `Find the most important AI governance and AI regulation developments published LAST WEEK, between ${longLabel(
          sunday,
        )} and ${longLabel(
          saturday,
        )} (Sunday to Saturday). Cover EU (AI Act, Omnibus), US federal (FTC, executive actions), US state AI laws, sector rules (healthcare FDA, financial services), and global standards (NIST AI RMF, ISO 42001). For each item give the specific date, what changed, the source URL, and why it matters for compliance evidence. Be precise with statutes and dates. If an older rule has a deadline or enforcement moment landing in or just after this window, include it and say so.`,
      )
    ).summary;

    const specs = await planWeek(startDate, research, existingTopics);
    week.theme = specs.map((s) => s.geography).filter(Boolean).join(" · ");
    await saveWeek(week);

    const instructions = await getInstructions();

    for (const spec of specs) {
      const rules = customRulesText(instructions, spec.type, spec.icps);
      const draftedHooks = week.posts.map((p) => `${p.day}: ${p.hook}`).filter((h) => h.length > 12);
      let post: Post | null = null;
      let lastErr = "";
      for (let attempt = 0; attempt < 3 && !post; attempt++) {
        try {
          post = await generatePost(spec, research, weekId, startDate, rules, draftedHooks);
        } catch (e) {
          lastErr = (e as Error).message;
        }
      }
      // The QA agent inspects the draft and sends it back for regeneration
      // (with its reasons) until it passes or the round limit is hit.
      if (post) {
        post = await qaGate(post, (feedback) =>
          generatePost(spec, research, weekId, startDate, rules, draftedHooks, feedback),
        );
      }
      week.posts.push(
        post ||
          draftToPost(
            { caption: `Draft failed to generate after retries: ${lastErr}. Regenerate this post.` },
            spec,
            weekId,
            startDate,
          ),
      );
      await saveWeek(week); // incremental: posts appear as they finish
    }

    week.status = "in_review";
    await saveWeek(week);
    // Content is ready: the review link goes straight to Jaya on Slack.
    try {
      await notifyReview(week);
    } catch {
      // Slack is best-effort; the Send to Jaya button covers resends.
    }
  } catch (e) {
    week.status = "in_review";
    week.theme = week.theme || `Generation error: ${(e as Error).message}`;
    await saveWeek(week);
  }
}

export async function generateWeek(opts?: { startDate?: Date }): Promise<Week> {
  const week = await startWeek(opts);
  await runWeek(week.id);
  return (await getWeek(week.id)) || week;
}

// ── Revision (Claude applies a reviewer note) ────────────────────────────────
export async function revisePost(post: Post, note: string, by: "jaya" | "waqar"): Promise<Post> {
  const instructions = await getInstructions();
  const customRules = customRulesText(instructions, post.type, post.icps);
  const user = `Revise this ${POST_TYPES[post.type].label} based on the reviewer note. Keep the format (${post.format}) and the same JSON shape. Apply the note precisely, keep everything else intact, and keep all the hard voice rules.

Reviewer note (${by}): ${note}

Current post JSON:
${JSON.stringify(
  {
    topic: post.topic,
    hook: post.hook,
    caption: post.caption,
    hashtags: post.hashtags,
    rationale: post.rationale,
    reshareCommentary: post.reshareCommentary || "",
    sources: post.sources,
    single: post.single,
    slides: post.slides,
  },
  null,
  2,
)}

${rulesBlock(customRules)}${POST_JSON_SHAPE}`;

  // Carousel JSON is large: give it room and retry, a truncated reply is the
  // most common cause of "Expected ',' or '}'" parse failures.
  let draft: PostDraft | null = null;
  let lastErr = "";
  for (let attempt = 0; attempt < 3 && !draft; attempt++) {
    try {
      draft = await completeJSON<PostDraft>({
        system: brandSystemPrompt(),
        user,
        maxTokens: post.format === "carousel" ? 8000 : 4500,
      });
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  if (!draft) throw new Error(`Revision failed after 3 attempts: ${lastErr}`);

  const spec: DaySpec = {
    dayIndex: post.dayIndex,
    day: post.day,
    type: post.type,
    format: post.format,
    reshareBy: post.reshareBy,
    topic: post.topic,
    angle: post.rationale,
    geography: "",
    icps: post.icps,
  };
  const startDate = addDays(new Date(post.date), -post.dayIndex);
  const revised = draftToPost(draft, spec, post.weekId, startDate);
  revised.id = post.id;
  revised.status = "in_review";
  revised.comments = post.comments;
  revised.history = [
    ...post.history,
    { at: new Date().toISOString(), source: by, note, beforeCaption: post.caption },
  ];
  return revised;
}

// ── Create from an upload (screenshot, text, link) ───────────────────────────
function looseJSON<T>(raw: string): T {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fence ? fence[1] : raw).trim();
  try {
    return JSON.parse(body) as T;
  } catch {
    const m = body.match(/[[{][\s\S]*[\]}]/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error("Model did not return valid JSON.");
  }
}

export async function generateFromUpload(input: {
  note?: string;
  imageBase64?: string;
  mediaType?: string;
  format: PostFormat;
}): Promise<Week> {
  const client = getClient();
  const startDate = nextMonday();
  const weekId = nanoid(10);

  const instructions = await getInstructions();
  const customRules = customRulesText(instructions, "founder_moment", [
    "grant_officer",
    "accelerator_university",
  ]);

  const instruction = `Create an on-brand LinkedIn ${input.format}${
    input.format === "carousel" ? " (7 slides)" : ""
  } from the material I am giving you. This is likely a company update such as a partnership, milestone, or announcement, not a regulation news item.
- Keep the IAIMS voice and all hard rules. Celebrate without hype, no exclamation marks, no banned words.
- SENSITIVE INFO: do not include any private personal data (emails, phone numbers, signatures, internal IDs, addresses). If the material contains them, omit them and note what you omitted in "rationale".
- Only include the "sources" array if there is a public source. A private screenshot is not a source.
${input.note ? `\nMy note about it: ${input.note}` : ""}

${rulesBlock(customRules)}${POST_JSON_SHAPE}`;

  const content: unknown[] = [];
  if (input.imageBase64 && input.mediaType === "application/pdf") {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: input.imageBase64 },
    });
  } else if (input.imageBase64 && input.mediaType) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 },
    });
  }
  content.push({ type: "text", text: instruction });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system:
      brandSystemPrompt() +
      "\n\nRespond with valid JSON only. No prose, no markdown fences.",
    messages: [{ role: "user", content: content as never }],
  });
  const draft = looseJSON<PostDraft>(textOf(res.content));

  const spec: DaySpec = {
    dayIndex: 0,
    day: "Ad-hoc",
    type: "founder_moment",
    format: input.format,
    reshareBy: null,
    topic: draft.topic || "Company update",
    angle: input.note || "",
    geography: "",
    icps: ["grant_officer", "accelerator_university"],
  };
  const post = draftToPost(draft, spec, weekId, startDate);

  const week: Week = {
    id: weekId,
    label: `Created from upload · ${longLabel(new Date())}`,
    startDate: isoDate(startDate),
    status: "in_review",
    theme: "Ad-hoc",
    source: "manual",
    posts: [post],
    createdAt: new Date().toISOString(),
  };
  await saveWeek(week);
  return week;
}

// Minimal content-block type for the multimodal call.
type Anthropic_ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

// THE LEARNING LOOP. Every change request is examined: if it implies a durable
// rule (voice, structure, facts policy) rather than a one-off correction, it is
// saved to Instructions as a "learned" rule and applies to all future content.
// Deduped against existing rules; visible and disableable in the Instructions tab.
export async function learnFromFeedback(note: string, post: Post, by: "jaya" | "waqar"): Promise<void> {
  try {
    const existing = await getInstructions();
    const res = await completeJSON<{ durable?: boolean; title?: string; body?: string }>({
      system:
        "You maintain the permanent style guide for a LinkedIn content engine. You decide whether reviewer feedback is a durable rule or a one-off fix. Respond with valid JSON only.",
      user: `${by === "jaya" ? "The founder (final approver)" : "The growth advisor"} left this change request on a ${POST_TYPES[post.type].label} post:
"${note}"

Existing permanent rules (do not duplicate any of these):
${existing.map((i) => `- ${i.title}: ${i.body}`).join("\n") || "(none)"}

If the note implies a DURABLE preference that should shape FUTURE posts (tone, structure, wording habits, claim policy, visual copy), extract it as a short imperative rule. If it is a one-off correction (a typo, this post's specific facts or hook) or already covered above, it is not durable.

Return JSON: { "durable": boolean, "title": string (3 to 6 words), "body": string (1 to 3 short imperative lines) }`,
      maxTokens: 600,
    });
    if (res?.durable && res.body?.trim()) {
      const list = await getInstructions();
      list.unshift({
        id: nanoid(10),
        title: (res.title || "Learned from feedback").slice(0, 80),
        body: res.body.trim(),
        source: "learned",
        enabled: true,
        createdAt: new Date().toISOString(),
      });
      await saveInstructions(list);
    }
  } catch {
    // Learning is best-effort; never block the revision on it.
  }
}

// THE IMPROVEMENT AGENT (the outer loop).
// Loop engineering: the writer is the maker, the QA gate is the checker, and
// this agent tunes the rubric itself. Weekly it audits recent output, feedback
// themes, QA rejections, and lint noise, writes a short report for Waqar, and
// proposes up to 3 durable rules. Proposals land DISABLED in Instructions so a
// human approves the rubric change before it steers generation.
export async function improvementLoop(): Promise<{ report: string; proposed: number }> {
  const weeks = (await listWeeks()).slice(0, 4);
  const instructions = await getInstructions();
  const metrics = await getMetrics();
  const metricFor = (postId: string, date: string) =>
    metrics.find((m) => m.postId === postId) || metrics.find((m) => !m.postId && m.date === date);
  const summary = weeks.map((w) => ({
    label: w.label,
    status: w.status,
    posts: w.posts.map((p) => ({
      day: p.day,
      type: p.type,
      topic: p.topic,
      status: p.status,
      feedback: p.history
        .filter((h) => h.note && h.source !== "system")
        .map((h) => `${h.source}: ${h.note}`.slice(0, 200)),
      qaRejections: p.history.filter((h) => h.source === "system").length,
      lintFlags: (p.lint?.issues || []).map((i) => i.message).slice(0, 4),
      performance: (() => {
        const m = metricFor(p.id, p.date);
        return m?.impressions
          ? {
              impressions: m.impressions,
              reactions: m.reactions,
              comments: m.comments,
              reposts: m.reposts,
            }
          : undefined;
      })(),
    })),
  }));

  const res = await completeJSON<{
    report?: string;
    proposedRules?: { title?: string; body?: string }[];
  }>({
    system:
      "You are Sunnyvale's improvement agent, the outer loop that makes an AI content engine better every week. You are the skeptical checker of the whole system, not a cheerleader. Respond with valid JSON only.",
    user: `Audit the recent output of the IAIMS LinkedIn content engine and propose durable improvements.

Recent weeks (newest first):
${JSON.stringify(summary, null, 1)}

Existing permanent rules (do not duplicate any):
${instructions.map((i) => `- [${i.enabled ? "on" : "off"}] ${i.title}: ${i.body}`).join("\n") || "(none)"}

Look for: feedback themes that keep repeating, QA rejection patterns, recurring lint flags, hook or topic sameness across weeks, ICP or geography imbalance, anything that still reads AI-generated. Where posts carry "performance" (real LinkedIn numbers), weight what actually earned impressions and engagement over theory, and say which post types and hook shapes are winning.

Return JSON:
{"report": string (plain language for the growth advisor: what worked, what keeps going wrong, what to change next. Max 180 words),
 "proposedRules": [up to 3 {"title": string (3 to 6 words), "body": string (1 to 3 imperative lines)} that would prevent the recurring problems]}`,
    maxTokens: 1500,
  });

  const proposals = (res.proposedRules || []).filter((r) => r?.body?.trim()).slice(0, 3);
  if (proposals.length) {
    const list = await getInstructions();
    for (const r of proposals.reverse()) {
      list.unshift({
        id: nanoid(10),
        title: `Proposed: ${(r.title || "improvement").trim()}`.slice(0, 80),
        body: r.body!.trim(),
        source: "learned",
        enabled: false,
        createdAt: new Date().toISOString(),
      });
    }
    await saveInstructions(list);
  }
  return { report: res.report || "No report produced.", proposed: proposals.length };
}

// Turn an uploaded file, a link, or an example post into a concise rule.
export async function extractInstruction(input: {
  kind: "file" | "link" | "example";
  text?: string;
  url?: string;
  imageBase64?: string;
  mediaType?: string;
}): Promise<{ title: string; body: string }> {
  const client = getClient();
  let material = "";
  const content: unknown[] = [];

  if (input.kind === "link" && input.url) {
    try {
      const html = await (await fetch(input.url)).text();
      material = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 8000);
    } catch {
      material = `(could not fetch ${input.url})`;
    }
  } else if (input.kind === "example" && input.text) {
    material = input.text.slice(0, 6000);
  } else if (input.kind === "file") {
    if (input.imageBase64 && input.mediaType?.startsWith("image/")) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 },
      });
    } else if (input.imageBase64 && input.mediaType === "application/pdf") {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: input.imageBase64 },
      });
    } else if (input.text) {
      material = input.text.slice(0, 8000);
    }
  }

  const ask =
    input.kind === "example"
      ? "Study this example post and extract durable STYLE rules our writer should follow to match its tone and structure. Do not copy its facts."
      : "Extract durable content rules (guidance) from this material for our LinkedIn content.";

  content.push({
    type: "text",
    text: `${ask}
${material ? `\nMaterial:\n${material}\n` : ""}
Return JSON: { "title": string (3 to 6 words), "body": string (1 to 5 short imperative lines the writer must follow, no preamble) }.`,
  });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: "You write concise, durable content rules. Respond with valid JSON only.",
    messages: [{ role: "user", content: content as never }],
  });
  const parsed = looseJSON<{ title?: string; body?: string }>(textOf(res.content));
  return { title: (parsed.title || "Custom rule").slice(0, 80), body: parsed.body || "" };
}

// Regenerate a single post in place (for a failed or weak draft), keeping its
// id, comments, and history. Re-researches just this post's topic.
export async function regeneratePost(weekId: string, postId: string): Promise<Post | null> {
  const week = await getWeek(weekId);
  if (!week) return null;
  const existing = week.posts.find((p) => p.id === postId);
  if (!existing) return null;

  const startDate = new Date(week.startDate);
  const spec: DaySpec = {
    dayIndex: existing.dayIndex,
    day: existing.day,
    type: existing.type,
    format: existing.format,
    reshareBy: existing.reshareBy,
    topic: existing.topic,
    angle: existing.rationale || "",
    geography: "",
    icps: existing.icps,
  };

  const { sunday, saturday } = lastWeekRange();
  const research = (
    await researchWeb(
      `Find the latest verified facts for an IAIMS LinkedIn post on this topic, focused on last week (${longLabel(
        sunday,
      )} to ${longLabel(saturday)}): ${existing.topic}. Give specific dates, what changed, and the source URL.`,
    )
  ).summary;

  const instructions = await getInstructions();
  const rules = customRulesText(instructions, spec.type, spec.icps);
  const otherHooks = week.posts
    .filter((p) => p.id !== postId)
    .map((p) => `${p.day}: ${p.hook}`)
    .filter((h) => h.length > 12);

  let post: Post | null = null;
  let lastErr = "";
  for (let attempt = 0; attempt < 3 && !post; attempt++) {
    try {
      post = await generatePost(spec, research, weekId, startDate, rules, otherHooks);
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  if (post) {
    post = await qaGate(post, (feedback) =>
      generatePost(spec, research, weekId, startDate, rules, otherHooks, feedback),
    );
  }
  if (!post) {
    post = draftToPost({ caption: `Regeneration failed: ${lastErr}.` }, spec, weekId, startDate);
  }
  post.id = existing.id;
  post.comments = existing.comments;
  post.history = existing.history;

  const idx = week.posts.findIndex((p) => p.id === postId);
  week.posts[idx] = post;
  if (week.status === "approved") week.status = "in_review";
  await saveWeek(week);
  return post;
}
