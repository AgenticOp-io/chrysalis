/**
 * Wave 7/8 — flagship outbound expansion (express / plain-php / symfony).
 * Secondary natives + asset outputs (structured body lowering closed Wave 8).
 */
import { join } from "node:path";
import { HUB_ASSET_GOLD_EMIT_TARGETS } from "./hub-gold-asset-emit.mjs";

/** @type {readonly { idPrefix: string, origin: string, fixture: string }[]} */
const FLAGSHIPS = [
  {
    idPrefix: "express-flagship",
    origin: "javascript",
    fixture: "fixtures/hub-flagship-express",
  },
  {
    idPrefix: "plain-php-flagship",
    origin: "php",
    fixture: "fixtures/hub-flagship-plain-php",
  },
  {
    idPrefix: "symfony-flagship",
    origin: "php",
    fixture: "fixtures/hub-flagship-symfony",
  },
];

const SECONDARY_NATIVES = ["rust", "kotlin", "scala", "swift"];

/**
 * @param {string} scriptRoot
 * @param {Array<{ id: string }>} priorSuites
 */
export function hubFlagshipOutboundSuites(scriptRoot, priorSuites = []) {
  const seen = new Set(priorSuites.map((s) => s.id));
  /** @type {Array<{ id: string, fixture: string, origin: string, emitTarget: string, structural: boolean, traceReplay: boolean }>} */
  const suites = [];

  function push(id, fixtureRel, origin, emitTarget) {
    if (seen.has(id)) return;
    if (origin === emitTarget) return;
    seen.add(id);
    suites.push({
      id,
      fixture: join(scriptRoot, fixtureRel),
      origin,
      emitTarget,
      structural: true,
      traceReplay: true,
    });
  }

  for (const f of FLAGSHIPS) {
    for (const out of SECONDARY_NATIVES) {
      push(`${f.idPrefix}-${out}-native`, f.fixture, f.origin, out);
    }
    for (const out of HUB_ASSET_GOLD_EMIT_TARGETS) {
      push(`${f.idPrefix}-asset-${out}`, f.fixture, f.origin, out);
    }
  }

  return suites;
}
