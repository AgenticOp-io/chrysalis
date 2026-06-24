#!/usr/bin/env node
/** Mandatory inbound roundtrip smoke (G7603) — all origins → CWL with route parity. */
import { runProjectToCwlRoundtripSmoke } from "./hub-project-to-cwl-roundtrip-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_TRANSLATOR_ROUNDTRIP_MANDATORY_SMOKE_KIND =
  "chrysalis.cwl.translator-roundtrip-mandatory-smoke";

export async function runCwlTranslatorRoundtripMandatoryGate(_opts = {}) {
  const roundtrip = await runProjectToCwlRoundtripSmoke();
  return {
    kind: CWL_TRANSLATOR_ROUNDTRIP_MANDATORY_SMOKE_KIND,
    schemaVersion: 1,
    ok: roundtrip.ok === true,
    roundtrip,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlTranslatorRoundtripMandatorySmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-translator-roundtrip-mandatory");
  const t0 = progress.start("CWL translator roundtrip mandatory (G7603)");
  const gate = await runCwlTranslatorRoundtripMandatoryGate(opts);
  progress.end("CWL translator roundtrip mandatory (G7603)", gate.ok === true, t0);
  return {
    kind: CWL_TRANSLATOR_ROUNDTRIP_MANDATORY_SMOKE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runCwlTranslatorRoundtripMandatorySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-translator-roundtrip-mandatory-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
