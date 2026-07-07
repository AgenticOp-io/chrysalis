/**
 * Probe emitted Vapor hub routes via XCTVapor (oracle-swift).
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { concreteProbePath, writeProbeRoutes } from "./hub-gold-probe-routes.mjs";

/**
 * @returns {string | null}
 */
export function resolveHubSwift() {
  for (const cmd of ["swift", "swift.exe"]) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return cmd;
  }
  return null;
}

/**
 * @param {string} scriptRoot
 * @param {string} dir
 */
function copyProbeTree(scriptRoot, dir) {
  const probeRoot = join(scriptRoot, "packages/oracle-swift/probe");
  cpSync(join(probeRoot, "Package.swift"), join(dir, "Package.swift"));
  mkdirSync(join(dir, "Sources/ProbeHubRoutes"), { recursive: true });
  cpSync(join(probeRoot, "Sources/ProbeHubRoutes/main.swift"), join(dir, "Sources/ProbeHubRoutes/main.swift"));
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function runSwiftVaporProbe(scriptRoot, fixture) {
  const swift = resolveHubSwift();
  if (!swift) {
    return { status: 1, stderr: "swift-not-on-path", stdout: "" };
  }
  const hubRoutesSrc = join(fixture, "generated/swift/Sources/HubRoutes/routes.swift");
  if (!existsSync(hubRoutesSrc)) {
    return { status: 1, stderr: "missing-generated-hub-routes", stdout: "" };
  }

  const work = join(fixture, ".chrysalis/swift-probe-work");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(join(work, "Sources/HubRoutes"), { recursive: true });
  copyProbeTree(scriptRoot, work);
  cpSync(hubRoutesSrc, join(work, "Sources/HubRoutes/routes.swift"));

  const run = spawnSync(swift, ["run", "--package-path", work, "-c", "release", "ProbeHubRoutes", fixture.replace(/\\/g, "/")], {
    cwd: work,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 600000,
  });
  if (run.status !== 0) {
    return { status: 1, stderr: run.stderr || run.stdout || "swift run failed", stdout: "" };
  }
  const lines = run.stdout.trim().split("\n");
  const jsonLine = [...lines].reverse().find((l) => l.trimStart().startsWith("{"));
  return { status: 0, stdout: jsonLine ?? run.stdout, stderr: "" };
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function createSwiftVaporInProcessFetch(scriptRoot, fixture) {
  /** @type {Map<string, { status: number, body: string, headers: Record<string, string> }> | null} */
  let cache = null;

  async function loadCache() {
    if (cache) return cache;
    const probe = runSwiftVaporProbe(scriptRoot, fixture);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "vapor probe failed");
    }
    const report = JSON.parse(probe.stdout.trim());
    if (!report.ok) throw new Error(report.error ?? "vapor probe not ok");
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
