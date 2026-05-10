import type postgres from "postgres";

import type { WooWorkerContext } from "@/connectors/woocommerce/context";
import { loadCredentials, parseConnectorConfig } from "@/connectors/woocommerce/credentials";
import { defaultWooRps } from "@/connectors/woocommerce/http";

export async function loadWooWorkerContext(
  sql: postgres.Sql,
  input: { connectorId: string; tenantId: string },
): Promise<WooWorkerContext> {
  const creds = await loadCredentials(sql, input.connectorId);
  const rows = await sql<{ config: unknown }[]>`
    SELECT config FROM public.connectors WHERE id = ${input.connectorId} LIMIT 1
  `;
  const parsed = parseConnectorConfig(rows[0]?.config);
  if (!parsed.baseUrl) {
    throw new Error("Woo connector baseUrl missing");
  }
  return {
    sql,
    tenantId: input.tenantId,
    connectorId: input.connectorId,
    baseUrl: parsed.baseUrl,
    credentials: creds,
    rateLimitRps: parsed.rateLimitRps ?? defaultWooRps(),
    suppressionMs: parsed.suppressionMs ?? 60_000,
  };
}
