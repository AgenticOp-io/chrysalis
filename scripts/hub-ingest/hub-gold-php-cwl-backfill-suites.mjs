/**
 * Generated hub gold suites — php/cwl origin backfill (26 pairs).
 */
import { join } from "node:path";
import { HUB_ASSET_GOLD_EMIT_TARGETS } from "./hub-gold-asset-emit.mjs";

/** @type {readonly string[]} */
const BACKFILL_ORIGINS = ["php", "cwl"];

/** @type {readonly string[]} */
const BACKFILL_NATIVE_OUTPUTS = ["rust", "kotlin", "scala"];

/** @type {Readonly<Record<string, string>>} */
const ORIGIN_FIXTURE = {
  php: "fixtures/hub-flagship-plain-php",
  cwl: "fixtures/hub-gold-cwl",
};

/**
 * @param {string} scriptRoot
 */
export function hubPhpCwlBackfillSuites(scriptRoot) {
  /** @type {Array<{ id: string, fixture: string, origin: string, emitTarget: string, structural: boolean, traceReplay: boolean }>} */
  const suites = [];
  for (const origin of BACKFILL_ORIGINS) {
    const rel = ORIGIN_FIXTURE[origin];
    if (!rel) continue;
    const fixture = join(scriptRoot, rel);
    for (const output of HUB_ASSET_GOLD_EMIT_TARGETS) {
      suites.push({
        id: `${origin}-asset-${output}`,
        fixture,
        origin,
        emitTarget: output,
        structural: true,
        traceReplay: true,
      });
    }
    for (const output of BACKFILL_NATIVE_OUTPUTS) {
      suites.push({
        id: `${origin}-literal-${output}-native`,
        fixture,
        origin,
        emitTarget: output,
        structural: true,
        traceReplay: true,
      });
    }
  }
  return suites;
}
