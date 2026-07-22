#!/usr/bin/env node
/** Deepen 203–212 — prefer: pnpm run hub:fidelity-deepen -- --batch n10u */
import { runDeepenBatch } from "./wisp-fidelity-deepen-harness.mjs";
import * as batch from "./wisp-fidelity-deepen-batches/n10u.mjs";

export const DEEPEN_N10U_KIND = batch.KIND;

export async function runFidelityDeepenN10u(opts = {}) {
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
  await runFidelityDeepenN10u();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10u")) main();
