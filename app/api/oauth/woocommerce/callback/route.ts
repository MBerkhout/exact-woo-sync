import { NextResponse } from "next/server";

import { encryptSecretJson } from "@/lib/crypto/secrets";
import { getAdminSql } from "@/lib/db/postgres";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const connectorId = url.searchParams.get("connector_id");
  const code = url.searchParams.get("code") ?? "stub";
  if (!connectorId) {
    return NextResponse.json({ error: "missing connector_id" }, { status: 400 });
  }

  const sql = getAdminSql();

  const rows = await sql<{ tenant_id: string }[]>`
    SELECT tenant_id FROM public.connectors WHERE id = ${connectorId} LIMIT 1
  `;
  if (!rows[0]) {
    return NextResponse.json({ error: "connector not found" }, { status: 404 });
  }

  const encrypted = await encryptSecretJson({
    oauth: "woocommerce",
    code,
    stub: true,
    receivedAt: new Date().toISOString(),
  });

  await sql.begin(async (tx) => {
    const inserted = await tx<{ id: string }[]>`
      INSERT INTO public.connector_secrets (tenant_id, connector_id, ciphertext, nonce)
      VALUES (
        ${rows[0].tenant_id},
        ${connectorId},
        ${Buffer.from(encrypted.ciphertext)},
        ${Buffer.from(encrypted.nonce)}
      )
      ON CONFLICT (connector_id)
      DO UPDATE SET ciphertext = EXCLUDED.ciphertext,
                    nonce = EXCLUDED.nonce,
                    updated_at = now()
      RETURNING id
    `;

    await tx`
      UPDATE public.connectors
      SET secrets_ref = ${inserted[0]?.id ?? null}, status = 'connected'
      WHERE id = ${connectorId}
    `;
  });

  return NextResponse.redirect(new URL("/connectors", req.url));
}
