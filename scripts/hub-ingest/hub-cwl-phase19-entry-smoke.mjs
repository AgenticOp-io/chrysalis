#!/usr/bin/env node
/** Phase 19 program entry smoke (G7304). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlUniversalLanguageProgramEntryGate } from "./hub-cwl-universal-language-program-entry-smoke.mjs";
import { runCwlUiV1RfcDocGate } from "./hub-cwl-ui-v1-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE19_ENTRY_SMOKE_KIND = "chrysalis.cwl.phase19-entry-smoke";

export async function runCwlPhase19EntryGate(_opts = {}) {
  const program = await runCwlUniversalLanguageProgramEntryGate(_opts);
  const rfc = runCwlUiV1RfcDocGate();
  const ok = program.ok === true && rfc.ok === true;
  return { ok, program, rfc, generatedAt: new Date().toISOString() };
}

export async function runCwlPhase19EntrySmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase19-entry");
  const t0 = progress.start("CWL Phase 19 entry (G7304)");
  const gate = await runCwlPhase19EntryGate(opts);
  progress.end("CWL Phase 19 entry (G7304)", gate.ok === true, t0);
  return { kind: CWL_PHASE19_ENTRY_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase19EntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase19-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
