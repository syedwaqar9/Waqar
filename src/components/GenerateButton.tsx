"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start generation.");
      // The week starts building in the background; open it to watch progress.
      router.push(`/week/${data.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="row">
      <button className="btn btn-primary" onClick={run} disabled={busy}>
        {busy ? "Starting…" : "Generate next week"}
      </button>
      {err && <span style={{ color: "var(--red)", fontSize: 12 }}>{err}</span>}
    </div>
  );
}
