#!/usr/bin/env node
/** Deepen 243–252 — prefer: pnpm run hub:fidelity-deepen -- --batch n10y */
import { runDeepenBatch } from "./wisp-fidelity-deepen-harness.mjs";
import * as batch from "./wisp-fidelity-deepen-batches/n10y.mjs";

export const DEEPEN_N10Y_KIND = batch.KIND;

export async function runFidelityDeepenN10y(opts = {}) {
  return runDeepenBatch({
    kind: batch.KIND,
    batchId: batch.BATCH_ID,
    passes: batch.PASSES,
    refreshPaths: batch.REFRESH_PATHS,
    needAdmin: batch.NEED_ADMIN,
    runProbes: batch.runProbes,
    note: [batch.NOTE, ...(batch.EXTERNAL_DEPS_NOTES || [])].join(" | "),
    opts,
  });
}

async function main() {
  await runFidelityDeepenN10y();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10y")) main();
