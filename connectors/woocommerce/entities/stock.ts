import type { CanonicalStock } from "@/connectors/_contract/entities";
import type { EntityOps } from "@/connectors/_contract/v1";
import { getWooCtx } from "@/connectors/woocommerce/context";
import { readWooJson, wooGET, wooSend, withHttpLog } from "@/connectors/woocommerce/http";
import { normalizeWooProduct } from "@/connectors/woocommerce/normalize/product";
import { canonicalHash } from "@/lib/sync/canonicalHash";
import { markWritten } from "@/lib/sync/loopGuard";

async function applyStock(
  productId: string,
  patch: Partial<CanonicalStock>,
): Promise<CanonicalStock> {
  const ctx = getWooCtx();
  return withHttpLog(
    {
      tenantId: ctx.tenantId,
      connectorId: ctx.connectorId,
      direction: "outbound",
      entityKind: "stock",
      entityId: productId,
    },
    async () => {
      const res = await wooSend("PUT", `/products/${encodeURIComponent(productId)}`, {
        stock_quantity: patch.quantity,
        stock_status: patch.stockStatus,
        manage_stock: patch.manageStock,
      });
      const raw = await readWooJson(res);
      const p = normalizeWooProduct(raw);
      const out: CanonicalStock = {
        productId: p.id,
        quantity: p.stockQuantity ?? null,
        stockStatus: p.stockStatus,
        manageStock: p.manageStock,
      };
      await markWritten(ctx.sql, {
        connectorId: ctx.connectorId,
        entityKind: "stock",
        entityId: productId,
        hash: canonicalHash(out),
        defaultSuppressionMs: ctx.suppressionMs,
      });
      return out;
    },
  );
}

export const wooStockEntityOps: EntityOps<CanonicalStock> = {
  async fetch(id: string) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "stock",
        entityId: id,
      },
      async () => {
        const res = await wooGET(`/products/${encodeURIComponent(id)}`);
        const raw = await readWooJson(res);
        const p = normalizeWooProduct(raw);
        return {
          productId: p.id,
          quantity: p.stockQuantity ?? null,
          stockStatus: p.stockStatus,
          manageStock: p.manageStock,
        };
      },
    );
  },

  async create(payload: CanonicalStock) {
    return applyStock(payload.productId, payload);
  },

  async update(id: string, patch: Partial<CanonicalStock>) {
    const productId = patch.productId ?? id;
    return applyStock(productId, patch);
  },
};
