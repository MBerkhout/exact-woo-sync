import { createHash } from "node:crypto";

import type { EntityKind } from "@/connectors/_contract/v1";
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

function parseInboundEnvelope(
  normalized: unknown,
): { topic: string; entityKind: EntityKind; entityId: string; payload: unknown } | null {
  if (!normalized || typeof normalized !== "object") return null;
  const o = normalized as Record<string, unknown>;
  const topic = o.topic;
  const entityKind = o.entityKind;
  const entityId = o.entityId;
  if (typeof topic !== "string" || !topic.length) return null;
  if (typeof entityKind !== "string" || !entityKind.length) return null;
  if (typeof entityId !== "string" || !entityId.length) return null;
  return {
    topic,
    entityKind: entityKind as EntityKind,
    entityId,
    payload: "payload" in o ? o.payload : normalized,
  };
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
      typeof (row.config as { webhookSecret?: unknown }).webhookSecret === "string" &&
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

  const normalized = connector.webhooks.normalizePayload(safeJson(rawBuf), input.request.headers);
  const envelope = parseInboundEnvelope(normalized);

  await sql.begin(async (tx) => {
    const { duplicate } = await recordWebhookDelivery(
      tx as unknown as import("postgres").Sql,
      row.id,
      deliveryId,
    );
    if (duplicate) return;

    if (!envelope) {
      return;
    }

    await enqueueJson(tx as unknown as import("postgres").Sql, PGMQ_QUEUES.inbound, {
      platform: input.platform,
      connectorId: row.id,
      tenantId: row.tenant_id,
      deliveryId,
      receivedAt: new Date().toISOString(),
      topic: envelope.topic,
      entityKind: envelope.entityKind,
      entityId: envelope.entityId,
      payload: envelope.payload,
    });
  });

  return new Response(null, { status: 202 });
}
