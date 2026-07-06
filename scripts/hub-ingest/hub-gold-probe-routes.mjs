/**
 * Shared probe route spec writer for native trace replay.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * @param {string} path
 */
export function concreteProbePath(path) {
  return path
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "1")
    .replace(/\{([a-zA-Z0-9_]+)\}/g, "1")
    .replace(/<([a-zA-Z_][a-zA-Z0-9_]*)>/g, "1");
}

/**
 * @param {Array<{ method: string, path: string }>} routes
 */
export function dedupeProbeRoutes(routes) {
  const seen = new Set();
  /** @type {Array<{ method: string, path: string }>} */
  const out = [];
  for (const route of routes) {
    const method = String(route.method ?? "GET").toUpperCase();
    const key = `${method} ${route.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ method, path: route.path });
  }
  return out;
}

/**
 * @param {string} fixture
 * @param {Array<{ method: string, path: string }>} routes
 */
export async function writeProbeRoutes(fixture, routes) {
  const deduped = dedupeProbeRoutes(routes);
  const probeSpecPath = join(fixture, "chrysalis.oracle-probe-routes.json");
  await mkdir(dirname(probeSpecPath), { recursive: true });
  await writeFile(probeSpecPath, `${JSON.stringify({ routes: deduped }, null, 2)}\n`, "utf8");
  return probeSpecPath;
}
