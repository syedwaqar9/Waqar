import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart.",
    );
  }
  return new Anthropic({ apiKey });
}

type ContentBlock = { type: string; text?: string; [k: string]: unknown };

export function textOf(content: unknown[]): string {
  return (content as ContentBlock[])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim();
}

function stripFences(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : s).trim();
}

// Ask the model for strict JSON and parse it into T.
export async function completeJSON<T>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const client = getClient();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    system:
      opts.system +
      "\n\nRespond with valid JSON only. No prose, no markdown fences, no commentary.",
    messages: [{ role: "user", content: opts.user }],
  });
  const raw = textOf(res.content);
  try {
    return JSON.parse(stripFences(raw)) as T;
  } catch {
    // Last resort: grab the outermost JSON object or array.
    const match = raw.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Model did not return valid JSON.");
  }
}

export interface ResearchResult {
  summary: string;
  sources: { title: string; url: string }[];
}

// Web-search research. Falls back to model knowledge if the tool is unavailable,
// flagging that sources should be verified.
export async function researchWeb(prompt: string): Promise<ResearchResult> {
  const client = getClient();
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      tools: [
        // Anthropic server-side web search tool.
        { type: "web_search_20250305", name: "web_search", max_uses: 6 } as never,
      ],
      messages: [{ role: "user", content: prompt }],
    });
    const blocks = res.content as unknown as ContentBlock[];
    const summary = textOf(blocks);
    const sources: { title: string; url: string }[] = [];
    for (const b of blocks) {
      // Citations attach to text blocks as `citations` with urls.
      const citations = (b as { citations?: { url?: string; title?: string }[] })
        .citations;
      if (Array.isArray(citations)) {
        for (const c of citations) {
          if (c.url) sources.push({ url: c.url, title: c.title || c.url });
        }
      }
      // Some responses include web_search_tool_result blocks.
      if (b.type === "web_search_tool_result") {
        const content = (b as { content?: { url?: string; title?: string }[] }).content;
        if (Array.isArray(content)) {
          for (const r of content) {
            if (r.url) sources.push({ url: r.url, title: r.title || r.url });
          }
        }
      }
    }
    // De-dup sources by url.
    const seen = new Set<string>();
    const deduped = sources.filter((s) =>
      seen.has(s.url) ? false : (seen.add(s.url), true),
    );
    return { summary, sources: deduped };
  } catch {
    // Tool unavailable on this key/model. Fall back to plain completion.
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content:
            prompt +
            "\n\n(Web search is unavailable. Use only well-established facts and mark anything uncertain as needing verification.)",
        },
      ],
    });
    return { summary: textOf(res.content), sources: [] };
  }
}
