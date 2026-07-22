#!/usr/bin/env node
/**
 * Deepen passes 63–72 — thin wrapper over harness + batches/n10g.mjs
 * Usage: node scripts/wisp/wisp-fidelity-deepen-n10g.mjs
 * Prefer: pnpm run hub:fidelity-deepen -- --batch n10g
 */
import { runDeepenBatch } from "./wisp-fidelity-deepen-harness.mjs";
import * as batch from "./wisp-fidelity-deepen-batches/n10g.mjs";

export const DEEPEN_N10G_KIND = batch.KIND;

export async function runFidelityDeepenN10g(opts = {}) {
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
  await runFidelityDeepenN10g();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10g")) main();
