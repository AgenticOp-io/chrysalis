/** In-process gold + trace replay for flagship emit parity (G261). */
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";

const EMIT_TARGETS = ["hono", "fastify", "nextjs"];

/**
 * @param {string} suitePrefix e.g. plain-php-flagship or symfony-flagship
 */
export async function runFlagshipEmitParity(suitePrefix) {
  /** @type {Record<string, boolean>} */
  const gold = {};
  /** @type {Record<string, boolean>} */
  const traceReplay = {};
  let emitParityOk = true;

  for (const target of EMIT_TARGETS) {
    const suite = HUB_GOLD_SUITES.find((s) => s.id === `${suitePrefix}-${target}`);
    if (!suite) {
      gold[target] = false;
      traceReplay[target] = false;
      emitParityOk = false;
      continue;
    }
    const g = await runGoldVerifySuite(suite);
    gold[target] = g.ok === true;
    if (!g.ok) emitParityOk = false;

    if (suite.traceReplay) {
      try {
        const tr = await runTraceReplaySuite(suite);
        traceReplay[target] = tr.ok === true;
        if (!tr.ok) emitParityOk = false;
      } catch {
        traceReplay[target] = false;
        emitParityOk = false;
      }
    } else {
      traceReplay[target] = true;
    }
  }

  return { gold, traceReplay, emitParityOk, targets: EMIT_TARGETS };
}
