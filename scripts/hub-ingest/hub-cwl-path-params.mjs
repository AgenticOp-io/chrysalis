/**
 * CWL path parameter extraction (RFC-0002).
 */
import { HUB_T } from "./hub-lift-webir-route.mjs";

const CWL_PATH_PARAM_RE = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

/**
 * Ordered unique `:name` segments from a CWL path template.
 * @param {string} path
 * @returns {string[]}
 */
export function extractPathParamsFromCwlPath(path) {
  /** @type {string[]} */
  const names = [];
  for (const m of path.matchAll(CWL_PATH_PARAM_RE)) {
    const n = m[1];
    if (!names.includes(n)) names.push(n);
  }
  return names;
}

/**
 * @param {string} path
 */
export function cwlPathParamsForWebir(path) {
  return extractPathParamsFromCwlPath(path).map((name) => ({ name, type: HUB_T.string }));
}
