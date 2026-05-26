/**
 * Heuristic HTTP route detection for hub lift (Express/Fastify-style chains).
 * Emits explicit holes in handler bodies — not a full JS/TS parser.
 */

const ROUTE_CHAIN_RE =
  /(?:app|router|server|fastify)\.(get|post|put|delete|patch|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

/**
 * @param {string} source
 * @param {string} file
 * @returns {ReadonlyArray<{ method: string, path: string, file: string }>}
 */
export function detectHttpRoutesInSource(source, file) {
  const routes = [];
  const seen = new Set();
  let m;
  ROUTE_CHAIN_RE.lastIndex = 0;
  while ((m = ROUTE_CHAIN_RE.exec(source)) !== null) {
    const method = m[1].toUpperCase();
    const path = m[2];
    const key = `${method}:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({ method, path, file });
  }
  return routes;
}
