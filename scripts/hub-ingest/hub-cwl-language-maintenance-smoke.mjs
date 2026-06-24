#!/usr/bin/env node
/** CWL language maintenance smoke (G6731) — default build queue for language depth. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runIrHelperLiftingB7EmptyInlineGate,
  runIrHelperLiftingB8IssetInlineGate,
  runIrHelperLiftingB9CountInlineGate,
  runIrHelperLiftingB10IsArrayInlineGate,
  runIrHelperLiftingB11IsStringInlineGate,
  runIrHelperLiftingB12AbsInlineGate,
  runIrHelperLiftingB13IsNumericInlineGate,
  runIrHelperLiftingB14NotInlineGate,
  runIrHelperLiftingB15IsIntInlineGate,
  runIrHelperLiftingB16IsBoolInlineGate,
  runIrHelperLiftingB17IsNullInlineGate,
  runIrHelperLiftingB18NegInlineGate,
  runIrHelperLiftingB19RoundInlineGate,
  runIrHelperLiftingB20FloorInlineGate,
  runIrHelperLiftingB21CeilInlineGate,
  runIrHelperLiftingB22StrtolowerInlineGate,
  runIrHelperLiftingB23StrtoupperInlineGate,
  runIrHelperLiftingB24HtmlspecialcharsInlineGate,
  runIrHelperLiftingB25Nl2brInlineGate,
  runIrHelperLiftingB26UrlencodeInlineGate,
  runIrHelperLiftingB27RawurlencodeInlineGate,
  runIrHelperLiftingB28UrldecodeInlineGate,
  runIrHelperLiftingB29RawurldecodeInlineGate,
  runIrHelperLiftingB30LtrimInlineGate,
  runIrHelperLiftingB31RtrimInlineGate,
  runIrHelperLiftingB32IsFloatInlineGate,
  runIrHelperLiftingB33IsObjectInlineGate,
  runIrHelperLiftingB34IsScalarInlineGate,
  runIrHelperLiftingB35Round2InlineGate,
  runIrHelperLiftingB36MaxInlineGate,
  runIrHelperLiftingB37MinInlineGate,
  runIrHelperLiftingB38SubstrInlineGate,
  runIrHelperLiftingB39StrposInlineGate,
  runIrHelperLiftingB40StriposInlineGate,
  runIrHelperLiftingB41StrrposInlineGate,
  runIrHelperLiftingB42StrriposInlineGate,
  runIrHelperLiftingB43StrContainsInlineGate,
  runIrHelperLiftingB44StrStartsWithInlineGate,
} from "./hub-cwl-fullstack-gates.mjs";
import { runCwlSurfaceTaxonomyDocGate } from "./hub-cwl-surface-taxonomy-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_LANGUAGE_MAINTENANCE_SMOKE_KIND = "chrysalis.cwl-language-maintenance-smoke";
export const CWL_LANGUAGE_MAINTENANCE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6732 — paused doc indexes CWL language maintenance gate. */
export function runCwlLanguageMaintenanceDocGate() {
  const path = join(scriptRoot, "docs/PAUSED-AND-MAINTENANCE.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-paused-and-maintenance-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6731") &&
    text.includes("hub:cwl-language-maintenance-smoke") &&
    text.includes("CWL language maintenance") &&
    text.includes("G6750") &&
    text.includes("G6760") &&
    text.includes("G6770") &&
    text.includes("G6780") &&
    text.includes("G6790") &&
    text.includes("G6800") &&
    text.includes("G6810") &&
    text.includes("G6820") &&
    text.includes("G6830") &&
    text.includes("G6840") &&
    text.includes("G6850") &&
    text.includes("G6860") &&
    text.includes("G6870") &&
    text.includes("G6880") &&
    text.includes("G6890") &&
    text.includes("G6900") &&
    text.includes("G6910") &&
    text.includes("G6920") &&
    text.includes("G6930") &&
    text.includes("G6940") &&
    text.includes("G6950") &&
    text.includes("G6960") &&
    text.includes("G6970") &&
    text.includes("G6980") &&
    text.includes("G6990") &&
    text.includes("G7000") &&
    text.includes("G7010") &&
    text.includes("G7020") &&
    text.includes("G7030") &&
    text.includes("G7040") &&
    text.includes("G7050") &&
    text.includes("G7060") &&
    text.includes("G7070") &&
    text.includes("G7080") &&
    text.includes("G7090") &&
    text.includes("G7091") &&
    text.includes("G7092") &&
    text.includes("isset") &&
    text.includes("count") &&
    text.includes("is_array") &&
    text.includes("is_string") &&
    text.includes("abs") &&
    text.includes("is_numeric") &&
    text.includes("logical !") &&
    text.includes("is_int") &&
    text.includes("is_bool") &&
    text.includes("is_null") &&
    text.includes("unary -") &&
    text.includes("round()") &&
    text.includes("floor()") &&
    text.includes("ceil()") &&
    text.includes("strtolower()") &&
    text.includes("strtoupper()") &&
    text.includes("htmlspecialchars()") &&
    text.includes("nl2br()") &&
    text.includes("urlencode()") &&
    text.includes("rawurlencode()") &&
    text.includes("urldecode()") &&
    text.includes("rawurldecode()") &&
    text.includes("ltrim()") &&
    text.includes("rtrim()") &&
    text.includes("is_float()") &&
    text.includes("is_object()") &&
    text.includes("is_scalar()") &&
    text.includes("max()") &&
    text.includes("min()") &&
    text.includes("substr()") &&
    text.includes("strpos()") &&
    text.includes("stripos()") &&
    text.includes("strrpos()") &&
    text.includes("strripos()") &&
    text.includes("str_contains()") &&
    text.includes("str_starts_with()");
  return { ok, languageMaintenanceDocOk: ok };
}

