/**
 * Probe emitted Ktor hub routes via testApplication (oracle-kotlin).
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { concreteProbePath, writeProbeRoutes } from "./hub-gold-probe-routes.mjs";

/**
 * @returns {string | null}
 */
export function resolveHubGradle() {
  /** @type {string[]} */
  const cmds = ["gradle", "gradle.bat"];
  if (process.platform !== "win32") cmds.unshift("./gradlew");
  else cmds.unshift("gradlew.bat");
  for (const cmd of cmds) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
    if (r.status === 0) return cmd;
  }
  return null;
}

/**
 * @param {string} dir
 */
function copyProbeTree(scriptRoot, dir) {
  const probeRoot = join(scriptRoot, "packages/oracle-kotlin/probe");
  cpSync(join(probeRoot, "build.gradle.kts"), join(dir, "build.gradle.kts"));
  cpSync(join(probeRoot, "settings.gradle.kts"), join(dir, "settings.gradle.kts"));
  mkdirSync(join(dir, "src/main/kotlin/chrysalis"), { recursive: true });
  cpSync(
    join(probeRoot, "src/main/kotlin/chrysalis/ProbeHubRoutes.kt"),
    join(dir, "src/main/kotlin/chrysalis/ProbeHubRoutes.kt"),
  );
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function runKotlinKtorProbe(scriptRoot, fixture) {
  const gradle = resolveHubGradle();
  if (!gradle) {
    return { status: 1, stderr: "gradle-not-on-path", stdout: "" };
  }
  const hubRoutesSrc = join(fixture, "generated/kotlin/src/main/kotlin/hub/HubRoutes.kt");
  if (!existsSync(hubRoutesSrc)) {
    return { status: 1, stderr: "missing-generated-hub-routes", stdout: "" };
  }

  const work = join(fixture, ".chrysalis/kotlin-probe-work");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(join(work, "src/main/kotlin/hub"), { recursive: true });
  copyProbeTree(scriptRoot, work);
  cpSync(hubRoutesSrc, join(work, "src/main/kotlin/hub/HubRoutes.kt"));

  const run = spawnSync(gradle, ["run", "--quiet", "--no-daemon", "--args", fixture], {
    cwd: work,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  if (run.status !== 0) {
    return { status: 1, stderr: run.stderr || run.stdout || "gradle run failed", stdout: "" };
  }
  const lines = run.stdout.trim().split("\n");
  const jsonLine = lines.reverse().find((l) => l.trimStart().startsWith("{"));
  return { status: 0, stdout: jsonLine ?? run.stdout, stderr: "" };
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function createKotlinKtorInProcessFetch(scriptRoot, fixture) {
  /** @type {Map<string, { status: number, body: string, headers: Record<string, string> }> | null} */
  let cache = null;

  async function loadCache() {
    if (cache) return cache;
    const probe = runKotlinKtorProbe(scriptRoot, fixture);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "ktor probe failed");
    }
    const report = JSON.parse(probe.stdout.trim());
    if (!report.ok) throw new Error(report.error ?? "ktor probe not ok");
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
