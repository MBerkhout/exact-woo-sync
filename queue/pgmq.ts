import postgres from "postgres";

export const PGMQ_QUEUES = {
  inbound: "sync.inbound",
  outbound: "sync.outbound",
  fullsync: "sync.fullsync",
} as const;

export type PgmqQueueName = (typeof PGMQ_QUEUES)[keyof typeof PGMQ_QUEUES];

/** Thin typed wrapper over pgmq.send (Postgres side). */
export async function enqueueJson(
  sql: postgres.Sql,
  queue: PgmqQueueName,
  message: unknown,
): Promise<void> {
  await sql`
    SELECT pgmq.send(${queue}, ${sql.json(message as never)})
  `;
}
