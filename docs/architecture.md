# Stack

- **App:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui (Base UI).
- **Data & auth:** Supabase Postgres + Auth (email/password v1). Row Level Security on all tenant-scoped tables (`docs/security.md`).
- **Jobs:** **pgmq** queues (`sync.inbound`, `sync.outbound`, `sync.fullsync`) co-located with Postgres for transactional enqueue + observability. Short batches are drained via Vercel Cron hitting `/api/cron/drain-queue` (Bearer `CRON_SECRET`). Long-running full-sync work will move to a Supabase Edge worker (`supabase/functions/sync-worker/`) in later phases.
- **Hosting:** Vercel (app + cron), Supabase (DB/Auth). Webhooks must be reachable over HTTPS.

## Contract versioning

- **Core contract:** `connectors/_contract/v1.ts` exports `CONTRACT_VERSION` (semver). Connectors declare `manifest.contractVersion`; registry rejects major mismatches (`connectors/registry.ts`).
- **Module semver:** Each connector exposes `manifest.moduleVersion`; tenants pin connector module versions on `connectors.version` (enforced in later phases).

## Key routes

| Area | Path |
|------|------|
| Webhooks | `/api/webhooks/woocommerce/[connectorId]`, `/api/webhooks/exact/[connectorId]` |
| Exact OAuth | `GET /api/oauth/exact/start`, `GET /api/oauth/exact/callback` |
| Woo stubs | `/api/oauth/woocommerce/callback` |
| Cron drain | `/api/cron/drain-queue` |

## Migrations

Custom SQL runner: `npm run migrate:run`, `npm run migrate:status`, `npm run migrate:create <name>`, `npm run migrate:help`.

## Edge worker stub vs Next.js TS project

The Deno placeholder under `supabase/functions/sync-worker/` is intentionally excluded from the root `tsconfig.json` (`"exclude": ["supabase"]`) so local `next build` does not require Deno type declarations—deploy it exclusively via Supabase tooling.
