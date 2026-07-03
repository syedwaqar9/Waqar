"use client";

import { useState } from "react";

// One collapsed section for everything before the current week.
export default function PastWeeks({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 26 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <h3
          style={{
            fontSize: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "var(--muted-2)",
            margin: 0,
          }}
        >
          Past weeks · {count}
        </h3>
        <button className="btn btn-sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide past weeks" : "View past weeks"}
        </button>
      </div>
      {open && <div className="grid">{children}</div>}
    </div>
  );
}
