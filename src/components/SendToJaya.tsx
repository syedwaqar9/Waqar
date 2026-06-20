"use client";

import { useState } from "react";

type State = "idle" | "busy" | "sent" | "noslack" | "err";

export default function SendToJaya({ weekId }: { weekId: string }) {
  const [state, setState] = useState<State>("idle");

  async function send() {
    setState("busy");
    try {
      const res = await fetch(`/api/weeks/${weekId}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setState("err");
        return;
      }
      setState(data.sent ? "sent" : "noslack");
    } catch {
      setState("err");
    }
  }

  const label =
    state === "sent"
      ? "Sent to Jaya ✓"
      : state === "busy"
        ? "Sending…"
        : state === "noslack"
          ? "Add Slack webhook first"
          : state === "err"
            ? "Failed, retry"
            : "Send to Jaya";

  return (
    <button className="btn btn-sm" onClick={send} disabled={state === "busy" || state === "sent"}>
      {label}
    </button>
  );
}
