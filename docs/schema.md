# Schema reference

Maintained alongside SQL migrations in `db/migrations/`. Regenerate/extend this file whenever migrations add or change tables.

## Core tables

| Table | Purpose |
|-------|---------|
| `tenants` | Paying organization (§3 **Tenant**). |
| `tenant_members` | Links `auth.users` to tenants with `admin` \| `viewer`. |
| `tenant_invites` | Hashed invite tokens for onboarding additional users. |
| `connectors` | Configured connector instance (`kind`, pinned `version`, `config` JSON, `status`). |
| `connector_secrets` | libsodium secretbox payload (`ciphertext`, `nonce`) per connector. |
| `connector_pairs` | Directed pair (`source_connector_id` → `target_connector_id`) + `feature_toggles` / `settings`. |
| `entity_links` | Cross-system IDs (e.g. Woo customer ↔ Exact debtor) per pair. |
| `webhook_deliveries` | Idempotency ledger `(connector_id, delivery_id)`. |
| `sync_jobs` | Durable job mirror (queue worker expands in later phases). |
| `sync_logs` | Redacted payloads + retention via `expires_at` (`docs/retention.md`). |
| `dead_letter_jobs` | Poison messages for replay UI (Phase 8). |
| `suppression_window` | Loop prevention: ignore inbound writes until `until`. |
| `content_hashes` | Loop prevention: skip when payload hash unchanged. |
| `connector_cursors` | One row per connector (`entity_kind` + opaque `cursor` token for polling — Woo `modified_after` baseline). |
| `oauth_states` | Short-lived Exact OAuth `state` + connector binding (**admin-only** RLS). |

**Indexes:** `entity_links_pair_kind_source_idx` unique on `(pair_id, entity_kind, source_id)` supports idempotent upserts from inbound workers.

## Extensions / queues

- `pgcrypto`, `pgmq` (`db/migrations/20260510140200_extensions.sql`).
- Function `public.purge_expired_logs()` (`docs/retention.md`).

## Internal table

- `_migrations` — applied SQL files + checksums for the custom migrator (`db/migrator/cli.mjs`).
