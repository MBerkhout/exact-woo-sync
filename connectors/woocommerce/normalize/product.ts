import type { CanonicalProduct } from "@/connectors/_contract/entities";

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function strId(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.length) return v;
  return "";
}

export function normalizeWooProduct(raw: unknown): CanonicalProduct {
  const o = asRecord(raw) ?? {};
  return {
    id: strId(o.id),
    sku: typeof o.sku === "string" ? o.sku : undefined,
    name: typeof o.name === "string" ? o.name : undefined,
    status: typeof o.status === "string" ? o.status : undefined,
    type: typeof o.type === "string" ? o.type : undefined,
    regularPrice: typeof o.regular_price === "string" ? o.regular_price : undefined,
    salePrice: typeof o.sale_price === "string" ? o.sale_price : undefined,
    stockQuantity: typeof o.stock_quantity === "number" ? o.stock_quantity : null,
    stockStatus: typeof o.stock_status === "string" ? o.stock_status : undefined,
    manageStock: typeof o.manage_stock === "boolean" ? o.manage_stock : undefined,
    dateModified: typeof o.date_modified === "string" ? o.date_modified : undefined,
  };
}
