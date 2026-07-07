/**
 * Probe emitted asset hub manifests (oracle-asset).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { concreteProbePath, writeProbeRoutes } from "./hub-gold-probe-routes.mjs";

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 * @param {string} output
 */
export function runAssetManifestProbe(scriptRoot, fixture, output) {
  const manifestPath = join(fixture, "generated", output, "chrysalis.hub-route-manifest.json");
  if (!existsSync(manifestPath)) {
    return { status: 1, stderr: "missing-route-manifest", stdout: "" };
  }
  const probeScript = join(scriptRoot, "packages/oracle-asset/probe-manifest.mjs");
  return spawnSync(process.execPath, [probeScript, fixture, output], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 * @param {string} output
 */
export function createAssetManifestInProcessFetch(scriptRoot, fixture, output) {
  /** @type {Map<string, { status: number, body: string, headers: Record<string, string> }> | null} */
  let cache = null;

  async function loadCache() {
    if (cache) return cache;
    const probe = runAssetManifestProbe(scriptRoot, fixture, output);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "asset manifest probe failed");
    }
    const report = JSON.parse(probe.stdout.trim().split("\n").pop() ?? "{}");
    if (!report.ok) throw new Error(report.error ?? "asset manifest probe not ok");
    cache = new Map();
    for (const r of report.results ?? []) {
      if (r.error) continue;
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

export { concreteProbePath, writeProbeRoutes };
