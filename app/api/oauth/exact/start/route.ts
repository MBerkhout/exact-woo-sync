import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { assertSandboxRegion, type ExactEnv, type ExactRegion } from "@/connectors/exact-online/config";
import { buildExactAuthorizationUrl, loadExactOAuthConfigFromEnv } from "@/connectors/exact-online/oauth";
import { requireRole } from "@/lib/auth/requireRole";
import { requireUser } from "@/lib/auth/requireUser";
import { getAdminSql } from "@/lib/db/postgres";

function exactRedirectUri(): string {
  const base = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (!base?.trim()) throw new Error("APP_BASE_URL is not set");
  return `${base.replace(/\/$/, "")}/api/oauth/exact/callback`;
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { tenantId } = await requireRole("admin");

    const url = new URL(req.url);
    const connectorId = url.searchParams.get("connector_id");
    if (!connectorId) {
      return NextResponse.json({ error: "connector_id required" }, { status: 400 });
    }

    const sql = getAdminSql();
    const rows = await sql<
      { id: string; tenant_id: string; kind: string; config: Record<string, unknown> }[]
    >`
      SELECT id, tenant_id, kind, config
      FROM public.connectors
      WHERE id = ${connectorId}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || row.tenant_id !== tenantId) {
      return NextResponse.json({ error: "connector not found" }, { status: 404 });
    }
    if (row.kind !== "exact-online") {
      return NextResponse.json({ error: "invalid connector kind" }, { status: 400 });
    }

    const config = row.config ?? {};
    const region = config.region;
    const env = config.env;
    if (typeof region !== "string" || (env !== "production" && env !== "sandbox")) {
      return NextResponse.json(
        { error: "connector is missing region/env in config (complete the form first)" },
        { status: 400 },
      );
    }
    if (env === "sandbox") assertSandboxRegion(region as ExactRegion);

    const state = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO public.oauth_states (
        tenant_id,
        user_id,
        state,
        connector_id,
        region,
        env,
        expires_at
      ) VALUES (
        ${tenantId},
        ${user.id},
        ${state},
        ${connectorId},
        ${region},
        ${env},
        ${expiresAt}
      )
    `;

    const cfg = loadExactOAuthConfigFromEnv(region as ExactRegion, env as ExactEnv);
    const { url: authorize } = await buildExactAuthorizationUrl({
      cfg,
      redirectUri: exactRedirectUri(),
      state,
    });

    return NextResponse.redirect(authorize);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth start failed";
    if (msg === "Unauthorized" || msg === "Forbidden") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg === "No tenant membership") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
