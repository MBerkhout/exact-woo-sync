import { randomInt } from "node:crypto";

import type { EntityKind, HealthStatus } from "@/connectors/_contract/v1";
import type { WooCredentials } from "@/connectors/woocommerce/credentials";
import { getWooCtx } from "@/connectors/woocommerce/context";
import { insertSyncLog } from "@/lib/logging/logger";

export class WooApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Woo API ${status}: ${body.slice(0, 500)}`);
    this.name = "WooApiError";
    this.status = status;
    this.body = body;
  }
}

const buckets = new Map<string, TokenBucket>();

function bucketFor(connectorId: string, rps: number): TokenBucket {
  const key = `${connectorId}:${rps}`;
  let b = buckets.get(key);
  if (!b) {
    b = new TokenBucket(rps);
    buckets.set(key, b);
  }
  return b;
}

class TokenBucket {
  private tokens: number;
  private last: number;

  constructor(private readonly rps: number) {
    this.tokens = rps;
    this.last = Date.now();
  }

  async take(): Promise<void> {
    for (;;) {
      const now = Date.now();
      const elapsed = (now - this.last) / 1000;
      this.last = now;
      const cap = Math.max(this.rps * 2, 1);
      this.tokens = Math.min(cap, this.tokens + elapsed * this.rps);
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const need = 1 - this.tokens;
      const waitMs = Math.ceil((need / this.rps) * 1000) + randomInt(0, 25);
      await new Promise((r) => setTimeout(r, Math.max(10, waitMs)));
    }
  }
}

export function defaultWooRps(): number {
  const env = process.env.WOO_DEFAULT_RATE_LIMIT_RPS;
  const n = env ? Number.parseFloat(env) : 5;
  return Number.isFinite(n) && n > 0 ? n : 5;
}

function parseRetryAfterMs(res: Response): number | null {
  const ra = res.headers.get("retry-after");
  if (!ra) return null;
  const asInt = Number.parseInt(ra, 10);
  if (!Number.isNaN(asInt)) return asInt * 1000;
  const d = Date.parse(ra);
  if (!Number.isNaN(d)) return Math.max(0, d - Date.now());
  return null;
}

function withJitter(ms: number, attempt: number): number {
  return ms + randomInt(0, Math.min(250, 50 * (attempt + 1)));
}

export function basicAuthHeader(consumerKey: string, consumerSecret: string): string {
  const token = Buffer.from(`${consumerKey}:${consumerSecret}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

/** Health probe without worker AsyncLocalStorage context. */
export async function probeWooRest(
  baseUrl: string,
  creds: WooCredentials,
): Promise<HealthStatus> {
  const root = baseUrl.replace(/\/+$/, "");
  const url = `${root}/wp-json/wc/v3/orders?per_page=1`;
  const res = await fetch(url, {
    headers: { authorization: basicAuthHeader(creds.consumerKey, creds.consumerSecret) },
  });
  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: "Woo REST unauthorized (check API keys)" };
  }
  if (!res.ok) {
    return { ok: false, message: `Woo REST HTTP ${res.status}` };
  }
  return { ok: true };
}

export async function wooFetch(
  input: Request,
  opts?: { connectorId?: string; rateLimitRps?: number },
): Promise<Response> {
  const ctx = getWooCtx();
  const connectorId = opts?.connectorId ?? ctx.connectorId;
  const rps = opts?.rateLimitRps ?? ctx.rateLimitRps ?? defaultWooRps();
  await bucketFor(connectorId, rps).take();

  const headers = new Headers(input.headers);
  if (!headers.has("authorization")) {
    headers.set(
      "authorization",
      basicAuthHeader(ctx.credentials.consumerKey, ctx.credentials.consumerSecret),
    );
  }

  let attempt = 0;
  const req = new Request(input, { headers });

  for (;;) {
    const res = await fetch(req.clone());
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 3) return res;
      const retryAfter = res.status === 429 ? parseRetryAfterMs(res) : null;
      const backoff = retryAfter ?? withJitter(400 * 2 ** attempt, attempt);
      attempt += 1;
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }
    return res;
  }
}

export function apiUrl(path: string): string {
  const { baseUrl } = getWooCtx();
  const root = baseUrl.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${root}/wp-json/wc/v3${p}`;
}

export async function wooGET(path: string): Promise<Response> {
  return wooFetch(new Request(apiUrl(path), { method: "GET" }));
}

export async function wooSend(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const headers = new Headers({ accept: "application/json" });
  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }
  return wooFetch(
    new Request(apiUrl(path), {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
    }),
  );
}

export async function readWooJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!res.ok) {
    throw new WooApiError(res.status, text);
  }
  if (!text.length) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new WooApiError(res.status, "Invalid JSON body");
  }
}

export async function withHttpLog<T>(
  input: {
    tenantId: string;
    connectorId: string;
    direction: "inbound" | "outbound";
    entityKind?: EntityKind | string | null;
    entityId?: string | null;
  },
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const out = await fn();
    await insertSyncLog({
      tenantId: input.tenantId,
      connectorId: input.connectorId,
      direction: input.direction,
      entityKind: input.entityKind ?? null,
      entityId: input.entityId ?? null,
      status: "success",
      durationMs: Date.now() - start,
    });
    return out;
  } catch (e) {
    await insertSyncLog({
      tenantId: input.tenantId,
      connectorId: input.connectorId,
      direction: input.direction,
      entityKind: input.entityKind ?? null,
      entityId: input.entityId ?? null,
      status: "failed",
      durationMs: Date.now() - start,
      error: e instanceof Error ? { message: e.message } : e,
    });
    throw e;
  }
}
