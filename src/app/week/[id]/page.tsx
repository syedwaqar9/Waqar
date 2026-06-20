import Link from "next/link";
import { getWeek } from "@/lib/store";
import { postSVGs } from "@/lib/render/svg";
import PostCard from "@/components/PostCard";
import SendToJaya from "@/components/SendToJaya";

export const dynamic = "force-dynamic";

export default async function WeekPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const week = await getWeek(id);

  if (!week) {
    return (
      <>
        <div className="topbar">
          <h1>Not found</h1>
        </div>
        <div className="main-pad">This week does not exist.</div>
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
          <SendToJaya weekId={week.id} />
          <span className={`chip s-${week.status}`}>{week.status.replace("_", " ")}</span>
        </div>
      </div>
      <div className="main-pad">
        {week.theme && (
          <p className="muted" style={{ marginTop: 0 }}>
            Geography mix: {week.theme}
          </p>
        )}
        {items.map((it) => (
          <PostCard key={it.post.id} post={it.post} svgs={it.svgs} weekId={week.id} />
        ))}
      </div>
    </>
  );
}
