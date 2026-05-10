/**
 * Versioned connector interface contract (§4).
 * Bump CONTRACT_VERSION when breaking changes require connector updates.
 */
export const CONTRACT_VERSION = "1.0.0";

export type EntityKind =
  | "order"
  | "product"
  | "customer"
  | "stock"
  | "price"
  | "refund";

export type SyncDirection = "inbound" | "outbound";

export interface Capability {
  entity: EntityKind;
  directions: SyncDirection[];
}

export interface ConnectorManifest {
  kind: string;
  /** Semver of this contract the module implements */
  contractVersion: string;
  /** Semver of the connector module */
  moduleVersion: string;
  capabilities: Capability[];
}

export type HealthStatus =
  | { ok: true }
  | { ok: false; message: string };

export interface ConnCtx {
  connectorId: string;
  tenantId: string;
}

export interface OAuthHandlers {
  getAuthorizationUrl(input: {
    redirectUri: string;
    state: string;
  }): Promise<{ url: string }>;
  exchangeCode(input: { code: string; redirectUri: string }): Promise<unknown>;
  refresh?(input: unknown): Promise<unknown>;
}

export interface WebhookHandlers {
  verifySignature(input: {
    rawBody: Uint8Array | string;
    headers: Headers;
    secret: string;
  }): Promise<boolean>;
  normalizePayload(rawBody: unknown): unknown;
  extractIdempotencyKey(headers: Headers): string | null;
}

export interface RateLimitedClient {
  request(input: Request): Promise<Response>;
}

export interface EntityOps<T = unknown> {
  fetch(id: string): Promise<T | null>;
  create(payload: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
}

export interface SyncCursorAdapter {
  /** Poll-based delta sync cursor */
  loadCursor(): Promise<string | null>;
  saveCursor(token: string): Promise<void>;
}

export interface Connector {
  manifest: ConnectorManifest;
  connect(ctx: ConnCtx): Promise<void>;
  disconnect(ctx: ConnCtx): Promise<void>;
  healthCheck(ctx: ConnCtx): Promise<HealthStatus>;
  oauth: OAuthHandlers;
  webhooks: WebhookHandlers;
  http: RateLimitedClient;
  entities: Partial<Record<EntityKind, EntityOps>>;
  cursor?: SyncCursorAdapter;
}
