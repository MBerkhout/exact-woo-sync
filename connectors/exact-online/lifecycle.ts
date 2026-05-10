import { getAdminSql } from "@/lib/db/postgres";

import { EXACT_WEBHOOK_TOPICS, exactRestBaseUrl } from "./config";
import { runWithExactContext } from "./context";
import { createExactRateLimitedHttpClient, lockedRefreshExactSecretsIfNeeded } from "./http";
import { odataGuidKey, jsonReadHeaders, jsonWriteHeaders } from "./entities/_canonical";

function appBaseUrl(): string {
  const u = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (!u?.trim()) throw new Error("APP_BASE_URL is not set");
  return u.replace(/\/$/, "");
}

export async function provisionExactWebhooks(input: {
  tenantId: string;
  connectorId: string;
}): Promise<string[]> {
  return runWithExactContext(
    { tenantId: input.tenantId, connectorId: input.connectorId },
    async () => {
      const secrets = await lockedRefreshExactSecretsIfNeeded(input.connectorId);
      const base = exactRestBaseUrl(secrets.region, secrets.env);
      const division = secrets.division;
      const http = createExactRateLimitedHttpClient();

      const me = await http.request(
        new Request(`${base}/current/Me?$select=CurrentDivision`, { headers: jsonReadHeaders() }),
      );
      if (!me.ok) {
        const detail = await me.text();
        throw new Error(`Exact Me failed during connect (${me.status}): ${detail}`);
      }
      const callback = `${appBaseUrl()}/api/webhooks/exact/${input.connectorId}`;

      const created: string[] = [];
      for (const topic of EXACT_WEBHOOK_TOPICS) {
        const url = `${base}/${division}/webhooks/WebhookSubscriptions`;
        const res = await http.request(
          new Request(url, {
            method: "POST",
            headers: jsonWriteHeaders(),
            body: JSON.stringify({ CallbackURL: callback, Topic: topic }),
          }),
        );
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(`Exact webhook subscribe failed (${topic}): ${detail}`);
        }
        const json = (await res.json()) as { d?: { ID?: string } };
        const id = json.d?.ID;
        if (typeof id === "string" && id.length) created.push(id);
      }

      const sql = getAdminSql();
      const rows = await sql<{ config: Record<string, unknown> }[]>`
        SELECT config FROM public.connectors WHERE id = ${input.connectorId} LIMIT 1
      `;
      const prev = rows[0]?.config ?? {};
      const next = { ...prev, webhookSubscriptionIds: created };
      await sql`
        UPDATE public.connectors
        SET config = ${sql.json(next as never)}
        WHERE id = ${input.connectorId}
      `;

      return created;
    },
  );
}

export async function revokeExactWebhooks(input: {
  tenantId: string;
  connectorId: string;
}): Promise<void> {
  await runWithExactContext(
    { tenantId: input.tenantId, connectorId: input.connectorId },
    async () => {
      const sql = getAdminSql();
      const rows = await sql<{ config: Record<string, unknown> }[]>`
        SELECT config FROM public.connectors WHERE id = ${input.connectorId} LIMIT 1
      `;
      const ids = rows[0]?.config?.webhookSubscriptionIds;
      const subscriptionIds = Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];

      if (subscriptionIds.length) {
        const secrets = await lockedRefreshExactSecretsIfNeeded(input.connectorId);
        const base = exactRestBaseUrl(secrets.region, secrets.env);
        const division = secrets.division;
        const http = createExactRateLimitedHttpClient();
        for (const subId of subscriptionIds) {
          const url = `${base}/${division}/${odataGuidKey("webhooks/WebhookSubscriptions", subId)}`;
          const res = await http.request(new Request(url, { method: "DELETE", headers: jsonReadHeaders() }));
          if (!res.ok && res.status !== 404) {
            await res.text().catch(() => "");
          }
        }
      }
    },
  );
}
