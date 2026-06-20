import { getInstructions } from "@/lib/store";
import InstructionsManager from "@/components/InstructionsManager";

export const dynamic = "force-dynamic";

export default async function InstructionsPage() {
  const instructions = await getInstructions();
  return (
    <>
      <div className="topbar">
        <h1>Instructions</h1>
        <span className="chip">{instructions.length} rules</span>
      </div>
      <div className="main-pad" style={{ maxWidth: 860 }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Rules here apply to every post the tool makes. Type a rule, upload a file, paste a link, or
          give an example post. You can optionally limit a rule to one post type or ICP.
        </p>
        <InstructionsManager initial={instructions} />
      </div>
    </>
  );
}
