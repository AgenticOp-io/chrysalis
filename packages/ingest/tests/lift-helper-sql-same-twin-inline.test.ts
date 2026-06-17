import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ingestDirectory } from "../src/index.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-sql-same-twin");

describe("ingest: lift-helper-sql-same-twin lib helper inlining (G2294)", () => {
  it("inlines zero-arg lib db.read helpers at route call sites", async () => {
    const mod = await ingestDirectory(FIXTURE, {
      liftSharedHelpers: true,
      liftSharedHelpersSemantic: true,
      dedupeStructuralSubgraphs: true,
    });
    const helperCalls = [...mod.nodes.values()].filter(
      (n) =>
        n.dialect === "data" &&
        n.op === "call" &&
        String(n.attrs.callee).startsWith("chrysalis_sql_same"),
    );
    expect(helperCalls).toEqual([]);
    const dbQueries = [...mod.nodes.values()].filter((n) => n.dialect === "effect" && n.op === "db.query");
    expect(dbQueries.length).toBeGreaterThanOrEqual(2);
  });
});
