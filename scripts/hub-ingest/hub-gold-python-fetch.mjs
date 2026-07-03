/**
 * Probe emitted Flask hub apps for trace replay.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { resolveHubPython } from "./shared.mjs";
import { concreteProbePath, writeProbeRoutes } from "./hub-gold-probe-routes.mjs";

export { concreteProbePath };

let flaskEnsured = false;

/**
 * Ensure Flask is importable for in-process probe (pip install once per process).
 */
export function ensureHubFlaskAvailable() {
  if (flaskEnsured) return { ok: true };
  const py = resolveHubPython();
  const probe = spawnSync(py, ["-c", "import flask"], { encoding: "utf8" });
  if (probe.status === 0) {
    flaskEnsured = true;
    return { ok: true };
  }
  const pip = spawnSync(py, ["-m", "pip", "install", "flask>=3.0", "--quiet"], { encoding: "utf8" });
  if (pip.status !== 0) {
    return { ok: false, error: pip.stderr || pip.stdout || "pip install flask failed" };
  }
  flaskEnsured = true;
  return { ok: true };
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 * @param {Array<{ method: string, path: string }>} routes
 */
export async function writePythonProbeRoutes(fixture, routes, _scriptRoot) {
  return writeProbeRoutes(fixture, routes);
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function runPythonFlaskProbe(scriptRoot, fixture) {
  const flask = ensureHubFlaskAvailable();
  if (!flask.ok) {
    return { status: 1, stderr: flask.error ?? "flask-unavailable", stdout: "" };
  }
  const py = resolveHubPython();
  const probeScript = join(scriptRoot, "packages/oracle-python/probe_flask_app.py");
  return spawnSync(py, [probeScript, fixture], { cwd: scriptRoot, encoding: "utf8" });
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function createPythonFlaskInProcessFetch(scriptRoot, fixture) {
  /** @type {Map<string, { status: number, body: string, headers: Record<string, string> }> | null} */
  let cache = null;

  async function loadCache() {
    if (cache) return cache;
    const probe = runPythonFlaskProbe(scriptRoot, fixture);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "flask probe failed");
    }
    const report = JSON.parse(probe.stdout.trim().split("\n").pop() ?? "{}");
    if (!report.ok) throw new Error(report.error ?? "flask probe not ok");
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
