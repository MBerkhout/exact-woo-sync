import type postgres from "postgres";

import type { EntityKind } from "@/connectors/_contract/v1";
import { insertSyncLog } from "@/lib/logging/logger";
import { canonicalHash } from "@/lib/sync/canonicalHash";
import { shouldSkipLoop } from "@/lib/sync/loopGuard";
import type { InboundQueueMessage } from "@/lib/sync/queueMessages";
import { INBOUND_MAX_ATTEMPTS } from "@/lib/sync/queueMessages";
import { PGMQ_QUEUES, enqueueJson } from "@/queue/pgmq";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseInboundQueueMessage(raw: unknown): InboundQueueMessage | null {
  if (!isRecord(raw)) return null;
  if (raw.platform !== "woocommerce" && raw.platform !== "exact-online") return null;
  if (typeof raw.connectorId !== "string" || typeof raw.tenantId !== "string") return null;
  if (typeof raw.deliveryId !== "string" || typeof raw.receivedAt !== "string") return null;
  if (typeof raw.topic !== "string" || typeof raw.entityId !== "string") return null;
  if (typeof raw.entityKind !== "string") return null;
  return {
    platform: raw.platform,
    connectorId: raw.connectorId,
    tenantId: raw.tenantId,
    deliveryId: raw.deliveryId,
    receivedAt: raw.receivedAt,
    topic: raw.topic,
    entityKind: raw.entityKind as EntityKind,
    entityId: raw.entityId,
    payload: raw.payload,
    attempts: typeof raw.attempts === "number" ? raw.attempts : undefined,
  };
}

export async function processWooInboundMessage(
  sql: postgres.Sql,
  message: InboundQueueMessage,
): Promise<void> {
  const incomingHash = canonicalHash(message.payload);
  const skip = await shouldSkipLoop(sql, {
    connectorId: message.connectorId,
    entityKind: message.entityKind,
    entityId: message.entityId,
    incomingHash,
  });
  if (skip) {
    await insertSyncLog({
      tenantId: message.tenantId,
      connectorId: message.connectorId,
      direction: "inbound",
      entityKind: message.entityKind,
      entityId: message.entityId,
      status: "success",
      payload: { skipped: true, reason: "loop_guard", topic: message.topic },
    });
    return;
  }

  const pairs = await sql<
    {
      id: string;
      target_connector_id: string;
      tenant_id: string;
      target_kind: string;
    }[]
  >`
    SELECT
      cp.id,
      cp.target_connector_id,
      cp.tenant_id,
      tgt.kind AS target_kind
    FROM public.connector_pairs cp
    INNER JOIN public.connectors tgt ON tgt.id = cp.target_connector_id
    WHERE cp.source_connector_id = ${message.connectorId}
  `;

  await sql.begin(async (tx) => {
    for (const pair of pairs) {
      await tx`
        INSERT INTO public.entity_links (
          tenant_id,
          pair_id,
          entity_kind,
          source_id,
          target_id,
          linked_at
        ) VALUES (
          ${pair.tenant_id},
          ${pair.id},
          ${message.entityKind},
          ${message.entityId},
          ${""},
          now()
        )
        ON CONFLICT (pair_id, entity_kind, source_id)
        DO UPDATE SET linked_at = EXCLUDED.linked_at
      `;

      await enqueueJson(tx as unknown as postgres.Sql, PGMQ_QUEUES.outbound, {
        tenantId: pair.tenant_id,
        pairId: pair.id,
        sourceConnectorId: message.connectorId,
        targetConnectorId: pair.target_connector_id,
        targetKind: pair.target_kind,
        entityKind: message.entityKind,
        entityId: message.entityId,
        payload: message.payload,
      });
    }
  });

  await insertSyncLog({
    tenantId: message.tenantId,
    connectorId: message.connectorId,
    direction: "inbound",
    entityKind: message.entityKind,
    entityId: message.entityId,
    status: "success",
    payload: {
      topic: message.topic,
      pairs: pairs.length,
    },
  });
}

export async function handleInboundFailure(
  sql: postgres.Sql,
  message: InboundQueueMessage,
  err: unknown,
): Promise<"dead" | "retry"> {
  const attempts = (message.attempts ?? 0) + 1;
  const lastError = err instanceof Error ? { message: err.message } : err;

  if (attempts >= INBOUND_MAX_ATTEMPTS) {
    await sql`
      INSERT INTO public.dead_letter_jobs (
        tenant_id,
        pair_id,
        original_job,
        last_error
      ) VALUES (
        ${message.tenantId},
        ${null},
        ${sql.json(message as never)},
        ${sql.json(lastError as never)}
      )
    `;
    await insertSyncLog({
      tenantId: message.tenantId,
      connectorId: message.connectorId,
      direction: "inbound",
      entityKind: message.entityKind,
      entityId: message.entityId,
      status: "failed",
      error: lastError,
    });
    return "dead";
  }

  await enqueueJson(sql, PGMQ_QUEUES.inbound, {
    ...message,
    attempts,
  });
  await insertSyncLog({
    tenantId: message.tenantId,
    connectorId: message.connectorId,
    direction: "inbound",
    entityKind: message.entityKind,
    entityId: message.entityId,
    status: "retry",
    error: lastError,
  });
  return "retry";
}
