import type { CanonicalCustomer } from "@/connectors/_contract/entities";
import type { EntityOps } from "@/connectors/_contract/v1";
import { getWooCtx } from "@/connectors/woocommerce/context";
import { readWooJson, wooGET, wooSend, withHttpLog } from "@/connectors/woocommerce/http";
import { normalizeWooCustomer } from "@/connectors/woocommerce/normalize/customer";
import { canonicalHash } from "@/lib/sync/canonicalHash";
import { markWritten } from "@/lib/sync/loopGuard";

function bodyFromCustomer(patch: Partial<CanonicalCustomer>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (patch.email !== undefined) o.email = patch.email;
  if (patch.firstName !== undefined) o.first_name = patch.firstName;
  if (patch.lastName !== undefined) o.last_name = patch.lastName;
  return o;
}

export const wooCustomerEntityOps: EntityOps<CanonicalCustomer> = {
  async fetch(id: string) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "customer",
        entityId: id,
      },
      async () => {
        const res = await wooGET(`/customers/${encodeURIComponent(id)}`);
        const raw = await readWooJson(res);
        return normalizeWooCustomer(raw);
      },
    );
  },

  async create(payload: CanonicalCustomer) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "customer",
        entityId: payload.id,
      },
      async () => {
        const res = await wooSend("POST", "/customers", {
          email: payload.email,
          first_name: payload.firstName,
          last_name: payload.lastName,
          username: payload.username,
        });
        const raw = await readWooJson(res);
        const out = normalizeWooCustomer(raw);
        await markWritten(ctx.sql, {
          connectorId: ctx.connectorId,
          entityKind: "customer",
          entityId: out.id,
          hash: canonicalHash(out),
          defaultSuppressionMs: ctx.suppressionMs,
        });
        return out;
      },
    );
  },

  async update(id: string, patch: Partial<CanonicalCustomer>) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "customer",
        entityId: id,
      },
      async () => {
        const res = await wooSend("PUT", `/customers/${encodeURIComponent(id)}`, bodyFromCustomer(patch));
        const raw = await readWooJson(res);
        const out = normalizeWooCustomer(raw);
        await markWritten(ctx.sql, {
          connectorId: ctx.connectorId,
          entityKind: "customer",
          entityId: out.id,
          hash: canonicalHash(out),
          defaultSuppressionMs: ctx.suppressionMs,
        });
        return out;
      },
    );
  },
};
