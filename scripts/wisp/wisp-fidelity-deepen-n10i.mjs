#!/usr/bin/env node
/**
 * Deepen passes 83–92 — thin wrapper over harness + batches/n10i.mjs
 * Prefer: pnpm run hub:fidelity-deepen -- --batch n10i
 */
import { runDeepenBatch } from "./wisp-fidelity-deepen-harness.mjs";
import * as batch from "./wisp-fidelity-deepen-batches/n10i.mjs";

export const DEEPEN_N10I_KIND = batch.KIND;

export async function runFidelityDeepenN10i(opts = {}) {
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
  await runFidelityDeepenN10i();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10i")) main();
