import { NextResponse } from "next/server";

import { exactOnlineConnector, exchangeExactOAuthCodeForSecrets } from "@/connectors/exact-online";
import { type ExactEnv, type ExactRegion } from "@/connectors/exact-online/config";
import { loadExactOAuthConfigFromEnv } from "@/connectors/exact-online/oauth";
import { encryptSecretJson } from "@/lib/crypto/secrets";
import { getAdminSql } from "@/lib/db/postgres";

function exactRedirectUri(): string {
  const base = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (!base?.trim()) throw new Error("APP_BASE_URL is not set");
  return `${base.replace(/\/$/, "")}/api/oauth/exact/callback`;
}

function appBaseUrl(): string {
  const base = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (!base?.trim()) throw new Error("APP_BASE_URL is not set");
  return base.replace(/\/$/, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(new URL(`/connectors?oauth_error=${encodeURIComponent(oauthError)}`, appBaseUrl()));
  }

  if (!code || !state) {
    return NextResponse.json({ error: "missing code or state" }, { status: 400 });
  }

  const sql = getAdminSql();

  const states = await sql<
    {
      tenant_id: string;
      connector_id: string;
      region: string;
      env: string;
      expires_at: string;
    }[]
  >`
    SELECT tenant_id, connector_id, region, env, expires_at
    FROM public.oauth_states
    WHERE state = ${state}
    LIMIT 1
  `;

  const st = states[0];
  if (!st) {
    return NextResponse.json({ error: "unknown or expired oauth state" }, { status: 400 });
  }

  if (Date.parse(st.expires_at) <= Date.now()) {
    await sql`DELETE FROM public.oauth_states WHERE state = ${state}`;
    return NextResponse.json({ error: "oauth state expired" }, { status: 400 });
  }

  const cfg = loadExactOAuthConfigFromEnv(st.region as ExactRegion, st.env as ExactEnv);
  const redirectUri = exactRedirectUri();

  let secrets: Awaited<ReturnType<typeof exchangeExactOAuthCodeForSecrets>>;
  try {
    secrets = await exchangeExactOAuthCodeForSecrets({ cfg, code, redirectUri });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token exchange failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const webhookSecret = process.env.EXACT_WEBHOOK_SECRET ?? "";
  if (!webhookSecret) {
    return NextResponse.json({ error: "EXACT_WEBHOOK_SECRET is not set" }, { status: 500 });
  }

  const encrypted = await encryptSecretJson(secrets);

  await sql.begin(async (tx) => {
    await tx`DELETE FROM public.oauth_states WHERE state = ${state}`;

    const inserted = await tx<{ id: string }[]>`
      INSERT INTO public.connector_secrets (tenant_id, connector_id, ciphertext, nonce)
      VALUES (
        ${st.tenant_id},
        ${st.connector_id},
        ${Buffer.from(encrypted.ciphertext)},
        ${Buffer.from(encrypted.nonce)}
      )
      ON CONFLICT (connector_id)
      DO UPDATE SET ciphertext = EXCLUDED.ciphertext,
                    nonce = EXCLUDED.nonce,
                    updated_at = now()
      RETURNING id
    `;

    const secretsRef = inserted[0]?.id ?? null;

    const cfgRows = await tx<{ config: Record<string, unknown> }[]>`
      SELECT config FROM public.connectors WHERE id = ${st.connector_id} LIMIT 1
    `;
    const prev = cfgRows[0]?.config ?? {};
    const nextConfig = {
      ...prev,
      region: st.region,
      env: st.env,
      division: secrets.division,
      webhookSecret,
    };

    await tx`
      UPDATE public.connectors
      SET secrets_ref = ${secretsRef},
          status = 'connected',
          version = ${exactOnlineConnector.manifest.moduleVersion},
          config = ${tx.json(nextConfig as never)}
      WHERE id = ${st.connector_id}
    `;
  });

  try {
    await exactOnlineConnector.connect({
      connectorId: st.connector_id,
      tenantId: st.tenant_id,
    });
  } catch {
    await sql`
      UPDATE public.connectors
      SET status = 'error'
      WHERE id = ${st.connector_id}
    `;
    return NextResponse.redirect(
      new URL(`/connectors/${st.connector_id}?oauth_error=webhook_provision`, appBaseUrl()),
    );
  }

  return NextResponse.redirect(new URL(`/connectors/${st.connector_id}`, appBaseUrl()));
}
