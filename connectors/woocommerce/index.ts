import type {
  Capability,
  Connector,
  ConnectorManifest,
  EntityOps,
  HealthStatus,
  OAuthHandlers,
  RateLimitedClient,
  WebhookHandlers,
} from "@/connectors/_contract/v1";
import { CONTRACT_VERSION } from "@/connectors/_contract/v1";

const cap = (entity: Capability["entity"], directions: Capability["directions"]) =>
  ({ entity, directions }) satisfies Capability;

const manifest: ConnectorManifest = {
  kind: "woocommerce",
  contractVersion: CONTRACT_VERSION,
  moduleVersion: "0.1.0",
  capabilities: [
    cap("order", ["inbound", "outbound"]),
    cap("product", ["inbound", "outbound"]),
    cap("customer", ["inbound", "outbound"]),
    cap("stock", ["outbound"]),
    cap("price", ["outbound"]),
    cap("refund", ["inbound"]),
  ],
};

function notImplemented(): never {
  throw new Error("WooCommerce connector not implemented (Phase 2)");
}

const oauth: OAuthHandlers = {
  async getAuthorizationUrl() {
    notImplemented();
  },
  async exchangeCode() {
    notImplemented();
  },
};

const webhooks: WebhookHandlers = {
  async verifySignature() {
    return true;
  },
  normalizePayload(rawBody: unknown) {
    return rawBody;
  },
  extractIdempotencyKey(headers: Headers) {
    return headers.get("x-wc-webhook-delivery-id");
  },
};

const http: RateLimitedClient = {
  async request() {
    notImplemented();
  },
};

const stubEntityOps: EntityOps = {
  async fetch() {
    notImplemented();
  },
  async create() {
    notImplemented();
  },
  async update() {
    notImplemented();
  },
};

export const woocommerceConnector: Connector = {
  manifest,
  async connect() {
    notImplemented();
  },
  async disconnect() {
    notImplemented();
  },
  async healthCheck(): Promise<HealthStatus> {
    return { ok: false, message: "stub" };
  },
  oauth,
  webhooks,
  http,
  entities: {
    order: stubEntityOps,
    product: stubEntityOps,
    customer: stubEntityOps,
    stock: stubEntityOps,
    price: stubEntityOps,
    refund: stubEntityOps,
  },
};
