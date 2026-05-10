"use server";

import { redirect } from "next/navigation";

import { exactOnlineConnector } from "@/connectors/exact-online";
import { requireRole } from "@/lib/auth/requireRole";
import { getAdminSql } from "@/lib/db/postgres";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

const REGIONS = new Set(["nl", "be", "de", "uk", "es", "fr", "com"]);

export async function startExactConnectorOAuth(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const region = String(formData.get("region") ?? "");
  const env = String(formData.get("env") ?? "");

  if (!name) throw new Error("Name is required");
  if (!REGIONS.has(region)) throw new Error("Invalid region");
  if (env !== "production" && env !== "sandbox") throw new Error("Invalid environment");
  if (env === "sandbox" && region !== "nl") {
    throw new Error("Sandbox is only available for the NL region");
  }

  const { tenantId } = await requireRole("admin");
  const admin = createSupabaseServiceRoleClient();

  const { data, error } = await admin
    .from("connectors")
    .insert({
      tenant_id: tenantId,
      kind: "exact-online",
      name,
      status: "pending_oauth",
      version: exactOnlineConnector.manifest.moduleVersion,
      config: { region, env },
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create connector");

  redirect(`/api/oauth/exact/start?connector_id=${data.id}`);
}

export async function disconnectExactConnector(formData: FormData) {
  const connectorId = String(formData.get("connectorId") ?? "").trim();
  if (!connectorId) throw new Error("connectorId is required");

  const { tenantId } = await requireRole("admin");
  const sql = getAdminSql();
  const rows = await sql<{ tenant_id: string; kind: string }[]>`
    SELECT tenant_id, kind
    FROM public.connectors
    WHERE id = ${connectorId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.tenant_id !== tenantId || row.kind !== "exact-online") {
    throw new Error("Connector not found");
  }

  await exactOnlineConnector.disconnect({ connectorId, tenantId });
  redirect("/connectors");
}
