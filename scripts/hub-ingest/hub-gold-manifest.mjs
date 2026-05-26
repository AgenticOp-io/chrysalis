/**
 * Hub gold verification suites (structural + optional trace replay).
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @typedef {{ id: string, fixture: string, origin: string, emitTarget: "hono"|"fastify", structural: boolean, traceReplay: boolean }} HubGoldSuite */

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
    id: "python-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-literal"),
    origin: "python",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
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
