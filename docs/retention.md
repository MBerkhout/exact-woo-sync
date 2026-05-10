# Log retention

Aligned with product spec §2:

| Outcome | TTL |
|---------|-----|
| `sync_logs.status = success` | 48 hours |
| `retry` / `failed` | 7 days |

Implementation:

- `lib/logging/logger.ts` → `retentionExpiresAt()` sets `expires_at` on insert.
- SQL function `public.purge_expired_logs()` deletes expired rows (`db/migrations/20260510140500_queues_retention.sql`).
- Daily schedule via **pg_cron** when the extension exists (same migration). Otherwise configure manually in Supabase dashboard.
