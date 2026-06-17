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
      "chrysalis_sql_param_literal",
      "chrysalis_sql_param_cast",
      "chrysalis_sql_param_coalesce",
      "chrysalis_sql_param_strval",
      "chrysalis_sql_param_cast_string",
      "chrysalis_sql_param_bool",
      "chrysalis_sql_param_float",
      "chrysalis_sql_param_trim",
      "chrysalis_sql_param_cast_float",
      "chrysalis_sql_param_cast_bool",
      "chrysalis_sql_param_cast_int",
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
    expect(dbQueries.length).toBeGreaterThanOrEqual(14);
  });

  it("prelude guard allows strlen skip but blocks sideeffect pre-return query", async () => {
    const mod = await ingestDirectory(FIXTURE);
    const bodies = mod.meta.helperBodies!;
    const prelude = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_prelude")!;
    expect(tryExtractInlineQuery(mod, prelude.bodyId, prelude.paramNames)).toBeDefined();
    const literal = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_literal")!;
    expect(tryExtractInlineQuery(mod, literal.bodyId, literal.paramNames)).toBeDefined();
    const cast = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_cast")!;
    expect(tryExtractInlineQuery(mod, cast.bodyId, cast.paramNames)).toBeDefined();
    const coalesce = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_coalesce")!;
    expect(tryExtractInlineQuery(mod, coalesce.bodyId, coalesce.paramNames)).toBeDefined();
    const strval = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strval")!;
    expect(tryExtractInlineQuery(mod, strval.bodyId, strval.paramNames)).toBeDefined();
    const castString = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_cast_string")!;
    expect(tryExtractInlineQuery(mod, castString.bodyId, castString.paramNames)).toBeDefined();
    const boolHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_bool")!;
    expect(tryExtractInlineQuery(mod, boolHelper.bodyId, boolHelper.paramNames)).toBeDefined();
    const floatHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_float")!;
    expect(tryExtractInlineQuery(mod, floatHelper.bodyId, floatHelper.paramNames)).toBeDefined();
    const trimHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_trim")!;
    expect(tryExtractInlineQuery(mod, trimHelper.bodyId, trimHelper.paramNames)).toBeDefined();
    const castFloat = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_cast_float")!;
    expect(tryExtractInlineQuery(mod, castFloat.bodyId, castFloat.paramNames)).toBeDefined();
    const castBool = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_cast_bool")!;
    expect(tryExtractInlineQuery(mod, castBool.bodyId, castBool.paramNames)).toBeDefined();
    const castInt = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_cast_int")!;
    expect(tryExtractInlineQuery(mod, castInt.bodyId, castInt.paramNames)).toBeDefined();
    const sideeffect = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_sideeffect")!;
    expect(tryExtractInlineQuery(mod, sideeffect.bodyId, sideeffect.paramNames)).toBeUndefined();
  });
});
