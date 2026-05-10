# Sync semantics (foundation)

## Direction & authority (§7.2)

- Exact leads conflicts; field ownership split will be enforced in the sync engine (Phases 4–5).
- Phase 1 persists scaffolding only (`suppression_window`, `content_hashes`, queue entries).

## Loop prevention (§7.3)

`lib/sync/loopGuard.ts`:

- **Suppression window** — after we write to a platform, ignore inbound events for the same `(connector_id, entity_kind, entity_id)` until `until`.
- **Content hash** — skip processing when incoming canonical hash matches stored hash.

Connectors may add synthetic markers in later phases.

## Idempotency (§9)

- Webhooks: `(connector_id, delivery_id)` uniqueness via `webhook_deliveries`.
- Jobs: enforced again when worker lands (retry-safe design).

## Logging & PII (§2)

- `lib/logging/redact.ts` strips likely PII fields before persistence.
- `lib/logging/logger.ts` writes `sync_logs` with automatic `expires_at` (`docs/retention.md`).

## Testing

Vitest covers registry/redaction/crypto checksum helpers today; DB-backed loop-guard assertions stay manual until we wire reusable Postgres fixtures in CI.
