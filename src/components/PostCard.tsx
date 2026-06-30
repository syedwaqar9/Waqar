"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  regulation_alert: "Regulation Alert",
  framework_translation: "Framework Translation",
  evidence_explainer: "Evidence Explainer",
  founder_moment: "Founder Moment",
  sector_focus: "Sector Focus",
};

const ICP_LABEL: Record<string, string> = {
  compliance_pro: "Compliance Pro",
  startup_cto: "Startup CTO",
  grant_officer: "Grant Officer",
  accelerator_university: "Accelerator / University",
};

export default function PostCard({
  post,
  svgs,
  weekId,
}: {
  post: Post;
  svgs: string[];
  weekId: string;
}) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showRevise, setShowRevise] = useState(false);
  const [note, setNote] = useState("");
  const [by, setBy] = useState<"jaya" | "waqar">("jaya");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  const errors = (post.lint?.issues || []).filter((i) => i.level === "error");
  const warns = (post.lint?.issues || []).filter((i) => i.level === "warn");
  const altHooks = (post.hookOptions || []).filter((h) => h && h !== post.hook);

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }

  async function approve() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/posts/${post.id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weekId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/posts/${post.id}/regenerate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weekId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doRevise(text: string, author: "jaya" | "waqar" = by) {
    if (!text.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/posts/${post.id}/revise`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weekId, note: text, by: author }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setNote("");
      setShowRevise(false);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="post">
      <div className="post-head">
        <span className="day">{post.day}</span>
        <span className="type">{TYPE_LABEL[post.type] || post.type}</span>
        <span className="chip">{post.format}</span>
        {post.reshareBy && <span className="chip reshare">↗ Jaya reshare</span>}
        {post.icps.map((i) => (
          <span key={i} className="chip icp">
            {ICP_LABEL[i] || i}
          </span>
        ))}
        <span className="spacer" />
        <span className={`chip s-${post.status}`}>{post.status.replace("_", " ")}</span>
      </div>

      <div className="post-body">
        <div className="asset-wrap">
          {svgs.length > 0 ? (
            <>
              <div className="asset" dangerouslySetInnerHTML={{ __html: svgs[slide] }} />
              <div className="asset-nav">
                {svgs.length > 1 ? (
                  <div className="row">
                    <button className="btn btn-sm" onClick={() => setSlide((s) => Math.max(0, s - 1))} disabled={slide === 0}>
                      ‹
                    </button>
                    <span className="count">
                      {slide + 1} / {svgs.length}
                    </span>
                    <button
                      className="btn btn-sm"
                      onClick={() => setSlide((s) => Math.min(svgs.length - 1, s + 1))}
                      disabled={slide === svgs.length - 1}
                    >
                      ›
                    </button>
                  </div>
                ) : (
                  <span className="count">Single image</span>
                )}
                <a className="btn btn-sm" href={`/api/render?weekId=${weekId}&postId=${post.id}&slide=${slide}`}>
                  Download PNG
                </a>
              </div>
            </>
          ) : (
            <div className="empty">No visual generated.</div>
          )}
        </div>

        <div className="col">
          {(post.hook || altHooks.length > 0) && (
            <div className="hookbox">
              <h4>Hook</h4>
              <div className="hook-cur">{post.hook}</div>
              {altHooks.length > 0 && (
                <div className="hook-alts">
                  <div className="note">Alternates, click to rebuild the post around it:</div>
                  {altHooks.map((h, i) => (
                    <button
                      key={i}
                      className="btn btn-sm hook-alt"
                      disabled={busy}
                      onClick={() =>
                        doRevise(
                          `Rewrite this post so it opens with this exact hook, and make the visual headline match it: "${h}". Keep the facts, sources, and format the same.`,
                          "waqar",
                        )
                      }
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="row" style={{ justifyContent: "space-between" }}>
            <h4>LinkedIn caption</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => copy(post.caption, "cap")}>
              {copied === "cap" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="caption">{post.caption}</div>
          <div className="tags">
            {post.hashtags.map((t) => (
              <span key={t} className="t">
                {t}
              </span>
            ))}
          </div>

          {post.reshareCommentary ? (
            <div className="reshare">
              <div className="lbl">Jaya reshare commentary</div>
              <div className="q">{post.reshareCommentary}</div>
            </div>
          ) : null}

          {post.firstComment ? (
            <div className="commentbox">
              <div className="lbl">First comment, post within the first hour</div>
              <div className="fc">{post.firstComment}</div>
              <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => copy(post.firstComment!, "fc")}>
                {copied === "fc" ? "Copied" : "Copy"}
              </button>
            </div>
          ) : null}

          {post.rationale ? <div className="rationale">Why this post: {post.rationale}</div> : null}

          {post.sources.length > 0 && (
            <ul className="sources">
              {post.sources.map((s, i) => (
                <li key={i}>
                  {s.claim}{" "}
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.publisher}
                  </a>{" "}
                  · verified {s.verifiedAt}
                </li>
              ))}
            </ul>
          )}

          <div className="lint">
            {errors.length === 0 && warns.length === 0 && <span className="ok">✓ Passed all checks</span>}
            {errors.map((i, k) => (
              <span key={`e${k}`} className="err">
                ✕ {i.message}
              </span>
            ))}
            {warns.map((i, k) => (
              <span key={`w${k}`} className="warn">
                ! {i.message}
              </span>
            ))}
          </div>

          <div className="actions">
            <button className="btn btn-primary btn-sm" onClick={approve} disabled={busy}>
              {post.status === "approved" ? "Approved ✓" : "Approve"}
            </button>
            <button className="btn btn-sm" onClick={() => setShowRevise((v) => !v)} disabled={busy}>
              Request changes
            </button>
            <button className="btn btn-ghost btn-sm" onClick={regenerate} disabled={busy}>
              Regenerate
            </button>
            {busy && <span className="note">Working…</span>}
            {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
          </div>

          {showRevise && (
            <div className="revise-box">
              <textarea
                rows={3}
                placeholder="Describe the change in plain language. Claude will revise this post in-voice."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="row">
                <select value={by} onChange={(e) => setBy(e.target.value as "jaya" | "waqar")} style={{ width: 140 }}>
                  <option value="jaya">As Jaya</option>
                  <option value="waqar">As Waqar</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={() => doRevise(note)} disabled={busy || !note.trim()}>
                  {busy ? "Revising…" : "Submit and revise"}
                </button>
              </div>
            </div>
          )}

          {post.history.filter((h) => h.note).length > 0 && (
            <div className="commentbox" style={{ marginTop: 14 }}>
              <div className="lbl">Review notes</div>
              {post.history
                .filter((h) => h.note)
                .map((h, i) => (
                  <div key={i} className="fc" style={{ marginTop: 6 }}>
                    <strong style={{ textTransform: "capitalize" }}>{h.source}</strong>: {h.note}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
