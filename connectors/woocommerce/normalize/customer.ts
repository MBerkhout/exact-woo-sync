import type { CanonicalCustomer } from "@/connectors/_contract/entities";

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

export function normalizeWooCustomer(raw: unknown): CanonicalCustomer {
  const o = asRecord(raw) ?? {};
  return {
    id: strId(o.id),
    username: typeof o.username === "string" ? o.username : undefined,
    email: typeof o.email === "string" ? o.email : undefined,
    firstName: typeof o.first_name === "string" ? o.first_name : undefined,
    lastName: typeof o.last_name === "string" ? o.last_name : undefined,
  };
}
