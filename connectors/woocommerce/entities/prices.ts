import type { CanonicalPrice } from "@/connectors/_contract/entities";
import type { EntityOps } from "@/connectors/_contract/v1";
import { getWooCtx } from "@/connectors/woocommerce/context";
import { readWooJson, wooGET, wooSend, withHttpLog } from "@/connectors/woocommerce/http";
import { normalizeWooProduct } from "@/connectors/woocommerce/normalize/product";
import { canonicalHash } from "@/lib/sync/canonicalHash";
import { markWritten } from "@/lib/sync/loopGuard";

async function applyPrice(productId: string, patch: Partial<CanonicalPrice>): Promise<CanonicalPrice> {
  const ctx = getWooCtx();
  return withHttpLog(
    {
      tenantId: ctx.tenantId,
      connectorId: ctx.connectorId,
      direction: "outbound",
      entityKind: "price",
      entityId: productId,
    },
    async () => {
      const res = await wooSend("PUT", `/products/${encodeURIComponent(productId)}`, {
        regular_price: patch.regularPrice,
        sale_price: patch.salePrice,
      });
      const raw = await readWooJson(res);
      const p = normalizeWooProduct(raw);
      const out: CanonicalPrice = {
        productId: p.id,
        regularPrice: p.regularPrice,
        salePrice: p.salePrice,
      };
      await markWritten(ctx.sql, {
        connectorId: ctx.connectorId,
        entityKind: "price",
        entityId: productId,
        hash: canonicalHash(out),
        defaultSuppressionMs: ctx.suppressionMs,
      });
      return out;
    },
  );
}

export const wooPriceEntityOps: EntityOps<CanonicalPrice> = {
  async fetch(id: string) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "price",
        entityId: id,
      },
      async () => {
        const res = await wooGET(`/products/${encodeURIComponent(id)}`);
        const raw = await readWooJson(res);
        const p = normalizeWooProduct(raw);
        return {
          productId: p.id,
          regularPrice: p.regularPrice,
          salePrice: p.salePrice,
        };
      },
    );
  },

  async create(payload: CanonicalPrice) {
    return applyPrice(payload.productId, payload);
  },

  async update(id: string, patch: Partial<CanonicalPrice>) {
    const productId = patch.productId ?? id;
    return applyPrice(productId, patch);
  },
};
