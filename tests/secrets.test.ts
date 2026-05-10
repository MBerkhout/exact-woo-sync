import { describe, expect, it } from "vitest";

import { decryptSecretJson, encryptSecretJson } from "@/lib/crypto/secrets";

describe("connector secrets crypto", () => {
  it("round-trips json payloads", async () => {
    process.env.SECRETS_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const payload = { access_token: "secret-token", refresh_token: "r2" };
    const boxed = await encryptSecretJson(payload);
    const opened = await decryptSecretJson<typeof payload>(boxed);
    expect(opened).toEqual(payload);
  });
});
