import type postgres from "postgres";

import { getConnector } from "@/connectors/registry";
import type { EntityKind } from "@/connectors/_contract/v1";
import { runWithWooContextAsync } from "@/connectors/woocommerce/context";
import { loadWooWorkerContext } from "@/connectors/woocommerce/runtime";
import { insertSyncLog } from "@/lib/logging/logger";
import type { OutboundQueueMessage } from "@/lib/sync/queueMessages";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseOutboundQueueMessage(raw: unknown): OutboundQueueMessage | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.tenantId !== "string" || typeof raw.pairId !== "string") return null;
  if (typeof raw.sourceConnectorId !== "string" || typeof raw.targetConnectorId !== "string") {
    return null;
  }
  if (typeof raw.targetKind !== "string") return null;
  if (typeof raw.entityKind !== "string" || typeof raw.entityId !== "string") return null;
  return {
    tenantId: raw.tenantId,
    pairId: raw.pairId,
    sourceConnectorId: raw.sourceConnectorId,
    targetConnectorId: raw.targetConnectorId,
    targetKind: raw.targetKind,
    entityKind: raw.entityKind as EntityKind,
    entityId: raw.entityId,
    payload: raw.payload,
    attempts: typeof raw.attempts === "number" ? raw.attempts : undefined,
  };
}

export async function tryProcessWooOutboundMessage(
  sql: postgres.Sql,
  message: OutboundQueueMessage,
): Promise<boolean> {
  if (message.targetKind !== "woocommerce") {
    return false;
  }

  const mod = getConnector("woocommerce");
  if (!mod) {
    throw new Error("woocommerce connector missing");
  }

  const ctx = await loadWooWorkerContext(sql, {
    connectorId: message.targetConnectorId,
    tenantId: message.tenantId,
  });

  await runWithWooContextAsync(ctx, async () => {
    const ops = mod.entities[message.entityKind];
    if (!ops) {
      throw new Error(`Unsupported outbound entity: ${message.entityKind}`);
    }

    if (message.entityKind === "refund") {
      await ops.create(message.payload as never);
      return;
    }

    const existing = await ops.fetch(message.entityId);
    if (existing) {
      await ops.update(message.entityId, message.payload as never);
    } else {
      await ops.create(message.payload as never);
    }
  });

  await insertSyncLog({
    tenantId: message.tenantId,
    pairId: message.pairId,
    connectorId: message.targetConnectorId,
    direction: "outbound",
    entityKind: message.entityKind,
    entityId: message.entityId,
    status: "success",
    payload: { note: "woo_outbound" },
  });

  return true;
}