/** G6731 — CWL language maintenance composite. */
export async function runCwlLanguageMaintenanceGate(_opts = {}) {
  const doc = runCwlLanguageMaintenanceDocGate();
  const taxonomy = runCwlSurfaceTaxonomyDocGate();
  const b7 = runIrHelperLiftingB7EmptyInlineGate();
  const b8 = runIrHelperLiftingB8IssetInlineGate();
  const b9 = runIrHelperLiftingB9CountInlineGate();
  const b10 = runIrHelperLiftingB10IsArrayInlineGate();
  const b11 = runIrHelperLiftingB11IsStringInlineGate();
  const b12 = runIrHelperLiftingB12AbsInlineGate();
  const b13 = runIrHelperLiftingB13IsNumericInlineGate();
  const b14 = runIrHelperLiftingB14NotInlineGate();
  const b15 = runIrHelperLiftingB15IsIntInlineGate();
  const b16 = runIrHelperLiftingB16IsBoolInlineGate();
  const b17 = runIrHelperLiftingB17IsNullInlineGate();
  const b18 = runIrHelperLiftingB18NegInlineGate();
  const b19 = runIrHelperLiftingB19RoundInlineGate();
  const b20 = runIrHelperLiftingB20FloorInlineGate();
  const b21 = runIrHelperLiftingB21CeilInlineGate();
  const b22 = runIrHelperLiftingB22StrtolowerInlineGate();
  const b23 = runIrHelperLiftingB23StrtoupperInlineGate();
  const b24 = runIrHelperLiftingB24HtmlspecialcharsInlineGate();
  const b25 = runIrHelperLiftingB25Nl2brInlineGate();
  const b26 = runIrHelperLiftingB26UrlencodeInlineGate();
  const b27 = runIrHelperLiftingB27RawurlencodeInlineGate();
  const b28 = runIrHelperLiftingB28UrldecodeInlineGate();
  const b29 = runIrHelperLiftingB29RawurldecodeInlineGate();
  const b30 = runIrHelperLiftingB30LtrimInlineGate();
  const b31 = runIrHelperLiftingB31RtrimInlineGate();
  const b32 = runIrHelperLiftingB32IsFloatInlineGate();
  const b33 = runIrHelperLiftingB33IsObjectInlineGate();
  const b34 = runIrHelperLiftingB34IsScalarInlineGate();
  const b35 = runIrHelperLiftingB35Round2InlineGate();
  const b36 = runIrHelperLiftingB36MaxInlineGate();
  const b37 = runIrHelperLiftingB37MinInlineGate();
  const b38 = runIrHelperLiftingB38SubstrInlineGate();
  const b39 = runIrHelperLiftingB39StrposInlineGate();
  const b40 = runIrHelperLiftingB40StriposInlineGate();
  const b41 = runIrHelperLiftingB41StrrposInlineGate();
  const b42 = runIrHelperLiftingB42StrriposInlineGate();
  const b43 = runIrHelperLiftingB43StrContainsInlineGate();
  const b44 = runIrHelperLiftingB44StrStartsWithInlineGate();
  const ok =
    doc.ok === true &&
    taxonomy.ok === true &&
    b7.ok === true &&
    b8.ok === true &&
    b9.ok === true &&
    b10.ok === true &&
    b11.ok === true &&
    b12.ok === true &&
    b13.ok === true &&
    b14.ok === true &&
    b15.ok === true &&
    b16.ok === true &&
    b17.ok === true &&
    b18.ok === true &&
    b19.ok === true &&
    b20.ok === true &&
    b21.ok === true &&
    b22.ok === true &&
    b23.ok === true &&
    b24.ok === true &&
    b25.ok === true &&
    b26.ok === true &&
    b27.ok === true &&
    b28.ok === true &&
    b29.ok === true &&
    b30.ok === true &&
    b31.ok === true &&
    b32.ok === true &&
    b33.ok === true &&
    b34.ok === true &&
    b35.ok === true &&
    b36.ok === true &&
    b37.ok === true &&
    b38.ok === true &&
    b39.ok === true &&
    b40.ok === true &&
    b41.ok === true &&
    b42.ok === true &&
    b43.ok === true &&
    b44.ok === true;
  return {
    kind: CWL_LANGUAGE_MAINTENANCE_SMOKE_KIND,
    schemaVersion: CWL_LANGUAGE_MAINTENANCE_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    taxonomy,
    b7,
    b8,
    b9,
    b10,
    b11,
    b12,
    b13,
    b14,
    b15,
    b16,
    b17,
    b18,
    b19,
    b20,
    b21,
    b22,
    b23,
    b24,
    b25,
    b26,
    b27,
    b28,
    b29,
    b30,
    b31,
    b32,
    b33,
    b34,
    b35,
    b36,
    b37,
    b38,
    b39,
    b40,
    b41,
    b42,
    b43,
    b44,
    generatedAt: new Date().toISOString(),
  };
}

/** @param {Record<string, unknown>} [opts] */
export async function runCwlLanguageMaintenanceSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-language-maintenance");
  const t0 = progress.start("CWL language maintenance");
  const gate = await runCwlLanguageMaintenanceGate(opts);
  progress.end("CWL language maintenance", gate.ok === true, t0);
  return {
    kind: CWL_LANGUAGE_MAINTENANCE_SMOKE_KIND,
    schemaVersion: CWL_LANGUAGE_MAINTENANCE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlLanguageMaintenanceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-language-maintenance-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
