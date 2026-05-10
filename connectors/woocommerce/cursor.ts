import type postgres from "postgres";

import type { SyncCursorAdapter } from "@/connectors/_contract/v1";
import { runWithWooContextAsync, type WooWorkerContext } from "@/connectors/woocommerce/context";
import { loadCredentials, parseConnectorConfig } from "@/connectors/woocommerce/credentials";
import { defaultWooRps, readWooJson, wooGET } from "@/connectors/woocommerce/http";

const CURSOR_ENTITY_KIND = "woocommerce";

export function createWooCursorAdapter(
  sql: postgres.Sql,
  input: { connectorId: string; tenantId: string },
): SyncCursorAdapter {
  const { connectorId } = input;
  return {
    async loadCursor(): Promise<string | null> {
      const rows = await sql<{ cursor: string }[]>`
        SELECT cursor
        FROM public.connector_cursors
        WHERE connector_id = ${connectorId}
        LIMIT 1
      `;
      return rows[0]?.cursor ?? null;
    },
    async saveCursor(token: string): Promise<void> {
      await sql`
        INSERT INTO public.connector_cursors (
          connector_id,
          entity_kind,
          cursor,
          updated_at
        ) VALUES (${connectorId}, ${CURSOR_ENTITY_KIND}, ${token}, now())
        ON CONFLICT (connector_id)
        DO UPDATE SET
          cursor = EXCLUDED.cursor,
          entity_kind = EXCLUDED.entity_kind,
          updated_at = now()
      `;
    },
  };
}

export type PollKind = "order" | "product";

export async function pollSince(
  sql: postgres.Sql,
  input: { connectorId: string; tenantId: string },
  kind: PollKind,
  since: string | null,
): Promise<{ items: unknown[]; nextCursor: string | null }> {
  const creds = await loadCredentials(sql, input.connectorId);
  const rows = await sql<{ config: unknown }[]>`
    SELECT config FROM public.connectors WHERE id = ${input.connectorId} LIMIT 1
  `;
  const parsed = parseConnectorConfig(rows[0]?.config);
  if (!parsed.baseUrl) {
    throw new Error("connector baseUrl missing");
  }

  const ctx: WooWorkerContext = {
    sql,
    tenantId: input.tenantId,
    connectorId: input.connectorId,
    baseUrl: parsed.baseUrl,
    credentials: creds,
    rateLimitRps: parsed.rateLimitRps ?? defaultWooRps(),
    suppressionMs: parsed.suppressionMs ?? 60_000,
  };

  return runWithWooContextAsync(ctx, async () => {
    const resource = kind === "product" ? "products" : "orders";
    let page = 1;
    const items: unknown[] = [];
    let lastModified: string | null = null;

    for (;;) {
      const qs = new URLSearchParams();
      qs.set("per_page", "100");
      qs.set("page", String(page));
      qs.set("orderby", "modified");
      qs.set("order", "asc");
      if (since) qs.set("modified_after", since);

      const res = await wooGET(`/${resource}?${qs.toString()}`);
      const raw = (await readWooJson(res)) as unknown;
      if (!Array.isArray(raw) || raw.length === 0) break;

      items.push(...raw);
      const last = raw[raw.length - 1] as Record<string, unknown>;
      const mod = typeof last.date_modified === "string" ? last.date_modified : null;
      if (mod) lastModified = mod;
      if (raw.length < 100) break;
      page += 1;
    }

    return { items, nextCursor: lastModified ?? since };
  });
}
