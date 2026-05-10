import { describe, expect, it } from "vitest";

import { CONTRACT_VERSION } from "@/connectors/_contract/v1";
import { getConnector, isContractCompatible, listRegisteredKinds } from "@/connectors/registry";
import { woocommerceConnector } from "@/connectors/woocommerce";

describe("connector registry", () => {
  it("lists woo + exact", () => {
    expect(listRegisteredKinds().sort()).toEqual(["exact-online", "woocommerce"]);
  });

  it("loads woo connector compatible with core contract", () => {
    const c = getConnector("woocommerce");
    expect(c?.manifest.kind).toBe("woocommerce");
    expect(isContractCompatible(c!.manifest.contractVersion, CONTRACT_VERSION)).toBe(
      true,
    );
    expect(
      woocommerceConnector.webhooks.extractIdempotencyKey(
        new Headers({ "X-WC-Webhook-Delivery-ID": "abc123" }),
      ),
    ).toBe("abc123");
  });

  it("loads exact-online module at v1", () => {
    const c = getConnector("exact-online");
    expect(c?.manifest.kind).toBe("exact-online");
    expect(c?.manifest.moduleVersion).toBe("1.0.0");
    expect(isContractCompatible(c!.manifest.contractVersion, CONTRACT_VERSION)).toBe(true);
  });
});
