#!/usr/bin/env node
/** Deepen 133–142 — prefer: pnpm run hub:fidelity-deepen -- --batch n10n */
import { runDeepenBatch } from "./wisp-fidelity-deepen-harness.mjs";
import * as batch from "./wisp-fidelity-deepen-batches/n10n.mjs";

export const DEEPEN_N10N_KIND = batch.KIND;

export async function runFidelityDeepenN10n(opts = {}) {
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
  await runFidelityDeepenN10n();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10n")) main();
