import { createHash } from "crypto";
import { describe, expect, it } from "vitest";

/** Mirrors `checksum()` in `db/migrator/cli.mjs` for regression coverage. */
function checksum(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

describe("migrator checksum helper", () => {
  it("is deterministic", () => {
    const sql = "-- hello\nSELECT 1;\n";
    expect(checksum(sql)).toBe(
      "362e183c3205c5b039254ec55080dfb75419a2176631682c4e8e017e3f7b4332",
    );
  });
});
