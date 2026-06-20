import Link from "next/link";
import { getWeek } from "@/lib/store";
import { postSVGs } from "@/lib/render/svg";
import PostCard from "@/components/PostCard";
import SendToJaya from "@/components/SendToJaya";
import GeneratingWatcher from "@/components/GeneratingWatcher";
import CopyLink from "@/components/CopyLink";

export const dynamic = "force-dynamic";

export default async function WeekPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const week = await getWeek(id);

  if (!week) {
    return (
      <>
        <div className="topbar">
          <h1>Loading week</h1>
        </div>
        <div className="main-pad">
          <GeneratingWatcher />
          <div className="genbanner">
            <div className="spinner" />
            <div style={{ flex: 1 }}>
              <div className="loader-title">Preparing this week</div>
              <div className="loader-stage">
                This refreshes automatically. If it does not load in a few seconds, go back to the Inbox.
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const items = [...week.posts]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((p) => ({ post: p, svgs: postSVGs(p) }));

  return (
    <>
      <div className="topbar">
        <h1>
          <Link href="/" className="crumb">
            Inbox
          </Link>{" "}
          / {week.label}
        </h1>
        <div className="row">
          <CopyLink />
          <SendToJaya weekId={week.id} />
          <span className={`chip s-${week.status}`}>{week.status.replace("_", " ")}</span>
        </div>
      </div>
      <div className="main-pad">
        {week.status === "generating" && (
          <>
            <GeneratingWatcher />
            <div className="genbanner">
              <div className="spinner" />
              <div style={{ flex: 1 }}>
                <div className="loader-title">Building this week</div>
                <div className="loader-stage">
                  Drafted {week.posts.length} of 5. You can leave this page, it keeps building in the background.
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${Math.max(8, (week.posts.length / 5) * 100)}%` }} />
                </div>
              </div>
            </div>
          </>
        )}
        {week.theme && !week.theme.startsWith("Generation error") && (
          <p className="muted" style={{ marginTop: 0 }}>
            Geography mix: {week.theme}
          </p>
        )}
        {week.theme.startsWith("Generation error") && (
          <p style={{ color: "var(--red)", marginTop: 0 }}>{week.theme}</p>
        )}
        {items.map((it) => (
          <PostCard key={it.post.id} post={it.post} svgs={it.svgs} weekId={week.id} />
        ))}
        {week.status !== "generating" && items.length === 0 && (
          <div className="empty">No posts generated. Try Generate again.</div>
        )}
      </div>
    </>
  );
}
