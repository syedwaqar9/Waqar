// Getting the words out of a video. Claude cannot hear, so everything starts
// with a transcript: YouTube links carry caption tracks we can fetch directly;
// everything else falls back to a pasted transcript.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export interface TranscriptResult {
  title: string;
  transcript: string;
}

export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

export async function fetchYouTubeTranscript(
  url: string,
): Promise<TranscriptResult | { error: string }> {
  const idMatch = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/);
  if (!idMatch) {
    return { error: "Could not read a YouTube video id from that link." };
  }
  let html = "";
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${idMatch[1]}&hl=en`, {
      headers: { "user-agent": UA, "accept-language": "en" },
    });
    html = await res.text();
  } catch {
    return { error: "Could not reach YouTube. Paste the transcript instead." };
  }

  const title = (html.match(/<title>([^<]*)<\/title>/)?.[1] || "YouTube video")
    .replace(/\s*-\s*YouTube\s*$/i, "")
    .trim();

  const capMatch = html.match(/"captionTracks":(\[.*?\])(?=,\s*")/);
  if (!capMatch) {
    return {
      error:
        "This video has no captions we can read. Open the video, use 'Show transcript', copy it, and paste it instead.",
    };
  }

  try {
    const tracks = JSON.parse(capMatch[1]) as {
      baseUrl: string;
      languageCode?: string;
      kind?: string;
    }[];
    // Prefer human English captions, then auto-generated English, then anything.
    const track =
      tracks.find((t) => t.languageCode?.startsWith("en") && t.kind !== "asr") ||
      tracks.find((t) => t.languageCode?.startsWith("en")) ||
      tracks[0];
    if (!track?.baseUrl) throw new Error("no track");

    const capRes = await fetch(`${track.baseUrl}&fmt=json3`, {
      headers: { "user-agent": UA },
    });
    if (!capRes.ok) throw new Error("caption fetch failed");
    const data = (await capRes.json()) as {
      events?: { segs?: { utf8?: string }[] }[];
    };
    const transcript = (data.events || [])
      .flatMap((e) => (e.segs || []).map((s) => s.utf8 || ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (transcript.length < 200) {
      return { error: "The captions were empty. Paste the transcript instead." };
    }
    return { title, transcript };
  } catch {
    return {
      error: "Could not download the captions. Paste the transcript instead.",
    };
  }
}

// Best-effort page title for non-YouTube links.
export async function fetchPageTitle(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    const html = await res.text();
    return (html.match(/<title>([^<]*)<\/title>/)?.[1] || url).trim().slice(0, 120);
  } catch {
    return url.slice(0, 120);
  }
}
