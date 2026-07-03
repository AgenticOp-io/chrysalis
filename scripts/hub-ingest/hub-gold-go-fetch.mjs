/**
 * Probe emitted Gin hub apps via httptest (oracle-go).
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { concreteProbePath, writeProbeRoutes } from "./hub-gold-probe-routes.mjs";

/**
 * @param {string} scriptRoot
 */
export function resolveHubGo() {
  for (const cmd of ["go", "go.exe"]) {
    const r = spawnSync(cmd, ["version"], { encoding: "utf8" });
    if (r.status === 0) return cmd;
  }
  return null;
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function runGoGinProbe(scriptRoot, fixture) {
  const go = resolveHubGo();
  if (!go) {
    return { status: 1, stderr: "go-not-on-path", stdout: "" };
  }
  const routesSrc = join(fixture, "generated/go/routes.go");
  if (!existsSync(routesSrc)) {
    return { status: 1, stderr: "missing-generated-routes", stdout: "" };
  }

  const work = join(fixture, ".chrysalis/gin-probe-work");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  cpSync(routesSrc, join(work, "routes.go"));
  cpSync(join(scriptRoot, "packages/oracle-go/probe_main.go"), join(work, "probe_main.go"));
  writeFileSync(
    join(work, "go.mod"),
    "module chrysalis-hub-gin-probe\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.10.0\n",
    "utf8",
  );

  const tidy = spawnSync(go, ["mod", "tidy"], { cwd: work, encoding: "utf8" });
  if (tidy.status !== 0) {
    return { status: 1, stderr: tidy.stderr || tidy.stdout || "go mod tidy failed", stdout: "" };
  }

  return spawnSync(go, ["run", ".", fixture], {
    cwd: work,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function createGoGinInProcessFetch(scriptRoot, fixture) {
  /** @type {Map<string, { status: number, body: string, headers: Record<string, string> }> | null} */
  let cache = null;

  async function loadCache() {
    if (cache) return cache;
    const probe = runGoGinProbe(scriptRoot, fixture);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "gin probe failed");
    }
    const report = JSON.parse(probe.stdout.trim().split("\n").pop() ?? "{}");
    if (!report.ok) throw new Error(report.error ?? "gin probe not ok");
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
