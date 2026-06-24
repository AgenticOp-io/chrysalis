#!/usr/bin/env node
/** Universal translator verify replay smoke (G7504). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlFullstackFlagshipSmoke } from "./hub-cwl-fullstack-flagship-smoke.mjs";
import { runCwlFullstackVerifyHttpSmoke } from "./hub-cwl-fullstack-verify-http-smoke.mjs";
import { runStrategicPlanMonth3ProjectToCwlGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_TRANSLATOR_VERIFY_SMOKE_KIND = "chrysalis.cwl.translator-verify-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlTranslatorVerifyDocGate() {
  const path = join(scriptRoot, "docs/CWL-UNIVERSAL-TRANSLATOR-PARITY.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-translator-parity-doc" };
  const text = readFileSync(path, "utf8");
  const ok = text.includes("Phase 25d") && text.includes("G7504") && text.includes("verify replay");
  return { ok, docOk: ok };
}

export async function runCwlTranslatorVerifyGate(opts = {}) {
  const doc = runCwlTranslatorVerifyDocGate();
  const skipGoldVerify =
    opts.skipGoldVerify === true || process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD === "1";
  const skipRoundtrip =
    opts.skipRoundtrip === true || process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP === "1";
  const flagship = await runCwlFullstackFlagshipSmoke({ ...opts, skipGoldVerify });
  const http = await runCwlFullstackVerifyHttpSmoke(opts);
  const month3 = await runStrategicPlanMonth3ProjectToCwlGate({ ...opts, skipRoundtrip });
  const ok = doc.ok === true && flagship.ok === true && http.ok === true && month3.ok === true;
  return {
    kind: CWL_TRANSLATOR_VERIFY_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    flagship,
    http,
    month3,
    skipGoldVerify,
    skipRoundtrip,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlTranslatorVerifySmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-translator-verify");
  const t0 = progress.start("CWL translator verify (G7504)");
  const gate = await runCwlTranslatorVerifyGate(opts);
  progress.end("CWL translator verify (G7504)", gate.ok === true, t0);
  return { kind: CWL_TRANSLATOR_VERIFY_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlTranslatorVerifySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-translator-verify-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
