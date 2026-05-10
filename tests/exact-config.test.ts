import { describe, expect, it } from "vitest";

import {
  assertSandboxRegion,
  exactApiHost,
  exactAuthorizeUrl,
  exactTokenUrl,
} from "@/connectors/exact-online/config";

describe("exact-online config", () => {
  it("uses distinct hosts per region", () => {
    expect(exactApiHost("nl", "production")).toBe("start.exactonline.nl");
    expect(exactApiHost("uk", "production")).toBe("start.exactonline.co.uk");
    expect(exactApiHost("com", "production")).toBe("start.exactonline.com");
  });

  it("forces sandbox onto the NL stack", () => {
    expect(exactApiHost("nl", "sandbox")).toBe("start.exactonline.nl");
    expect(() => assertSandboxRegion("de")).toThrow(/sandbox/i);
  });

  it("builds OAuth URLs on the same host as the API", () => {
    expect(exactAuthorizeUrl("be", "production")).toBe("https://start.exactonline.be/api/oauth2/auth");
    expect(exactTokenUrl("be", "production")).toBe("https://start.exactonline.be/api/oauth2/token");
  });
});
