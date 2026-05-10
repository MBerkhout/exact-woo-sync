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
- Optional: `WOO_DEFAULT_RATE_LIMIT_RPS` (default `5`) caps Woo REST client throughput when `connectors.config.rateLimitRps` is unset.
- For signed webhook smoke tests from the UI, set `NEXT_PUBLIC_APP_URL` (or rely on `VERCEL_URL`) so the **Test webhook** action can reach the public `/api/webhooks/woocommerce/[id]` route.

## Connect a WooCommerce store (Phase 2)

1. Dashboard → **Connectors** → **Add connector** (admin-only) → pick **WooCommerce** and name the instance.
2. Open the connector → enter **store base URL**, **consumer key/secret**, and **webhook secret** (must match the secret configured on the Woo webhook). **Save** runs a live `GET /wp-json/wc/v3/orders?per_page=1` health probe; status flips to `connected` on success.
3. In WooCommerce, create a webhook pointing at `https://<app-host>/api/webhooks/woocommerce/<connector_uuid>` with the same secret; deliver JSON for the topics you need (`order.*`, `product.*`, etc.).
4. Use **Test webhook** (admin) to POST a synthetic signed payload and confirm `202` + an inbound queue row (`pgmq` `sync.inbound`). Cron `GET /api/cron/drain-queue` drains Woo inbound → `entity_links` + `sync.outbound` jobs; Woo-target outbound messages execute REST writes in the same drain pass.

## Dead-letter replay

Phase 8 — UI will call a replay action inserting back into `pgmq` / `sync_jobs`.

## Build

Next.js requires public Supabase env vars even for static analysis; CI should inject placeholders:

```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run build
```
