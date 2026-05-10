import type { CanonicalRefund } from "@/connectors/_contract/entities";

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

export function normalizeWooRefund(raw: unknown, orderId: string): CanonicalRefund {
  const o = asRecord(raw) ?? {};
  return {
    id: strId(o.id) || `${orderId}:refund`,
    orderId,
    amount: typeof o.amount === "string" ? o.amount : undefined,
    reason: typeof o.reason === "string" ? o.reason : null,
  };
}
