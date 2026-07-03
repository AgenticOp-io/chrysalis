/**
 * Probe emitted Spring hub routes via reflection (oracle-java).
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { concreteProbePath, writeProbeRoutes } from "./hub-gold-probe-routes.mjs";

let vendorEnsured = false;

/**
 * @param {string} scriptRoot
 */
export function ensureOracleJavaVendor(scriptRoot) {
  if (vendorEnsured) return { ok: true };
  const vendorDir = join(scriptRoot, "packages/oracle-java/vendor");
  const marker = join(vendorDir, "spring-core-6.1.14.jar");
  if (!existsSync(marker)) {
    const boot = spawnSync(process.execPath, [join(scriptRoot, "scripts/ensure-oracle-java-vendor.mjs")], {
      cwd: scriptRoot,
      encoding: "utf8",
    });
    if (boot.status !== 0) {
      return { ok: false, error: boot.stderr || boot.stdout || "oracle-java vendor bootstrap failed" };
    }
  }
  vendorEnsured = true;
  return { ok: true };
}

/**
 * @param {string} scriptRoot
 */
function resolveHubJava() {
  for (const cmd of ["java", "java.exe"]) {
    const r = spawnSync(cmd, ["-version"], { encoding: "utf8" });
    if (r.status === 0 || r.stderr?.includes("version")) return cmd;
  }
  return "java";
}

/**
 * @param {string} scriptRoot
 */
function resolveHubJavac() {
  for (const cmd of ["javac", "javac.exe"]) {
    const r = spawnSync(cmd, ["-version"], { encoding: "utf8" });
    if (r.status === 0 || r.stderr?.includes("version")) return cmd;
  }
  return "javac";
}

/**
 * @param {string} scriptRoot
 */
function vendorClasspath(scriptRoot) {
  const vendorDir = join(scriptRoot, "packages/oracle-java/vendor");
  return readdirSync(vendorDir)
    .filter((f) => f.endsWith(".jar"))
    .map((f) => join(vendorDir, f))
    .join(process.platform === "win32" ? ";" : ":");
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function runJavaSpringProbe(scriptRoot, fixture) {
  const vendor = ensureOracleJavaVendor(scriptRoot);
  if (!vendor.ok) {
    return { status: 1, stderr: vendor.error ?? "oracle-java-vendor-unavailable", stdout: "" };
  }
  const hubRoutesSrc = join(fixture, "generated/java/src/main/java/hub/HubRoutes.java");
  if (!existsSync(hubRoutesSrc)) {
    return { status: 1, stderr: "missing-generated-hub-routes", stdout: "" };
  }

  const work = join(fixture, ".chrysalis/spring-probe-work");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(join(work, "hub"), { recursive: true });
  mkdirSync(join(work, "chrysalis"), { recursive: true });
  cpSync(hubRoutesSrc, join(work, "hub/HubRoutes.java"));
  cpSync(
    join(scriptRoot, "packages/oracle-java/src/chrysalis/ProbeHubRoutes.java"),
    join(work, "chrysalis/ProbeHubRoutes.java"),
  );

  const cp = vendorClasspath(scriptRoot);
  const javac = resolveHubJavac();
  const compile = spawnSync(
    javac,
    ["-cp", cp, "-d", work, join(work, "hub/HubRoutes.java"), join(work, "chrysalis/ProbeHubRoutes.java")],
    { cwd: scriptRoot, encoding: "utf8" },
  );
  if (compile.status !== 0) {
    return { status: 1, stderr: compile.stderr || compile.stdout || "javac failed", stdout: "" };
  }

  const java = resolveHubJava();
  const runCp = `${work}${process.platform === "win32" ? ";" : ":"}${cp}`;
  return spawnSync(java, ["-cp", runCp, "chrysalis.ProbeHubRoutes", fixture], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function createJavaSpringInProcessFetch(scriptRoot, fixture) {
  /** @type {Map<string, { status: number, body: string, headers: Record<string, string> }> | null} */
  let cache = null;

  async function loadCache() {
    if (cache) return cache;
    const probe = runJavaSpringProbe(scriptRoot, fixture);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "spring probe failed");
    }
    const report = JSON.parse(probe.stdout.trim().split("\n").pop() ?? "{}");
    if (!report.ok) throw new Error(report.error ?? "spring probe not ok");
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
