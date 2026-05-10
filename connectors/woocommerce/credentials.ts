import { z } from "zod";
import type postgres from "postgres";

import { decryptSecretJson } from "@/lib/crypto/secrets";

export const wooCredentialsSchema = z.object({
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
});

export const wooConnectorConfigSchema = z.object({
  baseUrl: z
    .string()
    .min(1)
    .transform((s) => s.replace(/\/+$/, ""))
    .pipe(z.string().url()),
  webhookSecret: z.string().min(1),
  rateLimitRps: z.number().positive().optional(),
  suppressionMs: z.number().positive().optional(),
});

export type WooCredentials = z.infer<typeof wooCredentialsSchema>;

export type WooConnectorConfigInput = z.input<typeof wooConnectorConfigSchema>;
export type WooConnectorConfig = z.infer<typeof wooConnectorConfigSchema>;

const cacheSym = Symbol("wooCredCache");

type SqlWithCache = postgres.Sql & { [cacheSym]?: Map<string, WooCredentials> };

function credCache(sql: postgres.Sql): Map<string, WooCredentials> {
  const w = sql as SqlWithCache;
  if (!w[cacheSym]) w[cacheSym] = new Map();
  return w[cacheSym]!;
}

export async function loadCredentials(
  sql: postgres.Sql,
  connectorId: string,
): Promise<WooCredentials> {
  const cache = credCache(sql);
  const hit = cache.get(connectorId);
  if (hit) return hit;

  const rows = await sql<{ ciphertext: Uint8Array; nonce: Uint8Array }[]>`
    SELECT ciphertext, nonce
    FROM public.connector_secrets
    WHERE connector_id = ${connectorId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("Missing connector secrets");
  }
  const creds = await decryptSecretJson<WooCredentials>({
    ciphertext: new Uint8Array(row.ciphertext),
    nonce: new Uint8Array(row.nonce),
  });
  const parsed = wooCredentialsSchema.parse(creds);
  cache.set(connectorId, parsed);
  return parsed;
}

export function parseConnectorConfig(raw: unknown): Partial<WooConnectorConfig> & {
  baseUrl?: string;
  webhookSecret?: string;
} {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    baseUrl: typeof o.baseUrl === "string" ? o.baseUrl.replace(/\/+$/, "") : undefined,
    webhookSecret: typeof o.webhookSecret === "string" ? o.webhookSecret : undefined,
    rateLimitRps: typeof o.rateLimitRps === "number" ? o.rateLimitRps : undefined,
    suppressionMs: typeof o.suppressionMs === "number" ? o.suppressionMs : undefined,
  };
}
