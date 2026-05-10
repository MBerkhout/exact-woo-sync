import { NextResponse } from "next/server";

import { getAdminSql } from "@/lib/db/postgres";
import { PGMQ_QUEUES } from "@/queue/pgmq";

/** Short batch drain for inbound queue (Phase 1 stub worker). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sql = getAdminSql();
  const queue = PGMQ_QUEUES.inbound;
  const batch = await sql<
    { msg_id: bigint; message: unknown }[]
  >`
    SELECT msg_id, message FROM pgmq.read(${queue}, 30, 25)
  `;

  for (const row of batch) {
    const msgId = Number(row.msg_id);
    await sql`
      SELECT pgmq.delete(${queue}, ${msgId})
    `;
  }

  return NextResponse.json({ drained: batch.length });
}
