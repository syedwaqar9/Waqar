"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STAGES = [
  "Researching last week's regulation news",
  "Planning the week across all four ICPs",
  "Drafting captions and carousels",
  "Rendering the 1080 by 1080 assets",
  "Running the guardrail checks",
];

export default function GenerateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!busy) return;
    setProgress(4);
    setStage(0);
    const p = setInterval(() => {
      setProgress((v) => (v < 92 ? v + Math.max(0.4, (92 - v) / 45) : v));
    }, 700);
    const s = setInterval(() => setStage((v) => (v + 1) % STAGES.length), 6000);
    return () => {
      clearInterval(p);
      clearInterval(s);
    };
  }, [busy]);

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setProgress(100);
      router.push(`/week/${data.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={run} disabled={busy}>
        {busy ? "Working…" : "Generate next week"}
      </button>
      {err && <span style={{ color: "var(--red)", fontSize: 12, marginLeft: 8 }}>{err}</span>}
      {busy && (
        <div className="overlay">
          <div className="loader-card">
            <div className="spinner" />
            <div className="loader-title">Building next week</div>
            <div className="loader-stage">{STAGES[stage]}</div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="loader-note">
              This takes a minute or two. Researching real sources and rendering every slide.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
