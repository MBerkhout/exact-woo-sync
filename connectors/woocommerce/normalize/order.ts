import type { CanonicalOrder } from "@/connectors/_contract/entities";

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

export function normalizeWooOrder(raw: unknown): CanonicalOrder {
  const o = asRecord(raw) ?? {};
  const itemsRaw = o.line_items;
  const lineItems = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) => {
        const li = asRecord(row) ?? {};
        return {
          id: strId(li.id) || undefined,
          productId: li.product_id != null ? strId(li.product_id) : null,
          variationId: li.variation_id != null ? strId(li.variation_id) : null,
          quantity: typeof li.quantity === "number" ? li.quantity : undefined,
          subtotal: typeof li.subtotal === "string" ? li.subtotal : undefined,
          total: typeof li.total === "string" ? li.total : undefined,
          sku: typeof li.sku === "string" ? li.sku : null,
        };
      })
    : undefined;

  return {
    id: strId(o.id),
    number: typeof o.number === "string" ? o.number : undefined,
    status: typeof o.status === "string" ? o.status : undefined,
    currency: typeof o.currency === "string" ? o.currency : undefined,
    total: typeof o.total === "string" ? o.total : undefined,
    dateCreated: typeof o.date_created === "string" ? o.date_created : undefined,
    dateModified: typeof o.date_modified === "string" ? o.date_modified : undefined,
    customerId: o.customer_id != null ? strId(o.customer_id) : null,
    lineItems,
  };
}
