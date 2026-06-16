#!/usr/bin/env node
/** Verify standalone mega batch: playbooks + post-translate verify + node express oracle (G415). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerifyPlaybooksStandaloneSmoke } from "./hub-verify-playbooks-standalone-smoke.mjs";
import { runPostTranslateVerifyStandaloneSmoke } from "./hub-post-translate-verify-standalone-smoke.mjs";
import { runNodeExpressOracleStandaloneSmoke } from "./hub-node-express-oracle-standalone-smoke.mjs";
import { createSmokeProgress, runSmokeStep, smokeResultOk } from "./hub-smoke-progress.mjs";

export const HUB_VERIFY_STANDALONE_MEGA_BATCH_KIND = "chrysalis.hub.verify-standalone-mega-batch-smoke";
export const HUB_VERIFY_STANDALONE_MEGA_BATCH_SCHEMA_VERSION = 1;

/** @type {ReadonlyArray<{ id: string, label: string, run: () => Promise<{ ok?: boolean, skip?: unknown }> | { ok?: boolean } }>} */
export const VERIFY_STANDALONE_MEGA_SLICES = [
  { id: "verify-playbooks", label: "verify playbooks standalone", run: () => runVerifyPlaybooksStandaloneSmoke() },
  {
    id: "post-translate-verify",
    label: "post-translate verify standalone",
    run: () => runPostTranslateVerifyStandaloneSmoke(),
  },
  {
    id: "node-express-oracle",
    label: "node express oracle standalone",
    run: () => runNodeExpressOracleStandaloneSmoke(),
  },
];

export const VERIFY_STANDALONE_MEGA_SLICE_IDS = VERIFY_STANDALONE_MEGA_SLICES.map((s) => s.id);

/** @param {string} sliceId */
function findVerifyMegaSlice(sliceId) {
  const slice = VERIFY_STANDALONE_MEGA_SLICES.find((s) => s.id === sliceId);
  if (!slice) {
    throw new Error(
      `unknown verify-standalone-mega slice: ${sliceId} (expected one of ${VERIFY_STANDALONE_MEGA_SLICE_IDS.join(", ")})`,
    );
  }
  return slice;
}

/** Run one verify-standalone-mega sub-batch (GCE sub-phase). */
export async function runVerifyStandaloneMegaSubSmoke(sliceId) {
  const slice = findVerifyMegaSlice(sliceId);
  const result = await runSmokeStep(`verify-mega/${sliceId}`, slice.label, () => slice.run());
  return {
    kind: HUB_VERIFY_STANDALONE_MEGA_BATCH_KIND,
    schemaVersion: HUB_VERIFY_STANDALONE_MEGA_BATCH_SCHEMA_VERSION,
    ok: smokeResultOk(result),
    sliceId,
    label: slice.label,
    result,
    generatedAt: new Date().toISOString(),
  };
}

export async function runVerifyStandaloneMegaBatchSmoke(opts = {}) {
  const onlySlice = opts.onlySlice ?? process.env.CHRYSALIS_VERIFY_MEGA_SLICE ?? null;
  if (onlySlice) {
    return runVerifyStandaloneMegaSubSmoke(String(onlySlice));
  }

  const batch = createSmokeProgress("verify-mega");
  batch.info(`batch start (${VERIFY_STANDALONE_MEGA_SLICES.length} slices)`);

  const playbooks = await runSmokeStep("verify-mega/verify-playbooks", "verify playbooks", () =>
    runVerifyPlaybooksStandaloneSmoke(),
  );
  const postTranslateVerify = await runSmokeStep(
    "verify-mega/post-translate-verify",
    "post-translate verify",
    () => runPostTranslateVerifyStandaloneSmoke(),
  );
  const nodeExpressOracle = await runSmokeStep("verify-mega/node-express-oracle", "node express oracle", () =>
    runNodeExpressOracleStandaloneSmoke(),
  );

  batch.info("batch complete");

  return {
    kind: HUB_VERIFY_STANDALONE_MEGA_BATCH_KIND,
    schemaVersion: HUB_VERIFY_STANDALONE_MEGA_BATCH_SCHEMA_VERSION,
    ok: smokeResultOk(playbooks) && smokeResultOk(postTranslateVerify) && smokeResultOk(nodeExpressOracle),
    playbooks,
    postTranslateVerify,
    nodeExpressOracle,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runVerifyStandaloneMegaBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
