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
      "chrysalis_sql_param_strlen",
      "chrysalis_sql_param_empty",
      "chrysalis_sql_param_isset",
      "chrysalis_sql_param_count",
      "chrysalis_sql_param_is_array",
      "chrysalis_sql_param_is_string",
      "chrysalis_sql_param_abs",
      "chrysalis_sql_param_is_numeric",
      "chrysalis_sql_param_not",
      "chrysalis_sql_param_is_int",
      "chrysalis_sql_param_is_bool",
      "chrysalis_sql_param_is_null",
      "chrysalis_sql_param_neg",
      "chrysalis_sql_param_round",
      "chrysalis_sql_param_floor",
      "chrysalis_sql_param_ceil",
      "chrysalis_sql_param_strtolower",
      "chrysalis_sql_param_strtoupper",
      "chrysalis_sql_param_htmlspecialchars",
      "chrysalis_sql_param_nl2br",
      "chrysalis_sql_param_urlencode",
      "chrysalis_sql_param_rawurlencode",
      "chrysalis_sql_param_urldecode",
      "chrysalis_sql_param_rawurldecode",
      "chrysalis_sql_param_ltrim",
      "chrysalis_sql_param_rtrim",
      "chrysalis_sql_param_is_float",
      "chrysalis_sql_param_is_object",
      "chrysalis_sql_param_is_scalar",
      "chrysalis_sql_param_round2",
      "chrysalis_sql_param_max",
      "chrysalis_sql_param_min",
      "chrysalis_sql_param_substr",
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
    expect(dbQueries.length).toBeGreaterThanOrEqual(47);
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
    const strlenHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strlen")!;
    expect(tryExtractInlineQuery(mod, strlenHelper.bodyId, strlenHelper.paramNames)).toBeDefined();
    const emptyHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_empty")!;
    expect(tryExtractInlineQuery(mod, emptyHelper.bodyId, emptyHelper.paramNames)).toBeDefined();
    const issetHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_isset")!;
    expect(tryExtractInlineQuery(mod, issetHelper.bodyId, issetHelper.paramNames)).toBeDefined();
    const countHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_count")!;
    expect(tryExtractInlineQuery(mod, countHelper.bodyId, countHelper.paramNames)).toBeDefined();
    const isArrayHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_is_array")!;
    expect(tryExtractInlineQuery(mod, isArrayHelper.bodyId, isArrayHelper.paramNames)).toBeDefined();
    const isStringHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_is_string")!;
    expect(tryExtractInlineQuery(mod, isStringHelper.bodyId, isStringHelper.paramNames)).toBeDefined();
    const absHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_abs")!;
    expect(tryExtractInlineQuery(mod, absHelper.bodyId, absHelper.paramNames)).toBeDefined();
    const isNumericHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_is_numeric")!;
    expect(tryExtractInlineQuery(mod, isNumericHelper.bodyId, isNumericHelper.paramNames)).toBeDefined();
    const notHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_not")!;
    expect(tryExtractInlineQuery(mod, notHelper.bodyId, notHelper.paramNames)).toBeDefined();
    const isIntHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_is_int")!;
    expect(tryExtractInlineQuery(mod, isIntHelper.bodyId, isIntHelper.paramNames)).toBeDefined();
    const isBoolHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_is_bool")!;
    expect(tryExtractInlineQuery(mod, isBoolHelper.bodyId, isBoolHelper.paramNames)).toBeDefined();
    const isNullHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_is_null")!;
    expect(tryExtractInlineQuery(mod, isNullHelper.bodyId, isNullHelper.paramNames)).toBeDefined();
    const negHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_neg")!;
    expect(tryExtractInlineQuery(mod, negHelper.bodyId, negHelper.paramNames)).toBeDefined();
    const roundHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_round")!;
    expect(tryExtractInlineQuery(mod, roundHelper.bodyId, roundHelper.paramNames)).toBeDefined();
    const floorHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_floor")!;
    expect(tryExtractInlineQuery(mod, floorHelper.bodyId, floorHelper.paramNames)).toBeDefined();
    const ceilHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_ceil")!;
    expect(tryExtractInlineQuery(mod, ceilHelper.bodyId, ceilHelper.paramNames)).toBeDefined();
    const strtolowerHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strtolower")!;
    expect(tryExtractInlineQuery(mod, strtolowerHelper.bodyId, strtolowerHelper.paramNames)).toBeDefined();
    const strtoupperHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strtoupper")!;
    expect(tryExtractInlineQuery(mod, strtoupperHelper.bodyId, strtoupperHelper.paramNames)).toBeDefined();
    const htmlspecialcharsHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_htmlspecialchars")!;
    expect(tryExtractInlineQuery(mod, htmlspecialcharsHelper.bodyId, htmlspecialcharsHelper.paramNames)).toBeDefined();
    const nl2brHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_nl2br")!;
    expect(tryExtractInlineQuery(mod, nl2brHelper.bodyId, nl2brHelper.paramNames)).toBeDefined();
    const urlencodeHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_urlencode")!;
    expect(tryExtractInlineQuery(mod, urlencodeHelper.bodyId, urlencodeHelper.paramNames)).toBeDefined();
    const rawurlencodeHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_rawurlencode")!;
    expect(tryExtractInlineQuery(mod, rawurlencodeHelper.bodyId, rawurlencodeHelper.paramNames)).toBeDefined();
    const urldecodeHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_urldecode")!;
    expect(tryExtractInlineQuery(mod, urldecodeHelper.bodyId, urldecodeHelper.paramNames)).toBeDefined();
    const rawurldecodeHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_rawurldecode")!;
    expect(tryExtractInlineQuery(mod, rawurldecodeHelper.bodyId, rawurldecodeHelper.paramNames)).toBeDefined();
    const ltrimHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_ltrim")!;
    expect(tryExtractInlineQuery(mod, ltrimHelper.bodyId, ltrimHelper.paramNames)).toBeDefined();
    const rtrimHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_rtrim")!;
    expect(tryExtractInlineQuery(mod, rtrimHelper.bodyId, rtrimHelper.paramNames)).toBeDefined();
    const isFloatHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_is_float")!;
    expect(tryExtractInlineQuery(mod, isFloatHelper.bodyId, isFloatHelper.paramNames)).toBeDefined();
    const isObjectHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_is_object")!;
    expect(tryExtractInlineQuery(mod, isObjectHelper.bodyId, isObjectHelper.paramNames)).toBeDefined();
    const isScalarHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_is_scalar")!;
    expect(tryExtractInlineQuery(mod, isScalarHelper.bodyId, isScalarHelper.paramNames)).toBeDefined();
    const round2Helper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_round2")!;
    expect(tryExtractInlineQuery(mod, round2Helper.bodyId, round2Helper.paramNames)).toBeDefined();
    const maxHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_max")!;
    expect(tryExtractInlineQuery(mod, maxHelper.bodyId, maxHelper.paramNames)).toBeDefined();
    const minHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_min")!;
    expect(tryExtractInlineQuery(mod, minHelper.bodyId, minHelper.paramNames)).toBeDefined();
    const substrHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_substr")!;
    expect(tryExtractInlineQuery(mod, substrHelper.bodyId, substrHelper.paramNames)).toBeDefined();
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
