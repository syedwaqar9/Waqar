"use client";

import { useState } from "react";

// Copies the current week's review URL so it can be shared with Jaya directly.
export default function CopyLink() {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button className="btn btn-sm" onClick={copy}>
      {copied ? "Link copied" : "Copy review link"}
    </button>
  );
}
