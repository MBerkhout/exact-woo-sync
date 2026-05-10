import { describe, expect, it } from "vitest";

import { woocommerceConnector } from "@/connectors/woocommerce";
import {
  getConnector,
  isContractCompatible,
  listRegisteredKinds,
} from "@/connectors/registry";
import { CONTRACT_VERSION } from "@/connectors/_contract/v1";

describe("connector registry", () => {
  it("lists woo + exact stubs", () => {
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
});
