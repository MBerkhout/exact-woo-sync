import type {
  ConnCtx,
  Connector,
  ConnectorManifest,
  HealthStatus,
  OAuthHandlers,
  RateLimitedClient,
  WebhookHandlers,
} from "@/connectors/_contract/v1";
import { CONTRACT_VERSION } from "@/connectors/_contract/v1";

import { createExactRateLimitedHttpClient, lockedRefreshExactSecretsIfNeeded } from "./http";
import { exactRestBaseUrl } from "./config";
import { runWithExactContext } from "./context";
import {
  accessTokenExpiryIso,
  exchangeExactAuthorizationCode,
  fetchCurrentDivision,
  loadExactOAuthConfigFromEnv,
  refreshExactTokens,
} from "./oauth";
import type { ExactOAuthConfig } from "./oauth";
import type { ExactSecretsV1 } from "./secrets";
import { isExactSecretsV1 } from "./secrets";
import { jsonReadHeaders } from "./entities/_canonical";
import { exactCustomerEntityOps } from "./entities/customer";
import { exactOrderEntityOps } from "./entities/order";
import { exactPriceEntityOps } from "./entities/price";
import { exactProductEntityOps } from "./entities/product";
import { exactRefundEntityOps } from "./entities/refund";
import { exactStockEntityOps } from "./entities/stock";
import { normalizeExactWebhookPayload, verifyExactWebhookSignature } from "./webhooks";
import { provisionExactWebhooks, revokeExactWebhooks } from "./lifecycle";
import { getAdminSql } from "@/lib/db/postgres";

const manifest: ConnectorManifest = {
  kind: "exact-online",
  contractVersion: CONTRACT_VERSION,
  moduleVersion: "1.0.0",
  capabilities: [
    { entity: "order", directions: ["inbound", "outbound"] },
    { entity: "product", directions: ["inbound", "outbound"] },
    { entity: "customer", directions: ["inbound", "outbound"] },
    { entity: "stock", directions: ["inbound"] },
    { entity: "price", directions: ["inbound"] },
    { entity: "refund", directions: ["inbound", "outbound"] },
  ],
};

const oauth: OAuthHandlers = {
  async getAuthorizationUrl() {
    throw new Error(`Use ${"/api/oauth/exact/start"} to begin Exact OAuth`);
  },
  async exchangeCode() {
    throw new Error(`Use ${"/api/oauth/exact/callback"} to complete Exact OAuth`);
  },
  async refresh(payload: unknown) {
    const secrets = payload as ExactSecretsV1;
    if (!isExactSecretsV1(secrets)) throw new Error("refresh: invalid Exact secrets payload");
    const region = secrets.region;
    const env = secrets.env;
    const cfg = loadExactOAuthConfigFromEnv(region, env);
    const tr = await refreshExactTokens({ cfg, refreshToken: secrets.refreshToken });
    return {
      ...secrets,
      accessToken: tr.access_token,
      refreshToken: tr.refresh_token,
      accessTokenExpiresAt: accessTokenExpiryIso(tr.expires_in),
    } satisfies ExactSecretsV1;
  },
};

const webhooks: WebhookHandlers = {
  async verifySignature(input) {
    return verifyExactWebhookSignature({ rawBody: input.rawBody, secret: input.secret });
  },
  normalizePayload(rawBody: unknown) {
    return normalizeExactWebhookPayload(rawBody);
  },
  extractIdempotencyKey(headers: Headers) {
    return (
      headers.get("x-eolwh-delivery-id") ??
      headers.get("X-Eolwh-Delivery-Id") ??
      headers.get("x-exact-delivery-id") ??
      null
    );
  },
};

const http: RateLimitedClient = createExactRateLimitedHttpClient();

async function clearExactConnectorData(ctx: ConnCtx): Promise<void> {
  const sql = getAdminSql();
  await sql.begin(async (tx) => {
    await tx`
      DELETE FROM public.connector_secrets
      WHERE connector_id = ${ctx.connectorId}
    `;
    const rows = await tx<{ config: Record<string, unknown> }[]>`
      SELECT config FROM public.connectors WHERE id = ${ctx.connectorId} LIMIT 1
    `;
    const prev = rows[0]?.config ?? {};
    const { webhookSubscriptionIds: _w, webhookSecret: _s, division: _d, ...rest } = prev;
    void _w;
    void _s;
    void _d;
    await tx`
      UPDATE public.connectors
      SET status = 'disconnected',
          secrets_ref = null,
          config = ${tx.json(rest as never)}
      WHERE id = ${ctx.connectorId}
    `;
  });
}

export const exactOnlineConnector: Connector = {
  manifest,
  async connect(ctx: ConnCtx): Promise<void> {
    await runWithExactContext(ctx, async () => {
      await provisionExactWebhooks({
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
      });
    });
  },
  async disconnect(ctx: ConnCtx): Promise<void> {
    await revokeExactWebhooks({ tenantId: ctx.tenantId, connectorId: ctx.connectorId });
    await clearExactConnectorData(ctx);
  },
  async healthCheck(ctx: ConnCtx): Promise<HealthStatus> {
    return runWithExactContext(ctx, async () => {
      try {
        const secrets = await lockedRefreshExactSecretsIfNeeded(ctx.connectorId);
        const base = exactRestBaseUrl(secrets.region, secrets.env);
        const res = await http.request(
          new Request(`${base}/current/Me?$select=CurrentDivision`, {
            headers: jsonReadHeaders(),
          }),
        );
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          return { ok: false, message: `Exact Me HTTP ${res.status}: ${body.slice(0, 500)}` };
        }
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          message: e instanceof Error ? e.message : "Exact health check failed",
        };
      }
    });
  },
  oauth,
  webhooks,
  http,
  entities: {
    order: exactOrderEntityOps,
    product: exactProductEntityOps,
    customer: exactCustomerEntityOps,
    stock: exactStockEntityOps,
    price: exactPriceEntityOps,
    refund: exactRefundEntityOps,
  },
};

/** Used by the OAuth callback route (keeps `oauth.exchangeCode` pointing at UI flows). */
export async function exchangeExactOAuthCodeForSecrets(input: {
  cfg: ExactOAuthConfig;
  code: string;
  redirectUri: string;
}): Promise<ExactSecretsV1> {
  const tr = await exchangeExactAuthorizationCode({
    cfg: input.cfg,
    code: input.code,
    redirectUri: input.redirectUri,
  });
  const division = await fetchCurrentDivision({
    accessToken: tr.access_token,
    region: input.cfg.region,
    env: input.cfg.env,
  });
  return {
    v: 1,
    accessToken: tr.access_token,
    refreshToken: tr.refresh_token,
    accessTokenExpiresAt: accessTokenExpiryIso(tr.expires_in),
    region: input.cfg.region,
    env: input.cfg.env,
    division,
  };
}
