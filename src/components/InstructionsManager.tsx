"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Instruction } from "@/lib/types";

const TYPES: [string, string][] = [
  ["", "All post types"],
  ["regulation_alert", "Regulation Alert"],
  ["framework_translation", "Framework Translation"],
  ["evidence_explainer", "Evidence Explainer"],
  ["founder_moment", "Founder Moment"],
  ["sector_focus", "Sector Focus"],
];
const ICPS: [string, string][] = [
  ["", "All ICPs"],
  ["compliance_pro", "Compliance Pro"],
  ["startup_cto", "Startup CTO"],
  ["grant_officer", "Grant Officer"],
  ["accelerator_university", "Accelerator / University"],
];
const label = (pairs: [string, string][], v?: string) => pairs.find((p) => p[0] === (v || ""))?.[1];

export default function InstructionsManager({ initial }: { initial: Instruction[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // typed rule
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState("");
  const [icp, setIcp] = useState("");

  // learn-from
  const [kind, setKind] = useState<"file" | "link" | "example">("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lType, setLType] = useState("");
  const [lIcp, setLIcp] = useState("");

  async function addTyped(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/instructions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, body, postType, icp }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setTitle("");
      setBody("");
      setPostType("");
      setIcp("");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addLearned(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("url", url);
      fd.set("text", text);
      fd.set("postType", lType);
      fd.set("icp", lIcp);
      if (file) fd.set("file", file);
      const res = await fetch("/api/instructions/extract", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setUrl("");
      setText("");
      setFile(null);
      setLType("");
      setLIcp("");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(i: Instruction) {
    await fetch(`/api/instructions/${i.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !i.enabled }),
    });
    router.refresh();
  }

  async function remove(i: Instruction) {
    await fetch(`/api/instructions/${i.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="kv">
      <form className="block" onSubmit={addTyped}>
        <h3>Add a rule</h3>
        <input
          type="text"
          placeholder="Short label (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <textarea
          rows={3}
          placeholder="The rule, in plain language. e.g. Always mention that the pilot launches this quarter. Never use the word framework as a verb."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="row" style={{ marginTop: 8 }}>
          <select value={postType} onChange={(e) => setPostType(e.target.value)} style={{ width: 220 }}>
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select value={icp} onChange={(e) => setIcp(e.target.value)} style={{ width: 220 }}>
            {ICPS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" disabled={busy || !body.trim()} type="submit">
            Add rule
          </button>
        </div>
      </form>

      <form className="block" onSubmit={addLearned}>
        <h3>Learn from a file, link, or example</h3>
        <div className="row" style={{ marginBottom: 10 }}>
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} style={{ width: 180 }}>
            <option value="link">From a link</option>
            <option value="file">From a file</option>
            <option value="example">From an example post</option>
          </select>
          <span className="muted" style={{ fontSize: 12 }}>
            The tool reads it and turns it into a rule you can edit.
          </span>
        </div>
        {kind === "link" && (
          <input type="text" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        )}
        {kind === "file" && (
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        )}
        {kind === "example" && (
          <textarea
            rows={4}
            placeholder="Paste a post whose tone and structure you want to match."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}
        <div className="row" style={{ marginTop: 8 }}>
          <select value={lType} onChange={(e) => setLType(e.target.value)} style={{ width: 220 }}>
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select value={lIcp} onChange={(e) => setLIcp(e.target.value)} style={{ width: 220 }}>
            {ICPS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" disabled={busy} type="submit">
            {busy ? "Reading…" : "Read and add"}
          </button>
        </div>
      </form>

      {err && <div style={{ color: "var(--red)", fontSize: 13 }}>{err}</div>}

      <div>
        <h3 style={{ fontSize: 13, margin: "4px 0 10px" }}>Active rules</h3>
        {initial.length === 0 ? (
          <div className="empty">No rules yet. Anything you add here shapes every future post.</div>
        ) : (
          <div className="grid">
            {initial.map((i) => (
              <div key={i.id} className="block" style={{ opacity: i.enabled ? 1 : 0.55 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 600 }}>{i.title}</div>
                  <div className="row">
                    <button className="btn btn-ghost btn-sm" onClick={() => toggle(i)}>
                      {i.enabled ? "Disable" : "Enable"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(i)} style={{ color: "var(--red)" }}>
                      Delete
                    </button>
                  </div>
                </div>
                <div className="caption" style={{ marginTop: 6 }}>
                  {i.body}
                </div>
                <div className="tags" style={{ marginTop: 10 }}>
                  <span className="chip">{i.source}</span>
                  <span className="chip">{label(TYPES, i.postType)}</span>
                  <span className="chip">{label(ICPS, i.icp)}</span>
                  {!i.enabled && <span className="chip">disabled</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
