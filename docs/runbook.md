# Runbook

## Prerequisites

- Node 20+
- Supabase project (database URL + anon + service role keys)
- Env vars copied from `.env.example`

## Install & dev

```bash
npm install
npm run dev
```

## Database migrations

```bash
export DATABASE_URL="postgres://..."
npm run migrate:status
npm run migrate:run
npm run migrate:create add_example_table   # creates timestamped SQL pair
npm run migrate:help
```

## Production checks

- Run migrations before deploying app revision.
- Manually verify RLS policies in Supabase (`Authentication → Policies` + SQL spot-checks as non-owner roles).
- Set `CRON_SECRET` and configure Vercel Cron (`vercel.json`) for `/api/cron/drain-queue`.
- Ensure `SECRETS_KEY` rotates with a documented re-encryption procedure (future runbook entry).

## Dead-letter replay

Phase 8 — UI will call a replay action inserting back into `pgmq` / `sync_jobs`.

## Exact Online app registration

- Create/update an app in the **Exact App Centre** for the same **region** your customers use; copy `EXACT_CLIENT_ID` / `EXACT_CLIENT_SECRET`.
- Set the redirect URI to `{APP_BASE_URL}/api/oauth/exact/callback` (must match exactly).
- Copy the app **webhook secret** into `EXACT_WEBHOOK_SECRET` (server env); it is mirrored into `connectors.config.webhookSecret` on successful OAuth so deliveries verify per tenant instance.

## Build

Next.js requires public Supabase env vars even for static analysis; CI should inject placeholders:

```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run build
```
