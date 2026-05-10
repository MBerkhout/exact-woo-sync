import postgres from "postgres";

export interface IdempotentWebhookResult {
  duplicate: boolean;
}

/** Persist delivery id; duplicates return duplicate=true (§9). */
export async function recordWebhookDelivery(
  sql: postgres.Sql,
  connectorId: string,
  deliveryId: string,
): Promise<IdempotentWebhookResult> {
  const inserted = await sql<{ connector_id: string }[]>`
    INSERT INTO public.webhook_deliveries (connector_id, delivery_id)
    VALUES (${connectorId}, ${deliveryId})
    ON CONFLICT (connector_id, delivery_id) DO NOTHING
    RETURNING connector_id
  `;
  return { duplicate: inserted.length === 0 };
}
