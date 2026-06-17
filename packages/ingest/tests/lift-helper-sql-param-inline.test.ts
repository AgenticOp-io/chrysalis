import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tryExtractInlineQuery, resolveHelperBodyEntry } from "@chrysalis/emit-shared";
import { ingestDirectory } from "../src/index.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-sql-param-inline");

describe("ingest: lift-helper-sql-param-inline (B5.5 v3+)", () => {
  it("inlines one-arg lib db.read helpers at route call sites", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.meta.helperBodies?.chrysalis_sql_param_noinline).toBeDefined();
    const inlineCallees = new Set([
      "chrysalis_sql_param",
      "chrysalis_sql_param_local",
      "chrysalis_sql_param_chain",
      "chrysalis_sql_param_prelude",
    ]);
    const helperCalls = [...mod.nodes.values()].filter(
      (n) => n.dialect === "data" && n.op === "call" && inlineCallees.has(String(n.attrs.callee)),
    );
    expect(helperCalls).toEqual([]);
    const noinlineCalls = [...mod.nodes.values()].filter(
      (n) =>
        n.dialect === "data" &&
        n.op === "call" &&
        String(n.attrs.callee).startsWith("chrysalis_sql_param_noinline"),
    );
    expect(noinlineCalls.length).toBe(1);
    const sideeffectCalls = [...mod.nodes.values()].filter(
      (n) =>
        n.dialect === "data" &&
        n.op === "call" &&
        String(n.attrs.callee).startsWith("chrysalis_sql_param_sideeffect"),
    );
    expect(sideeffectCalls.length).toBe(1);
    const dbQueries = [...mod.nodes.values()].filter((n) => n.dialect === "effect" && n.op === "db.query");
    expect(dbQueries.length).toBeGreaterThanOrEqual(4);
  });

  it("prelude guard allows strlen skip but blocks sideeffect pre-return query", async () => {
    const mod = await ingestDirectory(FIXTURE);
    const bodies = mod.meta.helperBodies!;
    const prelude = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_prelude")!;
    expect(tryExtractInlineQuery(mod, prelude.bodyId, prelude.paramNames)).toBeDefined();
    const sideeffect = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_sideeffect")!;
    expect(tryExtractInlineQuery(mod, sideeffect.bodyId, sideeffect.paramNames)).toBeUndefined();
  });
});
