# Connector framework

## Contract (`connectors/_contract/v1.ts`)

Each connector implements:

- Lifecycle: `connect`, `disconnect`, `healthCheck`
- `oauth` handlers (Exact/Woo specifics)
- `webhooks`: signature verification, normalization, idempotency header extraction (normalizers receive `(rawBody, headers)` — headers used by WooCommerce topic hints)
- `http`: rate-limited client (`connectors/woocommerce/http.ts` Woo; `connectors/exact-online/http.ts` Exact OAuth + OData)
- `entities`: typed CRUD map keyed by `EntityKind` (`connectors/_contract/entities.ts` canonical DTOs)
- Optional `cursor` adapter for polling (`Sync.*`, Woo incremental)

## Registry (`connectors/registry.ts`)

- `getConnector(kind)` returns module or `null`.
- Validates **major** contract equality vs core `CONTRACT_VERSION`.

## Modules

| Kind | Path | Notes |
|------|------|-------|
| `woocommerce` | `connectors/woocommerce/index.ts` | **Auth:** REST consumer key/secret (Basic), stored in `connector_secrets` via the dashboard wizard (`/connectors/new`, `/connectors/[id]`). **Webhooks:** HMAC-SHA256 over raw body, Base64 digest in `X-WC-Webhook-Signature`; topic in `X-WC-Webhook-Topic` (`order.*`, `product.*`, `customer.*`, `order.refunded` → refund); idempotency `X-WC-Webhook-Delivery-ID`. **HTTP:** in-process token bucket per connector (default **5 rps**, override with `connectors.config.rateLimitRps` or env `WOO_DEFAULT_RATE_LIMIT_RPS`), 429 honors `Retry-After`, up to three retries on 5xx. **Normalize:** `connectors/woocommerce/normalize/*` maps Woo REST JSON → canonical DTOs. **Outbound:** `entities/*` + `markWritten` (loop guard). **Polling:** `connectors/woocommerce/cursor.ts` (`modified_after`, paginated) for future schedulers. |
| `exact-online` | `connectors/exact-online/index.ts` | Module **v1**: per-region OAuth (`nl`, `be`, `de`, `uk`, `es`, `fr`, `com`); sandbox is **NL-only**. **Webhooks:** topics `Items`, `Accounts`, `SalesOrders`, `SalesInvoices`, `StockPositions`, `SalesItemPrices`; idempotency `x-eolwh-delivery-id` when present. |

## Capability matrix UI

`lib/connectors/feature-matrix.ts` intersects manifest capabilities for connector-pair toggles (§8.3).
