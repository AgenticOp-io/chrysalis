#!/usr/bin/env node
/** Deepen 123–132 — prefer: pnpm run hub:fidelity-deepen -- --batch n10m */
import { runDeepenBatch } from "./wisp-fidelity-deepen-harness.mjs";
import * as batch from "./wisp-fidelity-deepen-batches/n10m.mjs";

export const DEEPEN_N10M_KIND = batch.KIND;

export async function runFidelityDeepenN10m(opts = {}) {
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
  await runFidelityDeepenN10m();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10m")) main();
