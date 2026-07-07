/**
 * Probe emitted actix-web hub routes via actix test (oracle-rust).
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { concreteProbePath, writeProbeRoutes } from "./hub-gold-probe-routes.mjs";

/**
 * @param {string} scriptRoot
 */
export function resolveHubCargo() {
  for (const cmd of ["cargo", "cargo.exe"]) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return cmd;
  }
  return null;
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function runRustActixProbe(scriptRoot, fixture) {
  const cargo = resolveHubCargo();
  if (!cargo) {
    return { status: 1, stderr: "cargo-not-on-path", stdout: "" };
  }
  const routesSrc = join(fixture, "generated/rust/routes.rs");
  if (!existsSync(routesSrc)) {
    return { status: 1, stderr: "missing-generated-routes", stdout: "" };
  }

  const work = join(fixture, ".chrysalis/rust-probe-work");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(join(work, "src"), { recursive: true });
  cpSync(routesSrc, join(work, "src/routes.rs"));
  cpSync(join(scriptRoot, "packages/oracle-rust/probe/Cargo.toml"), join(work, "Cargo.toml"));
  cpSync(join(scriptRoot, "packages/oracle-rust/probe/src/main.rs"), join(work, "src/main.rs"));

  return spawnSync(cargo, ["run", "--quiet", "--", fixture], {
    cwd: work,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function createRustActixInProcessFetch(scriptRoot, fixture) {
  /** @type {Map<string, { status: number, body: string, headers: Record<string, string> }> | null} */
  let cache = null;

  async function loadCache() {
    if (cache) return cache;
    const probe = runRustActixProbe(scriptRoot, fixture);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "rust probe failed");
    }
    const report = JSON.parse(probe.stdout.trim().split("\n").pop() ?? "{}");
    if (!report.ok) throw new Error(report.error ?? "rust probe not ok");
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
