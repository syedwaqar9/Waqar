# Sunnyvale

Internal content OS for IAIMS LinkedIn growth. It researches and verifies the week's
AI-regulation news, drafts five on-brand posts and carousels, renders the 1080x1080
assets, runs the guardrail checks, and gives Jaya an in-tool review and approval loop.
Claude auto-revises from her notes. There is also a create-from-upload flow: drop a
screenshot or an update and get an on-brand post.

Built with Next.js (App Router) on Vercel, Claude for research and generation, and a
native SVG renderer that rebuilds the locked cairosvg design (no Python).

## Quick start (one key)

```bash
npm install
cp .env.example .env.local      # add ANTHROPIC_API_KEY
npm run dev                      # http://localhost:3000
```

Then:
1. Inbox → "Generate next week". Claude researches, plans five days, drafts and renders.
2. Open the week, review each post, "Approve" or "Request changes" (Claude revises in-voice).
3. "Create from upload" to turn a screenshot or note into a post.

Only `ANTHROPIC_API_KEY` is required. Everything else is optional.

## What is built (Phase 1)

- The Brand Brain (`src/brand/brandBrain.ts`): Waqar's manual + the strategy decks encoded
  as data. Voice rules, the NOT list, ICPs, post types, message bank, design tokens.
- The verified-facts ledger (`src/brand/facts.ts`): generation cites only active facts;
  stale facts (Colorado June 30) are blocked.
- The weekly engine (`src/lib/generate`): research → plan (geography + ICP balance, dedup
  against past weeks) → draft → revise.
- The guardrail linter (`src/lib/linter.ts`): no em dash, exactly 3 hashtags, no comment
  CTA, CTA present, Colorado guard, banned words, headline width.
- The renderer (`src/lib/render`): native SVG for the locked design, plus SVG→PNG export.
- The Linear-style review UI: inbox, week review with carousel preview, approve and
  request-changes, create-from-upload, Brand Brain reference.

## Configure the integrations (fast-follow, optional)

- `SLACK_WEBHOOK_URL`: the Saturday cron sends Jaya the review link; approval pings Waqar.
- `CRON_SECRET`: protects `/api/cron/weekly`. Add a Vercel Cron for Saturday morning.
- `APP_BASE_URL`: used to build the review links.

## Deploy to Vercel

Import the repo, set `ANTHROPIC_API_KEY` (and optional vars), deploy. Add a Cron Job
hitting `/api/cron/weekly` on Saturday morning.

Note: the first cut stores data on local disk (`.data/`), which is fine locally and for a
single instance. For multi-user persistence on Vercel, swap `src/lib/store.ts` for Postgres
(the interface stays the same). That is the first fast-follow item.

## Roadmap (next)

1. Postgres store + Vercel Blob for assets.
2. Brand Brain editing in-app + the learning loop (promote Jaya's notes to permanent rules).
3. Content ledger with embeddings for stronger no-duplication.
4. Slack bot delivery (richer than webhook) and the review link per post.
5. LinkedIn metrics in an Insights view (followers, profile views, engagement).
