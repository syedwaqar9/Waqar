"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeEntry } from "@/lib/types";

export default function KnowledgeManager({ initial }: { initial: KnowledgeEntry[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, text, title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setUrl("");
      setText("");
      setTitle("");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(entry: KnowledgeEntry) {
    await fetch(`/api/knowledge/${entry.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !entry.enabled }),
    });
    router.refresh();
  }

  async function remove(entry: KnowledgeEntry) {
    await fetch(`/api/knowledge/${entry.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="kv">
      <form className="block" onSubmit={add}>
        <h3>Add knowledge</h3>
        <div className="note" style={{ marginBottom: 8 }}>
          A link (YouTube pulls the transcript, pages get their text) or pasted material: emails,
          documents, notes, anything worth remembering.
        </div>
        <input
          type="text"
          placeholder="https://... (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <textarea
          rows={4}
          placeholder="Or paste the material here"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="row" style={{ marginTop: 8 }}>
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <button className="btn btn-primary btn-sm" disabled={busy || (!url.trim() && !text.trim())} type="submit">
            {busy ? "Reading…" : "Add to knowledge"}
          </button>
          {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
        </div>
      </form>

      {initial.length === 0 ? (
        <div className="empty">
          Nothing remembered yet. Podcast transcripts land here automatically; add links and documents
          above.
        </div>
      ) : (
        <div className="grid">
          {initial.map((e) => (
            <div key={e.id} className="block" style={{ opacity: e.enabled ? 1 : 0.55 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: 600 }}>{e.title}</div>
                <div className="row">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggle(e)}>
                    {e.enabled ? "Disable" : "Enable"}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(e)} style={{ color: "var(--red)" }}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="caption" style={{ marginTop: 6 }}>
                {e.summary}
              </div>
              {e.keyPoints.length > 0 && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--muted)", fontSize: 12.5 }}>
                  {e.keyPoints.slice(0, 4).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              )}
              <div className="tags" style={{ marginTop: 10 }}>
                <span className="chip">{e.kind}</span>
                {e.source && (
                  <a className="chip" href={e.source} target="_blank" rel="noreferrer">
                    source
                  </a>
                )}
                <span className="chip">{e.createdAt.slice(0, 10)}</span>
                {!e.enabled && <span className="chip">disabled</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
