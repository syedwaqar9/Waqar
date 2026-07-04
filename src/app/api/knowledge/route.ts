import { NextRequest, NextResponse } from "next/server";
import { getKnowledge } from "@/lib/store";
import { saveKnowledgeEntry } from "@/lib/generate/generate";
import { fetchYouTubeTranscript, isYouTubeUrl } from "@/lib/video";

export const maxDuration = 120;

export async function GET() {
  return NextResponse.json({ entries: await getKnowledge() });
}

// Add to the memory layer: paste text, or give a link (YouTube links pull the
// transcript; pages get their readable text).
export async function POST(req: NextRequest) {
  try {
    const { url, text, title } = await req.json();
    let material = String(text || "").trim();
    let kind: "transcript" | "link" | "note" = material ? "note" : "link";
    let workingTitle = title ? String(title) : undefined;

    if (!material && url) {
      const u = String(url);
      if (isYouTubeUrl(u)) {
        const fetched = await fetchYouTubeTranscript(u);
        if ("error" in fetched) return NextResponse.json({ error: fetched.error }, { status: 422 });
        material = fetched.transcript;
        workingTitle = workingTitle || fetched.title;
        kind = "transcript";
      } else {
        const res = await fetch(u, { headers: { "user-agent": "Mozilla/5.0" } });
        const html = await res.text();
        material = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        kind = "link";
      }
    }
    if (!material || material.length < 120) {
      return NextResponse.json(
        { error: "Nothing readable found. Paste the text directly." },
        { status: 400 },
      );
    }
    const entry = await saveKnowledgeEntry({
      kind,
      title: workingTitle,
      source: url ? String(url) : undefined,
      text: material,
    });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
