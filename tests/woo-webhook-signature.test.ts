import { describe, expect, it } from "vitest";

import { woocommerceConnector } from "@/connectors/woocommerce";

describe("woo webhook signature", () => {
  const secret = "topsecret";
  const body = JSON.stringify({ id: 1 });

  it("accepts a valid HMAC-SHA256 base64 signature", async () => {
    const { createHmac } = await import("node:crypto");
    const sig = createHmac("sha256", secret).update(body).digest("base64");
    const ok = await woocommerceConnector.webhooks.verifySignature({
      rawBody: body,
      headers: new Headers({ "x-wc-webhook-signature": sig }),
      secret,
    });
    expect(ok).toBe(true);
  });

  it("rejects a missing header", async () => {
    const ok = await woocommerceConnector.webhooks.verifySignature({
      rawBody: body,
      headers: new Headers({}),
      secret,
    });
    expect(ok).toBe(false);
  });

  it("rejects a tampered body", async () => {
    const { createHmac } = await import("node:crypto");
    const sig = createHmac("sha256", secret).update(body).digest("base64");
    const ok = await woocommerceConnector.webhooks.verifySignature({
      rawBody: body.replace("1", "2"),
      headers: new Headers({ "x-wc-webhook-signature": sig }),
      secret,
    });
    expect(ok).toBe(false);
  });
});
