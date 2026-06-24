#!/usr/bin/env node
/** IR Helper Program v1 close smoke (G7200) — standalone from CWL language. */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runIrHelperLiftingSmoke } from "./hub-ir-helper-lifting-smoke.mjs";
import { runIrHelperLiftingSemanticSmoke } from "./hub-ir-helper-lifting-semantic-smoke.mjs";
import { runIrHelperLiftingEmbedSmoke } from "./hub-ir-helper-lifting-embed-smoke.mjs";
import { runIrHelperLiftingFullPathSmoke } from "./hub-ir-helper-lifting-full-path-smoke.mjs";
import { runIrHelperLiftingReplayTwinSmoke } from "./hub-ir-helper-lifting-replay-twin-smoke.mjs";
import {
  runIrHelperProgramCoverageGate,
  runIrHelperProgramDocGate,
  runIrHelperProgramIdempotencyGate,
  runIrHelperProgramInlineVitestGate,
  writeIrHelperProgramCoverageArtifact,
} from "./ir-helper-program-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const IR_HELPER_PROGRAM_CLOSE_KIND = "chrysalis.ir-helper-program-close-smoke";
export const IR_HELPER_PROGRAM_CLOSE_SCHEMA_VERSION = 1;
export const IR_HELPER_PROGRAM_CLOSE_GATE = "G7200";

/** G7200 — IR Helper Program v1 composite close. */
export async function runIrHelperProgramCloseGate() {
  const doc = runIrHelperProgramDocGate();
  const coverage = await runIrHelperProgramCoverageGate();
  const inlineVitest = runIrHelperProgramInlineVitestGate();
  const idempotency = runIrHelperProgramIdempotencyGate();
  const coverageArtifact = await writeIrHelperProgramCoverageArtifact(
    join(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."), "fixtures/ci/ir-helper-program-coverage.json"),
  );
  const lift = runIrHelperLiftingSmoke();
  const semantic = runIrHelperLiftingSemanticSmoke();
  const embed = runIrHelperLiftingEmbedSmoke();
  const fullPath = runIrHelperLiftingFullPathSmoke();
  const replayTwin = await runIrHelperLiftingReplayTwinSmoke();

  const skipOk = (r) => r.ok === true || typeof r.skip === "string";

  const ok =
    doc.ok === true &&
    coverage.ok === true &&
    inlineVitest.ok === true &&
    idempotency.ok === true &&
    coverageArtifact.ok === true &&
    skipOk(lift) &&
    skipOk(semantic) &&
    skipOk(embed) &&
    skipOk(fullPath) &&
    replayTwin.ok === true;

  return {
    kind: IR_HELPER_PROGRAM_CLOSE_KIND,
    schemaVersion: IR_HELPER_PROGRAM_CLOSE_SCHEMA_VERSION,
    gate: IR_HELPER_PROGRAM_CLOSE_GATE,
    ok,
    doc,
    coverage,
    inlineVitest,
    idempotency,
    coverageArtifact,
    trackA: { lift, semantic, embed, fullPath },
    trackB: { replayTwin },
    programVersion: 1,
    inlineCalleeCount: coverage.expectedInlineCallees ?? null,
    generatedAt: new Date().toISOString(),
  };
}

export async function runIrHelperProgramCloseSmoke() {
  const progress = createSmokeProgress("ir-helper-program-close");
  const t0 = progress.start("IR Helper Program close (G7200)");
  const gate = await runIrHelperProgramCloseGate();
  progress.end("IR Helper Program close (G7200)", gate.ok === true, t0);
  return gate;
}

async function main() {
  const r = await runIrHelperProgramCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
