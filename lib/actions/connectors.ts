"use server";

import { createHmac } from "node:crypto";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getConnector } from "@/connectors/registry";
import { encryptSecretJson } from "@/lib/crypto/secrets";
import { getAdminSql } from "@/lib/db/postgres";
import { requireRole } from "@/lib/auth/requireRole";

const createConnectorSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

const saveWooCredentialsSchema = z.object({
  connectorId: z.string().uuid(),
  baseUrl: z
    .string()
    .min(1)
    .transform((s) => s.replace(/\/+$/, ""))
    .pipe(z.string().url()),
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
  webhookSecret: z.string().min(1),
});

export async function createWooConnector(formData: FormData) {
  const { tenantId } = await requireRole("admin");
  const parsed = createConnectorSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const sql = getAdminSql();
  const inserted = await sql<{ id: string }[]>`
    INSERT INTO public.connectors (tenant_id, kind, name, status)
    VALUES (${tenantId}, 'woocommerce', ${parsed.data.name}, 'inactive')
    RETURNING id
  `;
  const id = inserted[0]?.id;
  if (!id) throw new Error("failed to create connector");

  redirect(`/connectors/${id}`);
}

export async function saveWooCredentials(formData: FormData) {
  const { tenantId } = await requireRole("admin");
  const parsed = saveWooCredentialsSchema.safeParse({
    connectorId: formData.get("connectorId"),
    baseUrl: formData.get("baseUrl"),
    consumerKey: formData.get("consumerKey"),
    consumerSecret: formData.get("consumerSecret"),
    webhookSecret: formData.get("webhookSecret"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const { connectorId, baseUrl, consumerKey, consumerSecret, webhookSecret } = parsed.data;

  const sql = getAdminSql();
  const rows = await sql<{ id: string }[]>`
    SELECT id
    FROM public.connectors
    WHERE id = ${connectorId} AND tenant_id = ${tenantId}
    LIMIT 1
  `;
  if (!rows[0]) {
    throw new Error("connector not found");
  }

  const encrypted = await encryptSecretJson({
    consumerKey,
    consumerSecret,
  });

  await sql.begin(async (tx) => {
    const currentRows = await tx<{ config: unknown }[]>`
      SELECT config FROM public.connectors WHERE id = ${connectorId} FOR UPDATE
    `;
    const current =
      currentRows[0]?.config && typeof currentRows[0].config === "object"
        ? (currentRows[0].config as Record<string, unknown>)
        : {};
    const nextConfig = {
      ...current,
      baseUrl,
      webhookSecret,
    };

    await tx`
      INSERT INTO public.connector_secrets (tenant_id, connector_id, ciphertext, nonce)
      VALUES (
        ${tenantId},
        ${connectorId},
        ${Buffer.from(encrypted.ciphertext)},
        ${Buffer.from(encrypted.nonce)}
      )
      ON CONFLICT (connector_id)
      DO UPDATE SET ciphertext = EXCLUDED.ciphertext,
                    nonce = EXCLUDED.nonce,
                    updated_at = now()
    `;

    await tx`
      UPDATE public.connectors
      SET config = ${tx.json(nextConfig as never)},
          status = 'inactive'
      WHERE id = ${connectorId}
    `;
  });

  const mod = getConnector("woocommerce");
  if (!mod) throw new Error("Woo connector missing");
  const health = await mod.healthCheck({ connectorId, tenantId });

  await sql`
    UPDATE public.connectors
    SET status = ${health.ok ? "connected" : "error"}
    WHERE id = ${connectorId}
  `;

  if (!health.ok) {
    throw new Error(health.message);
  }
}

function publicAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

export async function triggerTestWooWebhook(connectorId: string) {
  const { tenantId } = await requireRole("admin");
  const sql = getAdminSql();

  const rows = await sql<{ config: unknown }[]>`
    SELECT config
    FROM public.connectors
    WHERE id = ${connectorId} AND tenant_id = ${tenantId} AND kind = 'woocommerce'
    LIMIT 1
  `;
  if (!rows[0]) {
    throw new Error("connector not found");
  }
  const cfg = rows[0].config as Record<string, unknown>;
  const webhookSecret =
    typeof cfg.webhookSecret === "string" ? cfg.webhookSecret : process.env.WEBHOOK_SIGNATURE_STUB_SECRET;
  if (!webhookSecret) {
    throw new Error("webhook secret not configured");
  }

  const body = {
    id: 999001,
    status: "processing",
    currency: "EUR",
    total: "10.00",
    number: "TEST-999001",
  };
  const raw = JSON.stringify(body);
  const sig = createHmac("sha256", webhookSecret).update(raw).digest("base64");

  const url = `${publicAppBaseUrl()}/api/webhooks/woocommerce/${connectorId}`;
  const deliveryId = `test-${Date.now()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-wc-webhook-signature": sig,
      "x-wc-webhook-topic": "order.updated",
      "x-wc-webhook-delivery-id": deliveryId,
    },
    body: raw,
  });

  if (res.status !== 202) {
    const text = await res.text();
    throw new Error(`webhook test failed: HTTP ${res.status} ${text}`);
  }

  return { ok: true as const, deliveryId };
}
