import type { CanonicalByKind } from "@/connectors/_contract/entities";
import type {
  Connector,
  ConnectorManifest,
  EntityOps,
  HealthStatus,
  OAuthHandlers,
  RateLimitedClient,
  WebhookHandlers,
} from "@/connectors/_contract/v1";
import { CONTRACT_VERSION } from "@/connectors/_contract/v1";

const manifest: ConnectorManifest = {
  kind: "exact-online",
  contractVersion: CONTRACT_VERSION,
  moduleVersion: "0.1.0",
  capabilities: [
    { entity: "order", directions: ["inbound", "outbound"] },
    { entity: "product", directions: ["inbound", "outbound"] },
    { entity: "customer", directions: ["inbound", "outbound"] },
    { entity: "stock", directions: ["inbound"] },
    { entity: "price", directions: ["inbound"] },
    { entity: "refund", directions: ["inbound", "outbound"] },
  ],
};

function notImplemented(): never {
  throw new Error("Exact Online connector not implemented (Phase 3)");
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
  normalizePayload(rawBody: unknown, _headers: Headers) {
    void _headers;
    return rawBody;
  },
  extractIdempotencyKey(headers: Headers) {
    return headers.get("x-exact-delivery-id") ?? headers.get("x-request-id");
  },
};

const http: RateLimitedClient = {
  async request() {
    notImplemented();
  },
};

function stubEntityOps<K extends keyof CanonicalByKind>(): EntityOps<CanonicalByKind[K]> {
  return {
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
}

export const exactOnlineConnector: Connector = {
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
    order: stubEntityOps<"order">(),
    product: stubEntityOps<"product">(),
    customer: stubEntityOps<"customer">(),
    stock: stubEntityOps<"stock">(),
    price: stubEntityOps<"price">(),
    refund: stubEntityOps<"refund">(),
  },
};
