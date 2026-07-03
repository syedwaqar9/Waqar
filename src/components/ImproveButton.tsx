"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImproveButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState("");
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    setReport("");
    try {
      const res = await fetch("/api/improve", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setReport(
        `${data.report}${data.proposed ? `\n\n${data.proposed} proposed rule(s) added below, disabled until you enable them.` : "\n\nNo new rules proposed."}`,
      );
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="block">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h3 style={{ margin: 0 }}>Improvement loop</h3>
          <div className="note">
            Audits recent weeks (feedback themes, QA rejections, repeated flags) and proposes new
            rules. Runs every Sunday automatically; run it now if you want.
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={busy}>
          {busy ? "Auditing…" : "Run now"}
        </button>
      </div>
      {err && <div style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>{err}</div>}
      {report && (
        <div className="caption" style={{ marginTop: 12, whiteSpace: "pre-line" }}>
          {report}
        </div>
      )}
    </div>
  );
}
