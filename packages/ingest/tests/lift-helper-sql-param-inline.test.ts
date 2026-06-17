import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ingestDirectory } from "../src/index.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-sql-param-inline");

describe("ingest: lift-helper-sql-param-inline (B5.5 v3)", () => {
  it("inlines one-arg lib db.read helpers at route call sites", async () => {
    const mod = await ingestDirectory(FIXTURE);
    const helperCalls = [...mod.nodes.values()].filter(
      (n) =>
        n.dialect === "data" &&
        n.op === "call" &&
        (String(n.attrs.callee).startsWith("chrysalis_sql_param") ||
          String(n.attrs.callee).startsWith("chrysalis_sql_param_local") ||
          String(n.attrs.callee).startsWith("chrysalis_sql_param_chain")),
    );
    expect(helperCalls).toEqual([]);
    const dbQueries = [...mod.nodes.values()].filter((n) => n.dialect === "effect" && n.op === "db.query");
    expect(dbQueries.length).toBeGreaterThanOrEqual(3);
  });
});
