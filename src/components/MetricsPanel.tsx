"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PostOption {
  id: string;
  label: string;
}

// Parse a pasted LinkedIn analytics CSV. Forgiving: detects the delimiter and
// maps any recognizable columns; unknown columns are ignored.
function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const delim = [",", "\t", ";"].sort(
    (a, b) => lines[0].split(b).length - lines[0].split(a).length,
  )[0];
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
  const col = (...names: string[]) =>
    headers.findIndex((h) => names.some((n) => h.includes(n)));
  const idx = {
    date: col("date", "created"),
    label: col("url", "link", "post title", "title", "update"),
    impressions: col("impression", "views"),
    reactions: col("reaction", "like"),
    comments: col("comment"),
    reposts: col("repost", "share"),
    followers: col("follower"),
    profileViews: col("profile view"),
  };
  return lines.slice(1).map((line) => {
    const cells = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
    const pick = (i: number) => (i >= 0 ? cells[i] : undefined);
    // Normalize common date formats to ISO day.
    let date = pick(idx.date);
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) date = d.toISOString().slice(0, 10);
    }
    return {
      date,
      label: pick(idx.label) || cells[0],
      impressions: pick(idx.impressions),
      reactions: pick(idx.reactions),
      comments: pick(idx.comments),
      reposts: pick(idx.reposts),
      followers: pick(idx.followers),
      profileViews: pick(idx.profileViews),
    };
  });
}

export default function MetricsPanel({ posts }: { posts: PostOption[] }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  // Manual entry
  const [postId, setPostId] = useState(posts[0]?.id || "");
  const [imp, setImp] = useState("");
  const [rea, setRea] = useState("");
  const [com, setCom] = useState("");
  const [rep, setRep] = useState("");

  async function send(rows: unknown[]) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setMsg(`Imported ${data.imported} row${data.imported > 1 ? "s" : ""}.`);
      setCsv("");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kv" style={{ marginBottom: 18 }}>
      <div className="block">
        <h3>Import LinkedIn CSV</h3>
        <div className="note" style={{ marginBottom: 8 }}>
          LinkedIn analytics → export → open the file → copy everything → paste here. Columns are
          detected automatically (date, impressions, reactions, comments, reposts).
        </div>
        <textarea
          rows={4}
          placeholder="Paste the CSV content here"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="btn btn-primary btn-sm"
            disabled={busy || !csv.trim()}
            onClick={() => {
              const rows = parseCSV(csv);
              if (!rows.length) setMsg("Could not read any rows from that paste.");
              else send(rows);
            }}
          >
            {busy ? "Importing…" : "Import"}
          </button>
          {msg && <span className="note">{msg}</span>}
        </div>
      </div>

      {posts.length > 0 && (
        <div className="block">
          <h3>Or enter one post by hand</h3>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <select value={postId} onChange={(e) => setPostId(e.target.value)} style={{ maxWidth: 340 }}>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <input type="text" placeholder="Impressions" value={imp} onChange={(e) => setImp(e.target.value)} style={{ width: 110 }} />
            <input type="text" placeholder="Reactions" value={rea} onChange={(e) => setRea(e.target.value)} style={{ width: 100 }} />
            <input type="text" placeholder="Comments" value={com} onChange={(e) => setCom(e.target.value)} style={{ width: 100 }} />
            <input type="text" placeholder="Reposts" value={rep} onChange={(e) => setRep(e.target.value)} style={{ width: 90 }} />
            <button
              className="btn btn-sm"
              disabled={busy || !postId}
              onClick={() => send([{ postId, impressions: imp, reactions: rea, comments: com, reposts: rep }])}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
