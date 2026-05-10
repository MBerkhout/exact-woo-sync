import { describe, expect, it } from "vitest";

import { normalizeWooOrder } from "@/connectors/woocommerce/normalize/order";

describe("woo normalize order", () => {
  it("maps a Woo REST order payload to the canonical snapshot", () => {
    const fixture = {
      id: 241,
      number: "241",
      status: "processing",
      currency: "EUR",
      total: "18.00",
      customer_id: 12,
      date_created: "2026-05-10T12:34:56",
      date_modified: "2026-05-10T13:00:00",
      line_items: [
        {
          id: 1,
          product_id: 55,
          variation_id: 0,
          quantity: 2,
          subtotal: "10.00",
          total: "10.00",
          sku: "SKU-1",
        },
      ],
    };

    expect(normalizeWooOrder(fixture)).toMatchInlineSnapshot(`
      {
        "currency": "EUR",
        "customerId": "12",
        "dateCreated": "2026-05-10T12:34:56",
        "dateModified": "2026-05-10T13:00:00",
        "id": "241",
        "lineItems": [
          {
            "id": "1",
            "productId": "55",
            "quantity": 2,
            "sku": "SKU-1",
            "subtotal": "10.00",
            "total": "10.00",
            "variationId": "0",
          },
        ],
        "number": "241",
        "status": "processing",
        "total": "18.00",
      }
    `);
  });
});
