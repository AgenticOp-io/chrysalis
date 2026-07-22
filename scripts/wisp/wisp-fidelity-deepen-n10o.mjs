#!/usr/bin/env node
/** Deepen 143–152 — prefer: pnpm run hub:fidelity-deepen -- --batch n10o */
import { runDeepenBatch } from "./wisp-fidelity-deepen-harness.mjs";
import * as batch from "./wisp-fidelity-deepen-batches/n10o.mjs";

export const DEEPEN_N10O_KIND = batch.KIND;

export async function runFidelityDeepenN10o(opts = {}) {
  return runDeepenBatch({
    kind: batch.KIND,
    batchId: batch.BATCH_ID,
    passes: batch.PASSES,
    refreshPaths: batch.REFRESH_PATHS,
    needAdmin: batch.NEED_ADMIN,
    runProbes: batch.runProbes,
    note: batch.NOTE,
    opts,
  });
}

async function main() {
  await runFidelityDeepenN10o();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10o")) main();
