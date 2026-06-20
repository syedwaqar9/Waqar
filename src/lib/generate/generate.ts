import { nanoid } from "nanoid";
import {
  WEEK_RHYTHM,
  POST_TYPES,
  ICPS,
  DESIGN,
  VOICE,
  ORG,
} from "@/brand/brandBrain";
import { SEED_FACTS } from "@/brand/facts";
import { completeJSON, getClient, textOf, MODEL } from "@/lib/anthropic";
import { researchWeb } from "@/lib/anthropic";
import { brandSystemPrompt, POST_JSON_SHAPE } from "@/lib/generate/prompts";
import { lintPost } from "@/lib/linter";
import { addDays, isoDate, longLabel, nextMonday, lastWeekRange } from "@/lib/dates";
import { getWeek, listWeeks, saveWeek } from "@/lib/store";
import type {
  ICP,
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

  const planned = await completeJSON<
    { dayIndex: number; topic: string; angle: string; geography: string; icps: string[] }[]
  >({
    system: brandSystemPrompt(),
    user,
    maxTokens: 2000,
  });

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
  let arr = Array.isArray(tags) ? tags.map((t) => String(t).trim()) : [];
  arr = arr.map((t) => (t.startsWith("#") ? t : `#${t.replace(/\s+/g, "")}`));
  arr = arr.filter(Boolean).slice(0, 3);
  while (arr.length < 3) arr.push("#AIGovernance");
  return arr;
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
): Promise<Post> {
  const reshareNote = spec.reshareBy
    ? `This is a Jaya reshare. Also write "reshareCommentary": a short first-person line in Jaya Kandaswamy's voice (${ORG.founderTitle}), honest and specific, using "${VOICE.hedges.observation}" for any observational claim.`
    : `Not a reshare. Leave reshareCommentary empty.`;

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

This week's verified research (cite from here and from the verified facts only):
${research}

Verified facts you may cite:
${activeFactsText()}

Never cite:
${blockedFactsText()}

${POST_JSON_SHAPE}`;

  const draft = await completeJSON<PostDraft>({
    system: brandSystemPrompt(),
    user,
    maxTokens: 4000,
  });
  return draftToPost(draft, spec, weekId, startDate);
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

    for (const spec of specs) {
      let post: Post;
      try {
        post = await generatePost(spec, research, weekId, startDate);
      } catch (e) {
        post = draftToPost(
          { caption: `Draft failed to generate: ${(e as Error).message}. Regenerate this post.` },
          spec,
          weekId,
          startDate,
        );
      }
      week.posts.push(post);
      await saveWeek(week); // incremental: posts appear as they finish
    }

    week.status = "in_review";
    await saveWeek(week);
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

${POST_JSON_SHAPE}`;

  const draft = await completeJSON<PostDraft>({
    system: brandSystemPrompt(),
    user,
    maxTokens: 4000,
  });

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

  const instruction = `Create an on-brand LinkedIn ${input.format}${
    input.format === "carousel" ? " (7 slides)" : ""
  } from the material I am giving you. This is likely a company update such as a partnership, milestone, or announcement, not a regulation news item.
- Keep the IAIMS voice and all hard rules. Celebrate without hype, no exclamation marks, no banned words.
- SENSITIVE INFO: do not include any private personal data (emails, phone numbers, signatures, internal IDs, addresses). If the material contains them, omit them and note what you omitted in "rationale".
- Only include the "sources" array if there is a public source. A private screenshot is not a source.
${input.note ? `\nMy note about it: ${input.note}` : ""}

${POST_JSON_SHAPE}`;

  const content: Anthropic_ContentBlock[] = [];
  if (input.imageBase64 && input.mediaType) {
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
