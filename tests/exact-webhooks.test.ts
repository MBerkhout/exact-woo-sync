import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { exactOnlineConnector } from "@/connectors/exact-online";
import {
  normalizeExactWebhookPayload,
  verifyExactWebhookSignature,
} from "@/connectors/exact-online/webhooks";

function exactSampleBody(secret: string) {
  const contentJson = '{"Topic":"Items","ID":"abc"}';
  const hash = createHmac("sha256", secret).update(contentJson).digest("hex").toUpperCase();
  const raw = `{"Content":${contentJson},"HashCode":"${hash}"}`;
  return raw;
}

describe("exact-online webhooks", () => {
  it("verifies HMAC HashCode envelope", async () => {
    const secret = "unit-test";
    const raw = exactSampleBody(secret);
    await expect(verifyExactWebhookSignature({ rawBody: raw, secret })).resolves.toBe(true);
    await expect(
      verifyExactWebhookSignature({ rawBody: raw + " ", secret: "wrong" }),
    ).resolves.toBe(false);
  });

  it("normalizes known topics to entity kinds", () => {
    const parsed = JSON.parse(exactSampleBody("s"));
    const norm = normalizeExactWebhookPayload(parsed) as {
      entityKind: string | null;
      topic: string | null;
    };
    expect(norm.topic).toBe("Items");
    expect(norm.entityKind).toBe("product");
  });

  it("extracts delivery header preference order", () => {
    const h = new Headers();
    h.set("x-eolwh-delivery-id", "del-1");
    expect(exactOnlineConnector.webhooks.extractIdempotencyKey(h)).toBe("del-1");
  });
});
