import Link from "next/link";
import { listWeeks } from "@/lib/store";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  regulation_alert: "Regulation Alert",
  framework_translation: "Framework Translation",
  evidence_explainer: "Evidence Explainer",
  founder_moment: "Founder Moment",
  sector_focus: "Sector Focus",
};

function tokens(s: string): Set<string> {
  return new Set(
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}
function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter((x) => b.has(x)).length;
  const uni = new Set([...a, ...b]).size;
  return uni ? inter / uni : 0;
}

export default async function LibraryPage() {
  const weeks = await listWeeks();
  const items = weeks.flatMap((w) => w.posts.map((post) => ({ post, week: w })));
  const sigs = items.map((it) => tokens(`${it.post.topic} ${it.post.hook}`));

  // For each post, find the closest other post. Flag near-duplicates.
  const dup = items.map((_, i) => {
    let best = -1;
    let bestScore = 0;
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const s = jaccard(sigs[i], sigs[j]);
      if (s > bestScore) {
        bestScore = s;
        best = j;
      }
    }
    return bestScore >= 0.5 ? items[best] : null;
  });

  const dupCount = dup.filter(Boolean).length;

  return (
    <>
      <div className="topbar">
        <h1>Library</h1>
        <span className="chip">
          {items.length} posts · {dupCount} flagged
        </span>
      </div>
      <div className="main-pad">
        <p className="muted" style={{ marginTop: 0 }}>
          Every post the tool has made. A red flag means the topic and hook look close to another
          post, so you can avoid repeating yourself.
        </p>
        {items.length === 0 ? (
          <div className="empty">No posts yet.</div>
        ) : (
          <div className="grid">
            {items.map((it, i) => (
              <div key={it.post.id} className="block">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.post.topic || "Untitled"}</div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                      {TYPE_LABEL[it.post.type] || it.post.type} · {it.post.day} ·{" "}
                      <Link href={`/week/${it.week.id}`} style={{ color: "var(--blue)" }}>
                        {it.week.label}
                      </Link>
                    </div>
                  </div>
                  {dup[i] && <span className="chip" style={{ color: "#fafafa", borderColor: "#71717a", fontWeight: 700 }}>possible duplicate</span>}
                </div>
                {it.post.hook && (
                  <div className="caption" style={{ marginTop: 8 }}>
                    {it.post.hook}
                  </div>
                )}
                {dup[i] && (
                  <div className="note" style={{ marginTop: 8 }}>
                    Similar to: {dup[i]!.post.topic} ({dup[i]!.week.label})
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
