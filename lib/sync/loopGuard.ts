import postgres from "postgres";

export interface LoopGuardInput {
  connectorId: string;
  entityKind: string;
  entityId: string;
  incomingHash?: string | null;
  defaultSuppressionMs?: number;
}

/** §7.3 loop prevention helpers backed by suppression_window + content_hashes. */
export async function shouldSkipLoop(
  sql: postgres.Sql,
  input: LoopGuardInput,
): Promise<boolean> {
  const untilRows = await sql<
    { until: string }[]
  >`
    SELECT until::text
    FROM public.suppression_window
    WHERE connector_id = ${input.connectorId}
      AND entity_kind = ${input.entityKind}
      AND entity_id = ${input.entityId}
  `;
  if (untilRows[0]) {
    const until = new Date(untilRows[0].until).getTime();
    if (until > Date.now()) return true;
  }

  if (input.incomingHash) {
    const hashRows = await sql<{ hash: string }[]>`
      SELECT hash
      FROM public.content_hashes
      WHERE connector_id = ${input.connectorId}
        AND entity_kind = ${input.entityKind}
        AND entity_id = ${input.entityId}
    `;
    if (hashRows[0]?.hash === input.incomingHash) return true;
  }

  return false;
}

export async function markWritten(
  sql: postgres.Sql,
  input: LoopGuardInput & { hash?: string | null },
): Promise<void> {
  const suppressionMs = input.defaultSuppressionMs ?? 60_000;
  const until = new Date(Date.now() + suppressionMs);
  await sql`
    INSERT INTO public.suppression_window (connector_id, entity_kind, entity_id, until)
    VALUES (${input.connectorId}, ${input.entityKind}, ${input.entityId}, ${until.toISOString()})
    ON CONFLICT (connector_id, entity_kind, entity_id)
    DO UPDATE SET until = EXCLUDED.until
  `;

  if (input.hash) {
    await sql`
      INSERT INTO public.content_hashes (connector_id, entity_kind, entity_id, hash)
      VALUES (${input.connectorId}, ${input.entityKind}, ${input.entityId}, ${input.hash})
      ON CONFLICT (connector_id, entity_kind, entity_id)
      DO UPDATE SET hash = EXCLUDED.hash, updated_at = now()
    `;
  }
}
