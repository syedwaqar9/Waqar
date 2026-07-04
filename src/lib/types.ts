// Core domain types shared across generation, rendering, linting, and the UI.

export type PostType =
  | "regulation_alert"
  | "framework_translation"
  | "evidence_explainer"
  | "founder_moment"
  | "sector_focus";

export type PostFormat = "single" | "carousel";

export type ICP =
  | "compliance_pro"
  | "startup_cto"
  | "grant_officer"
  | "accelerator_university";

export type PostStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "scheduled"
  | "posted";

export type SlideTheme = "dark" | "light";
export type SlideLayout =
  | "hook"
  | "statement"
  | "grid"
  | "compare"
  | "list"
  | "takeaway";

export interface Source {
  claim: string;
  url: string;
  publisher: string;
  verifiedAt: string; // ISO date
}

export interface GridItem {
  label: string;
  caption?: string;
}

export interface CompareRow {
  left: string;
  right: string;
}

export interface Slide {
  index: number; // 1-based
  theme: SlideTheme;
  layout: SlideLayout;
  eyebrow?: string;
  headlineWhite?: string[]; // neutral/factual lines
  headlineAccent?: string[]; // the tension/key line
  subhead?: string;
  bullets?: string[];
  gridItems?: GridItem[];
  compareTitleLeft?: string;
  compareTitleRight?: string;
  compareRows?: CompareRow[];
  cta?: string;
  sourceLabel?: string;
}

export interface SingleVisual {
  theme: SlideTheme;
  eyebrow: string;
  headlineWhite: string[];
  headlineAccent: string[];
  subhead?: string;
  cta?: string;
  sourceLabel?: string;
}

export interface LintIssue {
  rule: string;
  level: "error" | "warn";
  message: string;
}

export interface LintResult {
  ok: boolean;
  issues: LintIssue[];
}

export interface Comment {
  id: string;
  author: "jaya" | "waqar";
  body: string;
  at: string;
  resolved: boolean;
}

export interface Revision {
  at: string;
  source: "system" | "jaya" | "waqar";
  note?: string;
  beforeCaption?: string;
}

export interface Post {
  id: string;
  weekId: string;
  dayIndex: number; // 0 = Mon .. 4 = Fri
  day: string;
  date: string; // ISO
  type: PostType;
  format: PostFormat;
  icps: ICP[];
  reshareBy: "jaya" | null;
  status: PostStatus;
  topic: string;
  hook: string;
  hookOptions?: string[]; // behavioral-science alternates
  firstComment?: string; // pre-drafted comment for the first hour
  caption: string;
  hashtags: string[];
  cta: string;
  rationale: string; // why this post, for this ICP
  reshareCommentary?: string; // Jaya's first-person line for reshare posts
  sources: Source[];
  single?: SingleVisual;
  slides?: Slide[];
  lint?: LintResult;
  history: Revision[];
  comments: Comment[];
}

export type WeekStatus =
  | "generating"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "posted";

export interface Week {
  id: string;
  label: string; // "Week of June 22, 2026"
  startDate: string; // ISO Monday
  status: WeekStatus;
  theme: string;
  source: "auto" | "manual";
  posts: Post[];
  createdAt: string;
}

// Verified regulatory fact in the ledger.
export interface Fact {
  id: string;
  topic: string;
  jurisdiction: string;
  claim: string;
  detail: string;
  sourceUrl: string;
  publisher: string;
  verifiedAt: string; // ISO date
  status: "active" | "blocked" | "superseded";
  doNotCite?: string; // explicit guard, e.g. stale Colorado date
  supersededBy?: string;
}

// Real LinkedIn performance for one post, imported from CSV or entered by hand.
export interface PostMetric {
  postId?: string; // matched to a Sunnyvale post when known
  date?: string; // ISO day the post went live (join key for CSV rows)
  label?: string; // free-text identifier from the CSV (url or title)
  impressions?: number;
  reactions?: number;
  comments?: number;
  reposts?: number;
  followers?: number; // account-level snapshot, optional
  profileViews?: number;
  updatedAt: string;
}

// A custom rule the generator must follow. Added in the Instructions tab, by
// typing, uploading a file, pasting a link, or giving an example post.
export interface Instruction {
  id: string;
  title: string;
  body: string; // the rule(s) the writer must follow
  source: "typed" | "file" | "link" | "example" | "learned";
  postType?: PostType; // optional targeting; undefined = all types
  icp?: ICP; // optional targeting; undefined = all ICPs
  enabled: boolean;
  createdAt: string;
}
