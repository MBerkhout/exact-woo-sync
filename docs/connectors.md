# Connector framework

## Contract (`connectors/_contract/v1.ts`)

Each connector implements:

- Lifecycle: `connect`, `disconnect`, `healthCheck`
- `oauth` handlers (Exact/Woo specifics)
- `webhooks`: signature verification, normalization, idempotency header extraction
- `http`: rate-limited client (Exact implemented; WooCommerce stub until Phase 2)
- `entities`: typed CRUD map keyed by `EntityKind`
- Optional `cursor` adapter for polling (`Sync.*`, Woo incremental)

## Registry (`connectors/registry.ts`)

- `getConnector(kind)` returns module or `null`.
- Validates **major** contract equality vs core `CONTRACT_VERSION`.

## Modules

| Kind | Path | Notes |
|------|------|-------|
| `woocommerce` | `connectors/woocommerce/index.ts` | Delivery id header `X-WC-Webhook-Delivery-ID` (Phase 2). |
| `exact-online` | `connectors/exact-online/index.ts` | Per-region OAuth hosts (`nl`, `be`, `de`, `uk`, `es`, `fr`, `com`); sandbox is **NL-only**. Webhook topics: `Items`, `Accounts`, `SalesOrders`, `SalesInvoices`, `StockPositions`, `SalesItemPrices`. |

## Capability matrix UI

`lib/connectors/feature-matrix.ts` intersects manifest capabilities for connector-pair toggles (§8.3).
