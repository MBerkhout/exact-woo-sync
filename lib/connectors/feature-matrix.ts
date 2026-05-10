import type { Connector, EntityKind } from "@/connectors/_contract/v1";

export type PairFeatureKey =
  | "orders"
  | "products"
  | "stock"
  | "prices"
  | "customers";

const ENTITY_MAP: Record<PairFeatureKey, EntityKind> = {
  orders: "order",
  products: "product",
  stock: "stock",
  prices: "price",
  customers: "customer",
};

/** Intersect declared capabilities for UI toggles (§8.3). */
export function pairFeatureSupport(
  source: Connector,
  target: Connector,
): Record<PairFeatureKey, boolean> {
  const support = {} as Record<PairFeatureKey, boolean>;

  (Object.keys(ENTITY_MAP) as PairFeatureKey[]).forEach((key) => {
    const entity = ENTITY_MAP[key];
    const sCap = source.manifest.capabilities.find((c) => c.entity === entity);
    const tCap = target.manifest.capabilities.find((c) => c.entity === entity);
    if (!sCap || !tCap) {
      support[key] = false;
      return;
    }
    const sDir = new Set(sCap.directions);
    const tDir = new Set(tCap.directions);
    support[key] =
      (sDir.has("outbound") && tDir.has("inbound")) ||
      (sDir.has("inbound") && tDir.has("outbound"));
  });

  return support;
}
