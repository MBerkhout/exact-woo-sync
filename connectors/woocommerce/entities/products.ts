import type { CanonicalProduct } from "@/connectors/_contract/entities";
import type { EntityOps } from "@/connectors/_contract/v1";
import { getWooCtx } from "@/connectors/woocommerce/context";
import { readWooJson, wooGET, wooSend, withHttpLog } from "@/connectors/woocommerce/http";
import { normalizeWooProduct } from "@/connectors/woocommerce/normalize/product";
import { canonicalHash } from "@/lib/sync/canonicalHash";
import { markWritten } from "@/lib/sync/loopGuard";

function bodyFromProduct(patch: Partial<CanonicalProduct>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (patch.name !== undefined) o.name = patch.name;
  if (patch.status !== undefined) o.status = patch.status;
  if (patch.sku !== undefined) o.sku = patch.sku;
  if (patch.regularPrice !== undefined) o.regular_price = patch.regularPrice;
  if (patch.salePrice !== undefined) o.sale_price = patch.salePrice;
  if (patch.stockQuantity !== undefined) o.stock_quantity = patch.stockQuantity;
  if (patch.manageStock !== undefined) o.manage_stock = patch.manageStock;
  if (patch.stockStatus !== undefined) o.stock_status = patch.stockStatus;
  return o;
}

export const wooProductEntityOps: EntityOps<CanonicalProduct> = {
  async fetch(id: string) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "product",
        entityId: id,
      },
      async () => {
        const res = await wooGET(`/products/${encodeURIComponent(id)}`);
        const raw = await readWooJson(res);
        return normalizeWooProduct(raw);
      },
    );
  },

  async create(payload: CanonicalProduct) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "product",
        entityId: payload.id || "new",
      },
      async () => {
        const res = await wooSend("POST", "/products", bodyFromProduct(payload));
        const raw = await readWooJson(res);
        const out = normalizeWooProduct(raw);
        await markWritten(ctx.sql, {
          connectorId: ctx.connectorId,
          entityKind: "product",
          entityId: out.id,
          hash: canonicalHash(out),
          defaultSuppressionMs: ctx.suppressionMs,
        });
        return out;
      },
    );
  },

  async update(id: string, patch: Partial<CanonicalProduct>) {
    const ctx = getWooCtx();
    return withHttpLog(
      {
        tenantId: ctx.tenantId,
        connectorId: ctx.connectorId,
        direction: "outbound",
        entityKind: "product",
        entityId: id,
      },
      async () => {
        const res = await wooSend(
          "PUT",
          `/products/${encodeURIComponent(id)}`,
          bodyFromProduct(patch),
        );
        const raw = await readWooJson(res);
        const out = normalizeWooProduct(raw);
        await markWritten(ctx.sql, {
          connectorId: ctx.connectorId,
          entityKind: "product",
          entityId: out.id,
          hash: canonicalHash(out),
          defaultSuppressionMs: ctx.suppressionMs,
        });
        return out;
      },
    );
  },
};
