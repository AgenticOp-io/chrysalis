#!/usr/bin/env node
/** Phase 45 product supremacy complete — build slice + wave closes + closed regressions (G9185). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase45ProgramCloseGate } from "./hub-phase45-program-close-smoke.mjs";
import { runIrHelperProgramCloseGate } from "./hub-ir-helper-program-close-smoke.mjs";
import { runMigrationOsCloseSmoke } from "./hub-migration-os-close-smoke.mjs";

export const PHASE45_PROGRAM_COMPLETE_KIND = "chrysalis.phase45-program-complete-smoke";
export const PHASE45_PROGRAM_COMPLETE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runPhase45ProgramCompleteGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const close = await runPhase45ProgramCloseGate({ repoRoot });
  const irHelper = await runIrHelperProgramCloseGate({ repoRoot });
  const migrationOs = await runMigrationOsCloseSmoke({ repoRoot });
  const ok = close.ok === true && irHelper.ok === true && migrationOs.ok === true;
  return {
    kind: PHASE45_PROGRAM_COMPLETE_KIND,
    schemaVersion: PHASE45_PROGRAM_COMPLETE_SCHEMA_VERSION,
    ok,
    close,
    irHelper,
    migrationOs,
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase45ProgramCompleteSmoke(opts = {}) {
  const progress = createSmokeProgress("phase45-program-complete");
  const t0 = progress.start("Phase 45 product supremacy complete (G9185)");
  const gate = await runPhase45ProgramCompleteGate(opts);
  progress.end("Phase 45 product supremacy complete (G9185)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase45ProgramCompleteSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase45-program-complete-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
