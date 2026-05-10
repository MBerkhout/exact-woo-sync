# Connector framework

## Contract (`connectors/_contract/v1.ts`)

Each connector implements:

- Lifecycle: `connect`, `disconnect`, `healthCheck`
- `oauth` handlers (Exact/Woo specifics)
- `webhooks`: signature verification, normalization, idempotency header extraction
- `http`: rate-limited client (stubs throw until Phase 2/3)
- `entities`: typed CRUD map keyed by `EntityKind`
- Optional `cursor` adapter for polling (`Sync.*`, Woo incremental)

## Registry (`connectors/registry.ts`)

- `getConnector(kind)` returns module or `null`.
- Validates **major** contract equality vs core `CONTRACT_VERSION`.

## Modules (Phase 1 stubs)

| Kind | Path | Notes |
|------|------|-------|
| `woocommerce` | `connectors/woocommerce/index.ts` | Delivery id header `X-WC-Webhook-Delivery-ID`. |
| `exact-online` | `connectors/exact-online/index.ts` | Delivery id placeholder headers (`x-exact-delivery-id` fallback). |

## Capability matrix UI

`lib/connectors/feature-matrix.ts` intersects manifest capabilities for connector-pair toggles (§8.3).
