import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { wooFetch, defaultWooRps, basicAuthHeader } from "@/connectors/woocommerce/http";
import { runWithWooContextAsync, type WooWorkerContext } from "@/connectors/woocommerce/context";
import type postgres from "postgres";

function mockCtx(): WooWorkerContext {
  return {
    sql: {} as postgres.Sql,
    tenantId: "t1",
    connectorId: "c1",
    baseUrl: "https://example.com",
    credentials: { consumerKey: "ck", consumerSecret: "cs" },
    rateLimitRps: 100,
    suppressionMs: 60_000,
  };
}

describe("woo http", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("sends Basic auth from context credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await runWithWooContextAsync(mockCtx(), async () => {
      await wooFetch(new Request("https://example.com/wp-json/wc/v3/products/1"));
    });

    expect(fetchMock).toHaveBeenCalled();
    const req = fetchMock.mock.calls[0]![0] as Request;
    const auth = req.headers.get("authorization");
    expect(auth).toBe(basicAuthHeader("ck", "cs"));
  });

  it("honors Retry-After on 429 before retrying", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("rate limited", { status: 429, headers: { "retry-after": "1" } }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await runWithWooContextAsync(mockCtx(), async () => {
      const p = wooFetch(new Request("https://example.com/x"));
      await vi.advanceTimersByTimeAsync(1100);
      await p;
    });

    expect(fetchMock.mock.calls.length).toBe(2);
  });
});

describe("defaultWooRps", () => {
  it("reads WOO_DEFAULT_RATE_LIMIT_RPS", () => {
    const prev = process.env.WOO_DEFAULT_RATE_LIMIT_RPS;
    process.env.WOO_DEFAULT_RATE_LIMIT_RPS = "7";
    expect(defaultWooRps()).toBe(7);
    if (prev === undefined) delete process.env.WOO_DEFAULT_RATE_LIMIT_RPS;
    else process.env.WOO_DEFAULT_RATE_LIMIT_RPS = prev;
  });
});
