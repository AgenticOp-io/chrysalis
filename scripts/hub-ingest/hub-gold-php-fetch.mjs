/**
 * Probe emitted PHP hub routers for trace replay.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { concreteProbePath, writeProbeRoutes } from "./hub-gold-probe-routes.mjs";

/**
 * @returns {string | null}
 */
export function resolveHubPhp() {
  for (const cmd of ["php", "php.exe"]) {
    const r = spawnSync(cmd, ["-v"], { encoding: "utf8" });
    if (r.status === 0 || r.stderr?.includes("PHP")) return cmd;
  }
  return null;
}

/**
 * @param {string} fixture
 * @param {Array<{ method: string, path: string }>} routes
 */
export async function writePhpProbeRoutes(fixture, routes) {
  return writeProbeRoutes(fixture, routes);
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function runPhpHubProbe(scriptRoot, fixture) {
  const php = resolveHubPhp();
  if (!php) {
    return { status: 1, stderr: "php-not-on-path", stdout: "" };
  }
  const probeScript = join(scriptRoot, "packages/oracle-php/probe_hub_php.php");
  return spawnSync(php, [probeScript, fixture], { cwd: scriptRoot, encoding: "utf8" });
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function createPhpHubInProcessFetch(scriptRoot, fixture) {
  /** @type {Map<string, { status: number, body: string, headers: Record<string, string> }> | null} */
  let cache = null;

  async function loadCache() {
    if (cache) return cache;
    const probe = runPhpHubProbe(scriptRoot, fixture);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "php probe failed");
    }
    const report = JSON.parse(probe.stdout.trim().split("\n").pop() ?? "{}");
    if (!report.ok) throw new Error(report.error ?? "php probe not ok");
    cache = new Map();
    for (const r of report.results ?? []) {
      cache.set(`${r.method} ${r.path}`, {
        status: r.status,
        body: r.body ?? "",
        headers: r.headers ?? {},
      });
    }
    return cache;
  }

  return async (url, init) => {
    const map = await loadCache();
    const u = new URL(url);
    const method = (init?.method ?? "GET").toUpperCase();
    const key = `${method} ${u.pathname}`;
    const hit = map.get(key);
    if (!hit) {
      return new Response(`not found: ${key}`, { status: 404 });
    }
    return new Response(hit.body, { status: hit.status, headers: hit.headers });
  };
}
