import { NextResponse } from "next/server";

import { getAdminSql } from "@/lib/db/postgres";
import {
  handleInboundFailure,
  parseInboundQueueMessage,
  processWooInboundMessage,
} from "@/lib/sync/workers/wooInbound";
import { parseOutboundQueueMessage, tryProcessWooOutboundMessage } from "@/lib/sync/workers/wooOutbound";
import { insertSyncLog } from "@/lib/logging/logger";
import { PGMQ_QUEUES } from "@/queue/pgmq";

/** Batch drain for inbound/outbound sync queues (Phase 2 Woo workers). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sql = getAdminSql();

  const inboundBatch = await sql<{ msg_id: bigint; message: unknown }[]>`
    SELECT msg_id, message FROM pgmq.read(${PGMQ_QUEUES.inbound}, 30, 25)
  `;

  let inboundProcessed = 0;
  for (const row of inboundBatch) {
    const msgId = Number(row.msg_id);
    const parsed = parseInboundQueueMessage(row.message);
    if (!parsed || parsed.platform !== "woocommerce") {
      continue;
    }
    try {
      await processWooInboundMessage(sql, parsed);
      await sql`
        SELECT pgmq.delete(${PGMQ_QUEUES.inbound}, ${msgId})
      `;
      inboundProcessed += 1;
    } catch (e) {
      await handleInboundFailure(sql, parsed, e);
      await sql`
        SELECT pgmq.delete(${PGMQ_QUEUES.inbound}, ${msgId})
      `;
    }
  }

  const outboundBatch = await sql<{ msg_id: bigint; message: unknown }[]>`
    SELECT msg_id, message FROM pgmq.read(${PGMQ_QUEUES.outbound}, 30, 25)
  `;

  let outboundProcessed = 0;
  for (const row of outboundBatch) {
    const msgId = Number(row.msg_id);
    const parsed = parseOutboundQueueMessage(row.message);
    if (!parsed) {
      continue;
    }
    try {
      const handled = await tryProcessWooOutboundMessage(sql, parsed);
      if (handled) {
        await sql`
          SELECT pgmq.delete(${PGMQ_QUEUES.outbound}, ${msgId})
        `;
        outboundProcessed += 1;
      }
    } catch (e) {
      await insertSyncLog({
        tenantId: parsed.tenantId,
        pairId: parsed.pairId,
        connectorId: parsed.targetConnectorId,
        direction: "outbound",
        entityKind: parsed.entityKind,
        entityId: parsed.entityId,
        status: "failed",
        error: e instanceof Error ? { message: e.message } : e,
      });
    }
  }

  return NextResponse.json({
    inboundDrained: inboundProcessed,
    outboundDrained: outboundProcessed,
    inboundPeeked: inboundBatch.length,
    outboundPeeked: outboundBatch.length,
  });
}
