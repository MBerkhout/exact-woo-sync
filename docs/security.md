# Security model

## Authentication

- Supabase Auth email/password (v1). Session cookies refreshed via `middleware.ts`.

## Authorization

| Capability | `viewer` | `admin` |
|------------|----------|---------|
| Dashboard / logs / connectors / pairs (read) | yes | yes |
| Connector secrets ciphertext rows | no | yes (`connector_secrets`) |
| `oauth_states` rows | no | yes |
| Tenant invites (`tenant_invites`) | no | yes |

Server-side mutations that bypass RLS intentionally use `SUPABASE_SERVICE_ROLE_KEY` **only** inside trusted Server Actions / Route Handlers (`lib/supabase/admin.ts`, webhook enqueue path via `DATABASE_URL`).

## Row Level Security

Policies defined in `db/migrations/20260510140400_rls.sql`:

- Every tenant-scoped table requires membership via `tenant_members`.
- Connector-attached tables without `tenant_id` use `EXISTS` joins through `connectors`.

## Secrets

- Connector tokens: libsodium `crypto_secretbox_easy` (`lib/crypto/secrets.ts`, key `SECRETS_KEY` — 64 hex chars = 32 bytes).
- **Exact Online:** access + refresh tokens and metadata use typed payload `ExactSecretsV1` (`v: 1`, `accessTokenExpiresAt`, `division`, `region`, `env`) in `connector_secrets`; `EXACT_CLIENT_ID` / `EXACT_CLIENT_SECRET` stay server env only.
- Env vars: see `.env.example`.

## Webhooks

- Signature verification before enqueue (`WEBHOOK_SKIP_SIGNATURE_VERIFY=true` only for local dev).
- Connectors may store per-instance `webhookSecret` inside `connectors.config`.
