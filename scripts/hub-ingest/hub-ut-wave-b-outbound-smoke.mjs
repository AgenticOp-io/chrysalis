#!/usr/bin/env node
/** G9974 — CWL outbound gold subordinate (G7602 / phase 26b). */
import { runCwlPhase26bCloseGate } from "./hub-cwl-phase26b-close-smoke.mjs";

export const UT_WAVE_B_OUTBOUND_KIND = "chrysalis.ut.wave-b-outbound-smoke";

export async function runUtWaveBOutboundGate(opts = {}) {
  const phase26b = await runCwlPhase26bCloseGate(opts);
  return {
    kind: UT_WAVE_B_OUTBOUND_KIND,
    schemaVersion: 1,
    gate: "G9974",
    ok: phase26b.ok === true,
    phase26b,
  };
}

async function main() {
  const gate = await runUtWaveBOutboundGate();
  console.log(JSON.stringify(gate, null, 2));
  process.exit(gate.ok ? 0 : 1);
}

if (process.argv[1]?.includes("hub-ut-wave-b-outbound-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
