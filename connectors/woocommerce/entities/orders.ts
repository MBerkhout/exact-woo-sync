import type { CanonicalOrder } from "@/connectors/_contract/entities";
import type { EntityOps } from "@/connectors/_contract/v1";
import { getWooCtx } from "@/connectors/woocommerce/context";
import { readWooJson, wooGET, wooSend, withHttpLog } from "@/connectors/woocommerce/http";
import { normalizeWooOrder } from "@/connectors/woocommerce/normalize/order";
import { canonicalHash } from "@/lib/sync/canonicalHash";
import { markWritten } from "@/lib/sync/loopGuard";

function bodyFromOrder(patch: Partial<CanonicalOrder>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (patch.status !== undefined) o.status = patch.status;
  if (patch.currency !== undefined) o.currency = patch.currency;
  if (patch.customerId !== undefined) o.customer_id = patch.customerId ? Number(patch.customerId) : 0;
  if (patch.lineItems !== undefined) {
    o.line_items = patch.lineItems.map((li) => ({
      product_id: li.productId != null ? Number(li.productId) : undefined,
      variation_id: li.variationId != null ? Number(li.variationId) : undefined,
      quantity: li.quantity ?? 1,
    }));
  }
  return o;
}

function bodyFromCreate(order: CanonicalOrder): Record<string, unknown> {
  return {
    status: order.status ?? "pending",
    currency: order.currency,
    customer_id: order.customerId ? Number(order.customerId) : undefined,
    line_items: (order.lineItems ?? []).map((li) => ({
      product_id: li.productId != null ? Number(li.productId) : undefined,
      variation_id: li.variationId != null ? Number(li.variationId) : undefined,
      quantity: li.quantity ?? 1,
    })),
  };
}

export const wooOrderEntityOps: EntityOps<CanonicalOrder> = {
  async fetch(id: string) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "order",
        entityId: id,
      },
      async () => {
        const res = await wooGET(`/orders/${encodeURIComponent(id)}`);
        const raw = await readWooJson(res);
        return normalizeWooOrder(raw);
      },
    );
  },

  async create(payload: CanonicalOrder) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "order",
        entityId: payload.id || "new",
      },
      async () => {
        const res = await wooSend("POST", "/orders", bodyFromCreate(payload));
        const raw = await readWooJson(res);
        const out = normalizeWooOrder(raw);
        await markWritten(ctx.sql, {
          connectorId: ctx.connectorId,
          entityKind: "order",
          entityId: out.id,
          hash: canonicalHash(out),
          defaultSuppressionMs: ctx.suppressionMs,
        });
        return out;
      },
    );
  },

  async update(id: string, patch: Partial<CanonicalOrder>) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "order",
        entityId: id,
      },
      async () => {
        const res = await wooSend(
          "PUT",
          `/orders/${encodeURIComponent(id)}`,
          bodyFromOrder(patch),
        );
        const raw = await readWooJson(res);
        const out = normalizeWooOrder(raw);
        await markWritten(ctx.sql, {
          connectorId: ctx.connectorId,
          entityKind: "order",
          entityId: out.id,
          hash: canonicalHash(out),
          defaultSuppressionMs: ctx.suppressionMs,
        });
        return out;
      },
    );
  },
};
