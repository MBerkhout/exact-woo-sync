import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  Capability,
  Connector,
  ConnectorManifest,
  ConnCtx,
  HealthStatus,
  OAuthHandlers,
  RateLimitedClient,
  WebhookHandlers,
} from "@/connectors/_contract/v1";
import { CONTRACT_VERSION } from "@/connectors/_contract/v1";
import { wooCustomerEntityOps } from "@/connectors/woocommerce/entities/customers";
import { wooOrderEntityOps } from "@/connectors/woocommerce/entities/orders";
import { wooPriceEntityOps } from "@/connectors/woocommerce/entities/prices";
import { wooProductEntityOps } from "@/connectors/woocommerce/entities/products";
import { wooRefundEntityOps } from "@/connectors/woocommerce/entities/refunds";
import { wooStockEntityOps } from "@/connectors/woocommerce/entities/stock";
import { loadCredentials, parseConnectorConfig } from "@/connectors/woocommerce/credentials";
import { normalizeWooWebhook } from "@/connectors/woocommerce/normalize/index";
import { probeWooRest, wooFetch } from "@/connectors/woocommerce/http";
import { getAdminSql } from "@/lib/db/postgres";

const cap = (entity: Capability["entity"], directions: Capability["directions"]) =>
  ({ entity, directions }) satisfies Capability;

const manifest: ConnectorManifest = {
  kind: "woocommerce",
  contractVersion: CONTRACT_VERSION,
  moduleVersion: "0.2.0",
  capabilities: [
    cap("order", ["inbound", "outbound"]),
    cap("product", ["inbound", "outbound"]),
    cap("customer", ["inbound", "outbound"]),
    cap("stock", ["outbound"]),
    cap("price", ["outbound"]),
    cap("refund", ["inbound", "outbound"]),
  ],
};

function oauthNotSupported(): never {
  throw new Error("WooCommerce uses REST API keys — OAuth is not used for this connector");
}

const oauth: OAuthHandlers = {
  async getAuthorizationUrl() {
    oauthNotSupported();
  },
  async exchangeCode() {
    oauthNotSupported();
  },
};

async function verifyWooWebhookSignature(input: {
  rawBody: Uint8Array | string;
  headers: Headers;
  secret: string;
}): Promise<boolean> {
  const header = input.headers.get("x-wc-webhook-signature");
  if (!header || !input.secret) return false;

  const buf =
    typeof input.rawBody === "string"
      ? Buffer.from(input.rawBody, "utf8")
      : Buffer.from(input.rawBody);

  const digest = createHmac("sha256", input.secret).update(buf).digest("base64");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(header, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const webhooks: WebhookHandlers = {
  verifySignature: verifyWooWebhookSignature,
  normalizePayload(rawBody: unknown, headers: Headers) {
    return normalizeWooWebhook(rawBody, headers);
  },
  extractIdempotencyKey(headers: Headers) {
    return headers.get("x-wc-webhook-delivery-id");
  },
};

const http: RateLimitedClient = {
  request(input: Request) {
    return wooFetch(input);
  },
};

export const woocommerceConnector: Connector = {
  manifest,
  async connect() {
    /* credentials wizard performs the real wiring */
  },
  async disconnect() {
    /* no remote revoke for API keys */
  },
  async healthCheck(ctx: ConnCtx): Promise<HealthStatus> {
    const sql = getAdminSql();
    const rows = await sql<{ config: unknown }[]>`
      SELECT config FROM public.connectors WHERE id = ${ctx.connectorId} LIMIT 1
    `;
    const parsed = parseConnectorConfig(rows[0]?.config);
    if (!parsed.baseUrl) {
      return { ok: false, message: "missing baseUrl in connector config" };
    }
    try {
      const creds = await loadCredentials(sql, ctx.connectorId);
      return await probeWooRest(parsed.baseUrl, creds);
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "health check failed",
      };
    }
  },
  oauth,
  webhooks,
  http,
  entities: {
    order: wooOrderEntityOps,
    product: wooProductEntityOps,
    customer: wooCustomerEntityOps,
    stock: wooStockEntityOps,
    price: wooPriceEntityOps,
    refund: wooRefundEntityOps,
  },
};
