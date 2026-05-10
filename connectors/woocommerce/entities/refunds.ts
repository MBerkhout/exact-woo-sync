import type { CanonicalRefund } from "@/connectors/_contract/entities";
import type { EntityOps } from "@/connectors/_contract/v1";
import { getWooCtx } from "@/connectors/woocommerce/context";
import { readWooJson, wooGET, wooSend, withHttpLog } from "@/connectors/woocommerce/http";
import { normalizeWooRefund } from "@/connectors/woocommerce/normalize/refund";
import { canonicalHash } from "@/lib/sync/canonicalHash";
import { markWritten } from "@/lib/sync/loopGuard";

function parseRefundIds(rawId: string): { orderId: string; refundId: string } | null {
  const idx = rawId.indexOf(":");
  if (idx === -1) return null;
  const orderId = rawId.slice(0, idx);
  const refundId = rawId.slice(idx + 1);
  if (!orderId.length || !refundId.length) return null;
  return { orderId, refundId };
}

export const wooRefundEntityOps: EntityOps<CanonicalRefund> = {
  async fetch(rawId: string) {
    const ctx = getWooCtx();
    const ids = parseRefundIds(rawId);
    if (!ids) return null;
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "refund",
        entityId: rawId,
      },
      async () => {
        const res = await wooGET(
          `/orders/${encodeURIComponent(ids.orderId)}/refunds/${encodeURIComponent(ids.refundId)}`,
        );
        const raw = await readWooJson(res);
        return normalizeWooRefund(raw, ids.orderId);
      },
    );
  },

  async create(payload: CanonicalRefund) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "refund",
        entityId: payload.id,
      },
      async () => {
        const res = await wooSend("POST", `/orders/${encodeURIComponent(payload.orderId)}/refunds`, {
          amount: payload.amount ?? undefined,
          reason: payload.reason ?? "",
        });
        const raw = await readWooJson(res);
        const out = normalizeWooRefund(raw, payload.orderId);
        await markWritten(ctx.sql, {
          connectorId: ctx.connectorId,
          entityKind: "refund",
          entityId: out.id,
          hash: canonicalHash(out),
          defaultSuppressionMs: ctx.suppressionMs,
        });
        return out;
      },
    );
  },

  async update() {
    throw new Error("WooCommerce refunds are immutable via REST");
  },
};
