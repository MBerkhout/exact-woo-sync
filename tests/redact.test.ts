import { describe, expect, it } from "vitest";

import { redactPayloadForEntityKind } from "@/lib/logging/redact";
import { retentionExpiresAt } from "@/lib/logging/logger";

describe("PII redaction", () => {
  it("redacts Woo-ish payloads while keeping ids", () => {
    const payload = {
      id: 555,
      billing: {
        email: "buyer@example.com",
        phone: "+31612345678",
      },
      line_items: [{ product_id: 12, sku: "SKU-1" }],
    };
    const out = redactPayloadForEntityKind("order", payload) as typeof payload;
    expect(out.id).toBe(555);
    expect(out.line_items[0]?.sku).toBe("SKU-1");
    expect(out.billing.email).toBe("[redacted]");
    expect(out.billing.phone).toBe("[redacted]");
  });
});

describe("retention helper", () => {
  it("uses 48h for success and 7d for failures", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    const ok = retentionExpiresAt("success", now);
    const bad = retentionExpiresAt("failed", now);
    expect(ok.toISOString()).toBe("2026-05-12T12:00:00.000Z");
    expect(bad.toISOString()).toBe("2026-05-17T12:00:00.000Z");
  });
});
