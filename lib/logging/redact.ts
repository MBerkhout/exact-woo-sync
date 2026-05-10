import type { EntityKind } from "@/connectors/_contract/v1";

const DENY_KEYS = new Set(
  [
    "email",
    "billing_email",
    "phone",
    "billing_phone",
    "first_name",
    "last_name",
    "company",
    "address_1",
    "address_2",
    "city",
    "postcode",
    "state",
    "country",
    "name",
    "middle_name",
    "birth_date",
    "birthday",
    "vat_number",
    "vat",
    "iban",
    "bank_account",
    // Exact debtor-like fields
    "address_line_1",
    "address_line_2",
    "postcode",
    "city_name",
    "telephone",
    "mobile",
    "website",
    "notes",
  ].map((k) => k.toLowerCase()),
);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Recursively redact likely PII keys while keeping structural / ID fields. */
export function redactUnknownPayload(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => redactUnknownPayload(item));
  }
  if (!isPlainObject(input)) return input;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const lower = key.toLowerCase();
    if (DENY_KEYS.has(lower)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = redactUnknownPayload(value);
  }
  return out;
}

/** Narrow redaction presets per entity kind for logging (§2). */
export function redactPayloadForEntityKind(
  kind: EntityKind | string | null | undefined,
  payload: unknown,
): unknown {
  // Central hook for future allow/deny tuning per kind.
  void kind;
  return redactUnknownPayload(payload);
}
