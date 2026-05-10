import type { EntityKind } from "@/connectors/_contract/v1";
import { getAdminSql } from "@/lib/db/postgres";
import { redactPayloadForEntityKind } from "@/lib/logging/redact";

export type SyncLogStatus = "success" | "retry" | "failed";

export function retentionExpiresAt(status: SyncLogStatus, now = new Date()): Date {
  const ms =
    status === "success"
      ? 48 * 60 * 60 * 1000 // 48h
      : 7 * 24 * 60 * 60 * 1000; // 7d
  return new Date(now.getTime() + ms);
}

export interface InsertSyncLogInput {
  tenantId: string;
  pairId?: string | null;
  connectorId?: string | null;
  direction: "inbound" | "outbound";
  entityKind?: EntityKind | string | null;
  entityId?: string | null;
  status: SyncLogStatus;
  httpStatus?: number | null;
  durationMs?: number | null;
  payload?: unknown;
  error?: unknown;
}

/** Writes a redacted row to sync_logs (service-role / DB credentials). */
export async function insertSyncLog(row: InsertSyncLogInput): Promise<void> {
  const sql = getAdminSql();
  const redacted = redactPayloadForEntityKind(row.entityKind ?? null, row.payload);
  const expiresAt = retentionExpiresAt(row.status);
  await sql`
    INSERT INTO public.sync_logs (
      tenant_id,
      pair_id,
      connector_id,
      direction,
      entity_kind,
      entity_id,
      status,
      http_status,
      duration_ms,
      redacted_payload,
      error,
      expires_at
    ) VALUES (
      ${row.tenantId},
      ${row.pairId ?? null},
      ${row.connectorId ?? null},
      ${row.direction},
      ${row.entityKind ?? null},
      ${row.entityId ?? null},
      ${row.status},
      ${row.httpStatus ?? null},
      ${row.durationMs ?? null},
      ${sql.json(redacted as never)},
      ${row.error != null ? sql.json(row.error as never) : null},
      ${expiresAt.toISOString()}
    )
  `;
}
