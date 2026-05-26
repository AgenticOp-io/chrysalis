/**
 * Hub gold verification suites (structural + optional trace replay).
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @typedef {"hono"|"fastify"|"cwl"} HubGoldEmitTarget */

/** @typedef {{ id: string, fixture: string, origin: string, emitTarget: HubGoldEmitTarget, structural: boolean, traceReplay: boolean, roundTrip?: boolean }} HubGoldSuite */

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
    id: "js-middleware-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-middleware"),
    origin: "javascript",
    emitTarget: "hono",
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
    id: "cwl-gold-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-cwl"),
    origin: "cwl",
    emitTarget: "hono",
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
