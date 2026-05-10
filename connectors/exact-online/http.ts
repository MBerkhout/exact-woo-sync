import { getAdminSql } from "@/lib/db/postgres";
import { encryptSecretJson, decryptSecretJson } from "@/lib/crypto/secrets";
import { insertSyncLog } from "@/lib/logging/logger";
import type { RateLimitedClient } from "@/connectors/_contract/v1";

import { getExactRunContext } from "./context";
import { accessTokenExpiryIso, loadExactOAuthConfigFromEnv, refreshExactTokens } from "./oauth";
import { isExactSecretsV1, type ExactSecretsV1 } from "./secrets";

const REFRESH_WINDOW_MS = 90_000;

function accessTokenExpiresAtMs(secrets: ExactSecretsV1): number {
  const t = Date.parse(secrets.accessTokenExpiresAt);
  return Number.isFinite(t) ? t : 0;
}

function needsRefresh(secrets: ExactSecretsV1, now = Date.now()): boolean {
  return accessTokenExpiresAtMs(secrets) - now < REFRESH_WINDOW_MS;
}

/** Runs refresh inside a locked transaction row for single-flight semantics. */
export async function lockedRefreshExactSecretsIfNeeded(
  connectorId: string,
): Promise<ExactSecretsV1> {
  const sql = getAdminSql();
  return sql.begin(async (tx) => {
    const rows = await tx<{ ciphertext: Uint8Array; nonce: Uint8Array }[]>`
      SELECT ciphertext, nonce
      FROM public.connector_secrets
      WHERE connector_id = ${connectorId}
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) throw new Error("connector secrets missing");

    const secrets = await decryptSecretJson<ExactSecretsV1>({
      ciphertext: row.ciphertext,
      nonce: row.nonce,
    });
    if (!isExactSecretsV1(secrets)) throw new Error("invalid Exact secrets shape");

    if (!needsRefresh(secrets)) return secrets;

    const cfg = loadExactOAuthConfigFromEnv(secrets.region, secrets.env);
    const tr = await refreshExactTokens({ cfg, refreshToken: secrets.refreshToken });
    const next: ExactSecretsV1 = {
      ...secrets,
      accessToken: tr.access_token,
      refreshToken: tr.refresh_token,
      accessTokenExpiresAt: accessTokenExpiryIso(tr.expires_in),
    };

    const enc = await encryptSecretJson(next);
    await tx`
      UPDATE public.connector_secrets
      SET ciphertext = ${Buffer.from(enc.ciphertext)},
          nonce = ${Buffer.from(enc.nonce)},
          updated_at = now()
      WHERE connector_id = ${connectorId}
    `;

    return next;
  });
}

export async function forceRefreshExactSecrets(connectorId: string): Promise<ExactSecretsV1> {
  const sql = getAdminSql();
  return sql.begin(async (tx) => {
    const rows = await tx<{ ciphertext: Uint8Array; nonce: Uint8Array }[]>`
      SELECT ciphertext, nonce
      FROM public.connector_secrets
      WHERE connector_id = ${connectorId}
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) throw new Error("connector secrets missing");

    const secrets = await decryptSecretJson<ExactSecretsV1>({
      ciphertext: row.ciphertext,
      nonce: row.nonce,
    });
    if (!isExactSecretsV1(secrets)) throw new Error("invalid Exact secrets shape");

    const cfg = loadExactOAuthConfigFromEnv(secrets.region, secrets.env);
    const tr = await refreshExactTokens({ cfg, refreshToken: secrets.refreshToken });
    const next: ExactSecretsV1 = {
      ...secrets,
      accessToken: tr.access_token,
      refreshToken: tr.refresh_token,
      accessTokenExpiresAt: accessTokenExpiryIso(tr.expires_in),
    };

    const enc = await encryptSecretJson(next);
    await tx`
      UPDATE public.connector_secrets
      SET ciphertext = ${Buffer.from(enc.ciphertext)},
          nonce = ${Buffer.from(enc.nonce)},
          updated_at = now()
      WHERE connector_id = ${connectorId}
    `;

    return next;
  });
}

function parseRetryAfter(header: string | null): number {
  if (!header) return 1;
  const seconds = Number.parseInt(header, 10);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds, 1), 60);
  const when = Date.parse(header);
  if (Number.isFinite(when)) {
    return Math.min(Math.max(Math.ceil((when - Date.now()) / 1000), 1), 120);
  }
  return 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldLogExactHttp(): boolean {
  return process.env.EXACT_HTTP_SYNC_LOG === "1" || process.env.EXACT_HTTP_SYNC_LOG === "true";
}

export function createExactRateLimitedHttpClient(): RateLimitedClient {
  return {
    async request(input: Request): Promise<Response> {
      const { tenantId, connectorId } = getExactRunContext();
      const maxAttempts = 5;

      const send = async (secrets: ExactSecretsV1): Promise<Response> => {
        let secretsForAttempt = secrets;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const started = Date.now();
          const headers = new Headers(input.headers);
          headers.set("Authorization", `Bearer ${secretsForAttempt.accessToken}`);

          const requestInit: RequestInit & { duplex?: "half" } = {
            method: input.method,
            headers,
            body: input.body,
            signal: input.signal,
          };
          if (input.body && input.method !== "GET" && input.method !== "HEAD") {
            requestInit.duplex = "half";
          }

          let res: Response;
          try {
            res = await fetch(new Request(input.url, requestInit));
          } catch (err) {
            if (shouldLogExactHttp()) {
              await insertSyncLog({
                tenantId,
                connectorId,
                direction: "outbound",
                status: "failed",
                error: { message: err instanceof Error ? err.message : String(err) },
              });
            }
            throw err;
          }

          if (res.status === 429) {
            const waitS = parseRetryAfter(res.headers.get("retry-after"));
            await sleep(waitS * 1000);
            continue;
          }

          if (res.status === 401 && attempt === 0) {
            secretsForAttempt = await forceRefreshExactSecrets(connectorId);
            continue;
          }

          if (res.status >= 400) {
            const snippet =
              shouldLogExactHttp() ? await res.clone().text().catch(() => "") : "";
            await insertSyncLog({
              tenantId,
              connectorId,
              direction: "outbound",
              status: res.status >= 500 ? "retry" : "failed",
              httpStatus: res.status,
              durationMs: Date.now() - started,
              payload: {
                url: input.url,
                status: res.status,
                ...(snippet ? { bodySnippet: snippet.slice(0, 4096) } : {}),
              },
            });
          }

          return res;
        }

        throw new Error("Exact HTTP max retries exceeded (429)");
      };

      const secrets = await lockedRefreshExactSecretsIfNeeded(connectorId);
      return send(secrets);
    },
  };
}
