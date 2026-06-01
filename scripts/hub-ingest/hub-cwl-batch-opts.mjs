#!/usr/bin/env node
/**
 * Shared opts for full-stack CWL authoring batch chains (fast CI / full proof).
 */

/** @param {object} [opts] */
export function isFastChain(opts = {}) {
  return opts.fastChain === true || process.env.CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN === "1";
}

/**
 * When fast chain is on, skip re-running batches v2–v29 by using v30 graduation-only.
 * @param {object} opts
 * @param {number} priorBatchNumber
 */
export function resolvePriorBatchOpts(opts = {}, priorBatchNumber) {
  if (!isFastChain(opts)) {
    if (priorBatchNumber === 30 && opts.graduationOnly === true) {
      return { ...opts, graduationOnly: true };
    }
    return opts;
  }
  const next = { ...opts, fastChain: true };
  if (priorBatchNumber === 30) {
    next.graduationOnly = true;
  }
  return next;
}
