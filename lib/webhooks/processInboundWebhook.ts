import { createHash } from "crypto";

import { getConnector } from "@/connectors/registry";
import { getAdminSql } from "@/lib/db/postgres";
import { recordWebhookDelivery } from "@/lib/webhooks/idempotency";
import { PGMQ_QUEUES, enqueueJson } from "@/queue/pgmq";

function safeJson(buf: Buffer): unknown {
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return { _raw: buf.toString("utf8") };
  }
}

export async function processInboundWebhook(input: {
  platform: "woocommerce" | "exact-online";
  connectorId: string;
  request: Request;
}): Promise<Response> {
  const sql = getAdminSql();

  const connectorRows = await sql<
    { id: string; tenant_id: string; kind: string; config: unknown }[]
  >`
    SELECT id, tenant_id, kind, config
    FROM public.connectors
    WHERE id = ${input.connectorId}
    LIMIT 1
  `;

  const row = connectorRows[0];
  if (!row || row.kind !== input.platform) {
    return new Response("connector not found", { status: 404 });
  }

  const connector = getConnector(row.kind);
  if (!connector) {
    return new Response("connector module missing", { status: 500 });
  }

  const rawBuf = Buffer.from(await input.request.arrayBuffer());
  const secret =
    (typeof row.config === "object" &&
      row.config !== null &&
      "webhookSecret" in row.config &&
      typeof (row.config as { webhookSecret?: unknown }).webhookSecret ===
        "string" &&
      (row.config as { webhookSecret: string }).webhookSecret) ||
    process.env.WEBHOOK_SIGNATURE_STUB_SECRET ||
    "";

  const skipVerify = process.env.WEBHOOK_SKIP_SIGNATURE_VERIFY === "true";

  const ok =
    skipVerify ||
    (await connector.webhooks.verifySignature({
      rawBody: rawBuf,
      headers: input.request.headers,
      secret,
    }));

  if (!ok) {
    return new Response("invalid signature", { status: 401 });
  }

  const deliveryId =
    connector.webhooks.extractIdempotencyKey(input.request.headers) ??
    createHash("sha256").update(rawBuf).digest("hex");

  const normalized = connector.webhooks.normalizePayload(safeJson(rawBuf));

  await sql.begin(async (tx) => {
    const { duplicate } = await recordWebhookDelivery(
      tx as unknown as import("postgres").Sql,
      row.id,
      deliveryId,
    );
    if (duplicate) return;

    await enqueueJson(tx as unknown as import("postgres").Sql, PGMQ_QUEUES.inbound, {
      platform: input.platform,
      connectorId: row.id,
      tenantId: row.tenant_id,
      deliveryId,
      receivedAt: new Date().toISOString(),
      payload: normalized,
    });
  });

  return new Response(null, { status: 202 });
}
