import { after, NextRequest, NextResponse } from "next/server";
import { runVideoIngest, startVideoWeek } from "@/lib/generate/generate";
import { fetchYouTubeTranscript, isYouTubeUrl } from "@/lib/video";

export const maxDuration = 300;

// Turn a podcast/video into quote-card posts. Transcript resolution happens
// synchronously so caption problems surface immediately with a paste fallback;
// the generation itself runs in the background.
export async function POST(req: NextRequest) {
  try {
    const { url, transcript, note, count } = await req.json();
    const n = Math.min(5, Math.max(3, Number(count) || 4));

    let text = String(transcript || "").trim();
    let title = "Podcast";
    if (!text && url && isYouTubeUrl(String(url))) {
      const fetched = await fetchYouTubeTranscript(String(url));
      if ("error" in fetched) {
        return NextResponse.json({ error: fetched.error }, { status: 422 });
      }
      text = fetched.transcript;
      title = fetched.title;
    }
    if (!text) {
      return NextResponse.json(
        { error: "Paste the transcript, or use a YouTube link that has captions." },
        { status: 400 },
      );
    }
    if (text.length < 400) {
      return NextResponse.json(
        { error: "That transcript looks too short to mine for moments." },
        { status: 400 },
      );
    }
    // A pasted transcript with a non-YouTube link still gets a sensible title.
    if (title === "Podcast" && note) title = String(note).slice(0, 60);

    const week = await startVideoWeek(title, n);
    after(async () => {
      try {
        await runVideoIngest(week.id, {
          title,
          transcript: text,
          url: url ? String(url) : undefined,
          note: note ? String(note) : undefined,
          count: n,
        });
      } catch {
        // runVideoIngest records failures on the week itself
      }
    });
    return NextResponse.json({ id: week.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
