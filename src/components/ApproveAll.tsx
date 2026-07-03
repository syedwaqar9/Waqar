"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApproveAll({ weekId }: { weekId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await fetch(`/api/weeks/${weekId}/approve-all`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn btn-primary btn-sm" onClick={run} disabled={busy}>
      {busy ? "Approving…" : "Approve all"}
    </button>
  );
}
