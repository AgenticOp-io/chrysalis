import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { walk } from "@chrysalis/webir";
import { ingestDirectory } from "../src/index.js";

const FIXTURE = resolve(__dirname, "../../../fixtures/db-query-unknown-receiver-probe");

describe("ingest: untracked ->query receiver", () => {
  test("emits legacy:db-query-unknown-receiver (not effect.db.query)", async () => {
    const mod = await ingestDirectory(FIXTURE);
    const reasons: string[] = [];
    walk(mod, (n) => {
      if (n.dialect === "data" && n.op === "hole" && typeof n.attrs.reason === "string") {
        reasons.push(n.attrs.reason);
      }
    });
    expect(reasons.some((r) => r.includes("legacy:db-query-unknown-receiver"))).toBe(true);
  });
});
