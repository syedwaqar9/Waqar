"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [format, setFormat] = useState("single");
  const [file, setFile] = useState<File | null>(null);

  async function submit(e: React.FormEvent) {
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

  return (
    <>
      <div className="topbar">
        <h1>Create from upload</h1>
      </div>
      <div className="main-pad" style={{ maxWidth: 680 }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Drop a screenshot, a signed partnership, a milestone, or paste an update. The tool reads it
          and drafts an on-brand LinkedIn post. Private details (emails, phone numbers, signatures)
          are left out automatically.
        </p>
        <form onSubmit={submit} className="kv" style={{ marginTop: 16 }}>
          <div className="block">
            <h3>Upload an image or screenshot (optional)</h3>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && <div className="note">Selected: {file.name}</div>}
          </div>
          <div className="block">
            <h3>Note / what to say (optional if an image is attached)</h3>
            <textarea
              rows={4}
              placeholder="e.g. We just signed a design-partner agreement with a healthcare AI company to pilot our NIST evidence templates."
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
      </div>
    </>
  );
}
