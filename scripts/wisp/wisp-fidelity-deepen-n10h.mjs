#!/usr/bin/env node
/**
 * Deepen passes 73–82 — thin wrapper over harness + batches/n10h.mjs
 * Usage: node scripts/wisp/wisp-fidelity-deepen-n10h.mjs
 * Prefer: pnpm run hub:fidelity-deepen -- --batch n10h
 */
import { runDeepenBatch } from "./wisp-fidelity-deepen-harness.mjs";
import * as batch from "./wisp-fidelity-deepen-batches/n10h.mjs";

export const DEEPEN_N10H_KIND = batch.KIND;

export async function runFidelityDeepenN10h(opts = {}) {
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
  await runFidelityDeepenN10h();
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-n10h")) main();
