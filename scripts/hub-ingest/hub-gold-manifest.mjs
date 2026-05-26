/**
 * Hub gold verification suites (structural + optional trace replay).
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @typedef {"hono"|"fastify"|"cwl"} HubGoldEmitTarget */

/**
 * @typedef {{ id: string, fixture: string, origin: string, emitTarget: HubGoldEmitTarget, structural: boolean, traceReplay: boolean, roundTrip?: boolean }} HubGoldSuite
 */

/** @type {HubGoldSuite[]} */
export const HUB_GOLD_SUITES = [
  {
    id: "js-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-literal"),
    origin: "javascript",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-literal"),
    origin: "javascript",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ts-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-ts-literal"),
    origin: "typescript",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ts-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-ts-literal"),
    origin: "typescript",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-structured-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-structured"),
    origin: "javascript",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-structured-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-structured"),
    origin: "javascript",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-structured-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-structured"),
    origin: "javascript",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "js-middleware-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-middleware"),
    origin: "javascript",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-middleware-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-middleware"),
    origin: "javascript",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-literal"),
    origin: "python",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-literal"),
    origin: "python",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-structured-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-structured"),
    origin: "python",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-structured-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-structured"),
    origin: "python",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-structured-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-structured"),
    origin: "python",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "cwl-gold-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-cwl"),
    origin: "cwl",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "cwl-gold-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-cwl"),
    origin: "cwl",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "cwl-gold-roundtrip",
    fixture: join(scriptRoot, "fixtures/hub-gold-cwl"),
    origin: "cwl",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
    roundTrip: true,
  },
  {
    id: "js-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-literal"),
    origin: "javascript",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "ts-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-ts-literal"),
    origin: "typescript",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "python-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-literal"),
    origin: "python",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
];

/**
 * @param {string} [id]
 * @returns {HubGoldSuite[]}
 */
export function resolveGoldSuites(id) {
  if (!id) return HUB_GOLD_SUITES;
  const found = HUB_GOLD_SUITES.filter((s) => s.id === id);
  if (found.length === 0) throw new Error(`unknown hub gold suite: ${id}`);
  return found;
}

/** @returns {string[]} */
export function hubGoldStructuralSuiteIds() {
  return HUB_GOLD_SUITES.filter((s) => s.structural).map((s) => s.id);
}

/** @returns {string[]} */
export function hubGoldTraceReplaySuiteIds() {
  return HUB_GOLD_SUITES.filter((s) => s.traceReplay).map((s) => s.id);
}

/**
 * Map hub matrix languages to emit target for gold suite lookup.
 * @param {string} outputLang
 * @returns {HubGoldEmitTarget | null}
 */
export function hubGoldEmitTargetForOutput(outputLang) {
  if (outputLang === "hono" || outputLang === "fastify" || outputLang === "cwl") return outputLang;
  if (outputLang === "typescript") return "hono";
  return null;
}

/**
 * Gold CI suites that structurally cover an origin×output pair (when emit target matches).
 * @param {string} origin
 * @param {string} outputLang
 * @returns {HubGoldSuite[]}
 */
export function hubGoldSuitesForPair(origin, outputLang) {
  const emitTarget = hubGoldEmitTargetForOutput(outputLang);
  if (!emitTarget) return [];
  return HUB_GOLD_SUITES.filter(
    (s) => s.structural && s.origin === origin && s.emitTarget === emitTarget,
  );
}

/**
 * @param {string} origin
 * @param {string} outputLang
 */
export function buildHubGoldSuiteCoverage(origin, outputLang) {
  const suites = hubGoldSuitesForPair(origin, outputLang);
  return {
    origin,
    output: outputLang,
    emitTarget: hubGoldEmitTargetForOutput(outputLang),
    suiteIds: suites.map((s) => s.id),
    traceReplaySuiteIds: suites.filter((s) => s.traceReplay).map((s) => s.id),
    roundTripSuiteIds: suites.filter((s) => s.roundTrip).map((s) => s.id),
    suiteCount: suites.length,
  };
}
