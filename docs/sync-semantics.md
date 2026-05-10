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
- **Exact:** prefer header `x-eolwh-delivery-id`; if absent, hash the raw request body (see `lib/webhooks/processInboundWebhook.ts`).
- Jobs: enforced again when worker lands (retry-safe design).

## Exact webhooks (verification & shape)

- **Exact Online** envelopes: `HashCode` is uppercase **HMAC-SHA256** over the raw JSON fragment after `"Content":` through the comma before `,"HashCode":"` (`connectors/exact-online/webhooks.ts`). The per-connector signing key is `connectors.config.webhookSecret`, populated from `EXACT_WEBHOOK_SECRET` at OAuth callback.
- **Normalization** for delivery payloads: `{ source: "exact-online", topic, entityKind, resourceId, content }` with topic→entityKind mapping (`Items`→`product`, `Accounts`→`customer`, `SalesOrders`/`SalesInvoices`→`order`, `StockPositions`→`stock`, `SalesItemPrices`→`price`).

## Logging & PII (§2)

- `lib/logging/redact.ts` strips likely PII fields before persistence.
- `lib/logging/logger.ts` writes `sync_logs` with automatic `expires_at` (`docs/retention.md`).

## Testing

Vitest covers registry/redaction/crypto checksum helpers today; DB-backed loop-guard assertions stay manual until we wire reusable Postgres fixtures in CI.
