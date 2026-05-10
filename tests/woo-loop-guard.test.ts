import type { Sql } from "postgres";
import { describe, expect, it } from "vitest";

import { markWritten, shouldSkipLoop } from "@/lib/sync/loopGuard";

function createRecordingSql(): { sql: Sql; getLastUntil: () => string | null } {
  let until: string | null = null;

  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? "?" : ""), "");

    if (text.includes("FROM public.suppression_window") && text.includes("SELECT")) {
      return until ? [{ until }] : [];
    }
    if (text.includes("FROM public.content_hashes") && text.includes("SELECT")) {
      return [];
    }
    if (text.includes("INSERT INTO public.suppression_window")) {
      until = String(values[3]);
    }
    return [];
  }) as unknown as Sql;

  return {
    sql,
    getLastUntil: () => until,
  };
}

describe("loop guard with outbound markWritten", () => {
  it("suppresses inbound work while the suppression window is active", async () => {
    const { sql, getLastUntil } = createRecordingSql();

    await markWritten(sql, {
      connectorId: "c1",
      entityKind: "product",
      entityId: "55",
      hash: "abc",
      defaultSuppressionMs: 60_000,
    });

    expect(getLastUntil()).toBeTruthy();

    const skip = await shouldSkipLoop(sql, {
      connectorId: "c1",
      entityKind: "product",
      entityId: "55",
      incomingHash: "different-hash",
    });

    expect(skip).toBe(true);
  });
});
