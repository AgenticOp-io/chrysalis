import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { IR_HELPER_INLINE_CALLEE_IDS, tryExtractInlineQuery, resolveHelperBodyEntry } from "@chrysalis/emit-shared";
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
      ...IR_HELPER_INLINE_CALLEE_IDS,
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
    expect(dbQueries.length).toBeGreaterThanOrEqual(77);
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
    const strposHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strpos")!;
    expect(tryExtractInlineQuery(mod, strposHelper.bodyId, strposHelper.paramNames)).toBeDefined();
    const striposHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_stripos")!;
    expect(tryExtractInlineQuery(mod, striposHelper.bodyId, striposHelper.paramNames)).toBeDefined();
    const strrposHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strrpos")!;
    expect(tryExtractInlineQuery(mod, strrposHelper.bodyId, strrposHelper.paramNames)).toBeDefined();
    const strriposHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strripos")!;
    expect(tryExtractInlineQuery(mod, strriposHelper.bodyId, strriposHelper.paramNames)).toBeDefined();
    const strContainsHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_str_contains")!;
    expect(tryExtractInlineQuery(mod, strContainsHelper.bodyId, strContainsHelper.paramNames)).toBeDefined();
    const strStartsWithHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_str_starts_with")!;
    expect(tryExtractInlineQuery(mod, strStartsWithHelper.bodyId, strStartsWithHelper.paramNames)).toBeDefined();
    const strEndsWithHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_str_ends_with")!;
    expect(tryExtractInlineQuery(mod, strEndsWithHelper.bodyId, strEndsWithHelper.paramNames)).toBeDefined();
    const substrCountHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_substr_count")!;
    expect(tryExtractInlineQuery(mod, substrCountHelper.bodyId, substrCountHelper.paramNames)).toBeDefined();
    const explodeHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_explode")!;
    expect(tryExtractInlineQuery(mod, explodeHelper.bodyId, explodeHelper.paramNames)).toBeDefined();
    const strcmpHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strcmp")!;
    expect(tryExtractInlineQuery(mod, strcmpHelper.bodyId, strcmpHelper.paramNames)).toBeDefined();
    const strcasecmpHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strcasecmp")!;
    expect(tryExtractInlineQuery(mod, strcasecmpHelper.bodyId, strcasecmpHelper.paramNames)).toBeDefined();
    const strncmpHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strncmp")!;
    expect(tryExtractInlineQuery(mod, strncmpHelper.bodyId, strncmpHelper.paramNames)).toBeDefined();
    const strncasecmpHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strncasecmp")!;
    expect(tryExtractInlineQuery(mod, strncasecmpHelper.bodyId, strncasecmpHelper.paramNames)).toBeDefined();
    const strrevHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strrev")!;
    expect(tryExtractInlineQuery(mod, strrevHelper.bodyId, strrevHelper.paramNames)).toBeDefined();
    const strRepeatHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_str_repeat")!;
    expect(tryExtractInlineQuery(mod, strRepeatHelper.bodyId, strRepeatHelper.paramNames)).toBeDefined();
    const strPadHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_str_pad")!;
    expect(tryExtractInlineQuery(mod, strPadHelper.bodyId, strPadHelper.paramNames)).toBeDefined();
    const castFloat = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_cast_float")!;
    expect(tryExtractInlineQuery(mod, castFloat.bodyId, castFloat.paramNames)).toBeDefined();
    const castBool = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_cast_bool")!;
    expect(tryExtractInlineQuery(mod, castBool.bodyId, castBool.paramNames)).toBeDefined();
    const castInt = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_cast_int")!;
    expect(tryExtractInlineQuery(mod, castInt.bodyId, castInt.paramNames)).toBeDefined();
    const str_replaceHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_str_replace")!;
    expect(tryExtractInlineQuery(mod, str_replaceHelper.bodyId, str_replaceHelper.paramNames)).toBeDefined();
    const str_ireplaceHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_str_ireplace")!;
    expect(tryExtractInlineQuery(mod, str_ireplaceHelper.bodyId, str_ireplaceHelper.paramNames)).toBeDefined();
    const ucfirstHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_ucfirst")!;
    expect(tryExtractInlineQuery(mod, ucfirstHelper.bodyId, ucfirstHelper.paramNames)).toBeDefined();
    const lcfirstHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_lcfirst")!;
    expect(tryExtractInlineQuery(mod, lcfirstHelper.bodyId, lcfirstHelper.paramNames)).toBeDefined();
    const ucwordsHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_ucwords")!;
    expect(tryExtractInlineQuery(mod, ucwordsHelper.bodyId, ucwordsHelper.paramNames)).toBeDefined();
    const strip_tagsHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strip_tags")!;
    expect(tryExtractInlineQuery(mod, strip_tagsHelper.bodyId, strip_tagsHelper.paramNames)).toBeDefined();
    const addslashesHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_addslashes")!;
    expect(tryExtractInlineQuery(mod, addslashesHelper.bodyId, addslashesHelper.paramNames)).toBeDefined();
    const stripslashesHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_stripslashes")!;
    expect(tryExtractInlineQuery(mod, stripslashesHelper.bodyId, stripslashesHelper.paramNames)).toBeDefined();
    const str_rot13Helper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_str_rot13")!;
    expect(tryExtractInlineQuery(mod, str_rot13Helper.bodyId, str_rot13Helper.paramNames)).toBeDefined();
    const str_word_countHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_str_word_count")!;
    expect(tryExtractInlineQuery(mod, str_word_countHelper.bodyId, str_word_countHelper.paramNames)).toBeDefined();
    const str_splitHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_str_split")!;
    expect(tryExtractInlineQuery(mod, str_splitHelper.bodyId, str_splitHelper.paramNames)).toBeDefined();
    const strcspnHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strcspn")!;
    expect(tryExtractInlineQuery(mod, strcspnHelper.bodyId, strcspnHelper.paramNames)).toBeDefined();
    const strspnHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strspn")!;
    expect(tryExtractInlineQuery(mod, strspnHelper.bodyId, strspnHelper.paramNames)).toBeDefined();
    const ltrim_charlistHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_ltrim_charlist")!;
    expect(tryExtractInlineQuery(mod, ltrim_charlistHelper.bodyId, ltrim_charlistHelper.paramNames)).toBeDefined();
    const rtrim_charlistHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_rtrim_charlist")!;
    expect(tryExtractInlineQuery(mod, rtrim_charlistHelper.bodyId, rtrim_charlistHelper.paramNames)).toBeDefined();
    const trim_charlistHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_trim_charlist")!;
    expect(tryExtractInlineQuery(mod, trim_charlistHelper.bodyId, trim_charlistHelper.paramNames)).toBeDefined();
    const wordwrapHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_wordwrap")!;
    expect(tryExtractInlineQuery(mod, wordwrapHelper.bodyId, wordwrapHelper.paramNames)).toBeDefined();
    const chunk_splitHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_chunk_split")!;
    expect(tryExtractInlineQuery(mod, chunk_splitHelper.bodyId, chunk_splitHelper.paramNames)).toBeDefined();
    const strtrHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_strtr")!;
    expect(tryExtractInlineQuery(mod, strtrHelper.bodyId, strtrHelper.paramNames)).toBeDefined();
    const htmlentitiesHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_htmlentities")!;
    expect(tryExtractInlineQuery(mod, htmlentitiesHelper.bodyId, htmlentitiesHelper.paramNames)).toBeDefined();
    const html_entity_decodeHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_html_entity_decode")!;
    expect(tryExtractInlineQuery(mod, html_entity_decodeHelper.bodyId, html_entity_decodeHelper.paramNames)).toBeDefined();
    const json_encodeHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_json_encode")!;
    expect(tryExtractInlineQuery(mod, json_encodeHelper.bodyId, json_encodeHelper.paramNames)).toBeDefined();
    const json_decodeHelper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_json_decode")!;
    expect(tryExtractInlineQuery(mod, json_decodeHelper.bodyId, json_decodeHelper.paramNames)).toBeDefined();
    const md5Helper = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_md5")!;
    expect(tryExtractInlineQuery(mod, md5Helper.bodyId, md5Helper.paramNames)).toBeDefined();
    const sideeffect = resolveHelperBodyEntry(bodies, "chrysalis_sql_param_sideeffect")!;
    expect(tryExtractInlineQuery(mod, sideeffect.bodyId, sideeffect.paramNames)).toBeUndefined();
  });
});
