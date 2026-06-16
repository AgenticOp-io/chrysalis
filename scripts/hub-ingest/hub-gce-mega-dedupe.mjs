#!/usr/bin/env node
/**
 * GCE mega-gate dedupe: skip nested smokes already covered by dedicated v106/v107 slices
 * or earlier hub phases. Opt-in via CHRYSALIS_GCE_MEGA_DEDUPE=1 (set by GCE mega scripts).
 */

export const GCE_MEGA_DEDUPE_SKIP = "gce-deferred-mega-dedupe";

/** @returns {boolean} */
export function isGceMegaDedupeEnabled() {
  if (process.env.CHRYSALIS_GCE_MEGA_DEDUPE === "0") return false;
  return process.env.CHRYSALIS_GCE_MEGA_DEDUPE === "1";
}

/**
 * @param {string} coveredBy — slice id or phase that already ran this work
 * @returns {{ ok: true, skip: string, coveredBy: string }}
 */
export function gceDeferredMegaDedupe(coveredBy) {
  return { ok: true, skip: GCE_MEGA_DEDUPE_SKIP, coveredBy };
}

/** Deferred smokes inside php-wedge when prior ultra slices / hub phases already ran them. */
export const PHP_WEDGE_GCE_DEFERRED = Object.freeze({
  nextjsVerify: "cwl-v106-php-nextjs-verify",
  oracleMicro: "cwl-v106-php-oracle-micro",
  nodeExpressOracle: "cwl-v106-oracle-standalone",
  gapsIngestClosure: "hub-cwl-authoring-vitest+hub-completion",
  gapsIngestStrict: "cwl-v106-slices+hub-gold-verify",
});
