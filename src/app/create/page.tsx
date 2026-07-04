"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "video">("upload");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Upload mode
  const [note, setNote] = useState("");
  const [format, setFormat] = useState("single");
  const [file, setFile] = useState<File | null>(null);

  // Video mode
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [vNote, setVNote] = useState("");
  const [count, setCount] = useState("4");

  async function submitUpload(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.set("note", note);
      fd.set("format", format);
      if (file) fd.set("file", file);
      const res = await fetch("/api/create", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate.");
      router.push(`/week/${data.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  async function submitVideo(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, transcript, note: vNote, count: Number(count) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start.");
      router.push(`/week/${data.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <h1>Create</h1>
        <div className="row">
          <button className={`btn btn-sm ${tab === "upload" ? "btn-primary" : ""}`} onClick={() => setTab("upload")}>
            From upload
          </button>
          <button className={`btn btn-sm ${tab === "video" ? "btn-primary" : ""}`} onClick={() => setTab("video")}>
            From video or podcast
          </button>
        </div>
      </div>
      <div className="main-pad" style={{ maxWidth: 680 }}>
        {tab === "upload" ? (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Drop a screenshot, a signed partnership, a milestone, or paste an update. The tool reads
              it and drafts an on-brand LinkedIn post. Private details (emails, phone numbers,
              signatures) are left out automatically.
            </p>
            <form onSubmit={submitUpload} className="kv" style={{ marginTop: 16 }}>
              <div className="block">
                <h3>Upload an image or PDF (optional)</h3>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && <div className="note">Selected: {file.name}</div>}
              </div>
              <div className="block">
                <h3>Note / what to say (optional if a file is attached)</h3>
                <textarea
                  rows={4}
                  placeholder="e.g. We just signed a design-partner agreement with a healthcare AI company."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="block">
                <h3>Format</h3>
                <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ width: 220 }}>
                  <option value="single">Single image post</option>
                  <option value="carousel">Carousel (7 slides)</option>
                </select>
              </div>
              <div className="row">
                <button className="btn btn-primary" disabled={busy} type="submit">
                  {busy ? "Reading and drafting…" : "Generate post"}
                </button>
                {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Paste a YouTube link and the transcript is pulled automatically. For Spotify, Apple, or
              anything else, paste the transcript. The tool mines the strongest moments, drafts
              quote-card posts in Jaya&apos;s first-person voice, and saves the whole transcript to
              Knowledge so future weeks can draw on it.
            </p>
            <form onSubmit={submitVideo} className="kv" style={{ marginTop: 16 }}>
              <div className="block">
                <h3>YouTube link</h3>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <div className="note">Works when the video has captions, which podcasts almost always do.</div>
              </div>
              <div className="block">
                <h3>Or paste the transcript</h3>
                <textarea
                  rows={6}
                  placeholder="Paste the full transcript here (YouTube: ...more, then Show transcript, then copy)."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </div>
              <div className="block">
                <h3>Context (optional)</h3>
                <input
                  type="text"
                  placeholder="e.g. The AI Governance Podcast, episode on evidence infrastructure"
                  value={vNote}
                  onChange={(e) => setVNote(e.target.value)}
                />
              </div>
              <div className="block">
                <h3>How many posts</h3>
                <select value={count} onChange={(e) => setCount(e.target.value)} style={{ width: 160 }}>
                  <option value="3">3 posts</option>
                  <option value="4">4 posts</option>
                  <option value="5">5 posts</option>
                </select>
              </div>
              <div className="row">
                <button className="btn btn-primary" disabled={busy || (!url.trim() && !transcript.trim())} type="submit">
                  {busy ? "Reading the podcast…" : "Mine the moments"}
                </button>
                {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
}
