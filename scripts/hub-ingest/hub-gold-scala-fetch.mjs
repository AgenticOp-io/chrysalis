/**
 * Probe emitted Akka HTTP hub routes via Route.seal (oracle-scala).
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { concreteProbePath, writeProbeRoutes } from "./hub-gold-probe-routes.mjs";

/**
 * @returns {string | null}
 */
export function resolveHubSbt() {
  for (const cmd of ["sbt", "sbt.bat"]) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
    if (r.status === 0) return cmd;
  }
  return null;
}

/**
 * @param {string} scriptRoot
 * @param {string} dir
 */
function copyProbeTree(scriptRoot, dir) {
  const probeRoot = join(scriptRoot, "packages/oracle-scala/probe");
  cpSync(join(probeRoot, "build.sbt"), join(dir, "build.sbt"));
  mkdirSync(join(dir, "src/main/scala/chrysalis"), { recursive: true });
  cpSync(
    join(probeRoot, "src/main/scala/chrysalis/ProbeHubRoutes.scala"),
    join(dir, "src/main/scala/chrysalis/ProbeHubRoutes.scala"),
  );
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function runScalaAkkaProbe(scriptRoot, fixture) {
  const sbt = resolveHubSbt();
  if (!sbt) {
    return { status: 1, stderr: "sbt-not-on-path", stdout: "" };
  }
  const hubRoutesSrc = join(fixture, "generated/scala/src/main/scala/hub/HubRoutes.scala");
  if (!existsSync(hubRoutesSrc)) {
    return { status: 1, stderr: "missing-generated-hub-routes", stdout: "" };
  }

  const work = join(fixture, ".chrysalis/scala-probe-work");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(join(work, "src/main/scala/hub"), { recursive: true });
  copyProbeTree(scriptRoot, work);
  cpSync(hubRoutesSrc, join(work, "src/main/scala/hub/HubRoutes.scala"));

  const run = spawnSync(
    sbt,
    ["-Dsbt.log.noformat=true", `runMain chrysalis.ProbeHubRoutes ${fixture.replace(/\\/g, "/")}`],
    {
      cwd: work,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      shell: process.platform === "win32",
      timeout: 300000,
    },
  );
  if (run.status !== 0) {
    return { status: 1, stderr: run.stderr || run.stdout || "sbt runMain failed", stdout: "" };
  }
  const lines = run.stdout.trim().split("\n");
  const jsonLine = [...lines].reverse().find((l) => l.trimStart().startsWith("{"));
  return { status: 0, stdout: jsonLine ?? run.stdout, stderr: "" };
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function createScalaAkkaInProcessFetch(scriptRoot, fixture) {
  /** @type {Map<string, { status: number, body: string, headers: Record<string, string> }> | null} */
  let cache = null;

  async function loadCache() {
    if (cache) return cache;
    const probe = runScalaAkkaProbe(scriptRoot, fixture);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "akka probe failed");
    }
    const report = JSON.parse(probe.stdout.trim());
    if (!report.ok) throw new Error(report.error ?? "akka probe not ok");
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
