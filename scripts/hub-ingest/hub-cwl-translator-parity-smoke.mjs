#!/usr/bin/env node
/** Universal translator parity smoke (G7503). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFullLanguageCharter } from "./hub-cwl-full-language-charter.mjs";
import { runProjectToCwlOracleGates } from "./hub-project-to-cwl-gates.mjs";
import { runProjectToCwlAllOrigins } from "./hub-project-to-cwl-all-origins.mjs";
import { runStrategicPlanMonth3ProjectToCwlGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_TRANSLATOR_PARITY_SMOKE_KIND = "chrysalis.cwl.translator-parity-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlTranslatorParityDocGate() {
  const path = join(scriptRoot, "docs/CWL-UNIVERSAL-TRANSLATOR-PARITY.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-translator-parity-doc" };
  const text = readFileSync(path, "utf8");
  const ok = text.includes("G7503") && text.includes("translator parity") && text.includes("D6265");
  return { ok, docOk: ok };
}

export async function runCwlTranslatorParityGate(opts = {}) {
  const doc = runCwlTranslatorParityDocGate();
  const loaded = loadFullLanguageCharter();
  if (!loaded.ok) {
    return { ok: false, doc, charter: loaded, generatedAt: new Date().toISOString() };
  }
  const charter = loaded.charter;
  const oracleFixtures = (charter.translatorOracleOrigins ?? []).map((o) => ({
    id: o.id,
    rel: o.rel,
    origin: o.origin,
    requireHoleFree: o.requireHoleFree !== false,
  }));
  const oracle = await runProjectToCwlOracleGates({ ...opts, fixtures: oracleFixtures });
  const allOrigins = await runProjectToCwlAllOrigins(opts);
  const skipRoundtrip =
    opts.skipRoundtrip === true || process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP === "1";
  const month3 = await runStrategicPlanMonth3ProjectToCwlGate({ ...opts, skipRoundtrip });
  const webIds = new Set(charter.translatorWebOriginIds ?? []);
  let webHoleFree = 0;
  let webTotal = 0;
  for (const [id, block] of Object.entries(allOrigins.exports ?? {})) {
    if (!webIds.has(id)) continue;
    const p = block.cwlProjection;
    if (!p) continue;
    webHoleFree += p.holeFree ?? 0;
    webTotal += p.total ?? 0;
  }
  const webNativeRatio = webTotal ? webHoleFree / webTotal : 0;
  const minWebRatio = charter.translatorWebOriginMinNativeRatio ?? 0.99;
  const webOriginOk = webTotal > 0 && webNativeRatio >= minWebRatio;
  const originCountOk = (allOrigins.originCount ?? 0) >= (charter.translatorAllOriginsMinCount ?? 24);

  const ok =
    doc.ok === true &&
    oracle.ok === true &&
    allOrigins.ok === true &&
    month3.ok === true &&
    webOriginOk &&
    originCountOk;

  return {
    kind: CWL_TRANSLATOR_PARITY_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    oracle,
    allOrigins: { ok: allOrigins.ok === true, originCount: allOrigins.originCount },
    month3,
    webNativeRatio,
    minWebRatio,
    webOriginOk,
    originCountOk,
    skipRoundtrip,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlTranslatorParitySmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-translator-parity");
  const t0 = progress.start("CWL translator parity (G7503)");
  const gate = await runCwlTranslatorParityGate(opts);
  progress.end("CWL translator parity (G7503)", gate.ok === true, t0);
  return { kind: CWL_TRANSLATOR_PARITY_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlTranslatorParitySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-translator-parity-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
