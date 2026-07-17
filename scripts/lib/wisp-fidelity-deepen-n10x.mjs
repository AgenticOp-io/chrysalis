#!/usr/bin/env node
/** Deepen 233–242 — prefer: pnpm run hub:fidelity-deepen -- --batch n10x */
import { runDeepenBatch } from "./wisp-fidelity-deepen-harness.mjs";
import * as batch from "./wisp-fidelity-deepen-batches/n10x.mjs";

export const DEEPEN_N10X_KIND = batch.KIND;

export async function runFidelityDeepenN10x(opts = {}) {
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
  await runFidelityDeepenN10x();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10x")) main();
