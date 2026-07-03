/**
 * Probe emitted Sinatra hub apps via Rack::Test (oracle-ruby).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { concreteProbePath, writeProbeRoutes } from "./hub-gold-probe-routes.mjs";

let gemsEnsured = false;

/**
 * @param {string} rubyPath
 */
function rubyVersionOk(rubyPath) {
  const r = spawnSync(rubyPath, ["--version"], { encoding: "utf8" });
  return r.status === 0;
}

/** @returns {string[]} */
function hubRubyCandidates() {
  /** @type {string[]} */
  const out = ["ruby", "ruby.exe"];
  if (process.platform === "win32") {
    for (const root of ["C:\\Ruby33-x64", "C:\\Ruby34-x64", "C:\\Ruby32-x64"]) {
      const exe = join(root, "bin", "ruby.exe");
      if (existsSync(exe)) out.push(exe);
    }
    try {
      for (const name of readdirSync("C:\\")) {
        if (!/^Ruby\d+-x64$/i.test(name)) continue;
        const exe = join("C:\\", name, "bin", "ruby.exe");
        if (existsSync(exe) && !out.includes(exe)) out.push(exe);
      }
    } catch {
      // ignore
    }
  }
  return out;
}

/**
 * @returns {string | null}
 */
export function resolveHubRuby() {
  for (const cmd of hubRubyCandidates()) {
    if (rubyVersionOk(cmd)) return cmd;
  }
  return null;
}

/**
 * @param {string} ruby
 */
export function ensureHubSinatraAvailable(ruby) {
  if (gemsEnsured) return { ok: true };
  const probe = spawnSync(
    ruby,
    ["-e", "require 'sinatra/base'; require 'sinatra/json'; require 'rack/test'; print('ok')"],
    { encoding: "utf8", timeout: 15000 },
  );
  if (probe.status === 0 && probe.stdout.includes("ok")) {
    gemsEnsured = true;
    return { ok: true };
  }
  const gem = spawnSync(
    ruby,
    ["-S", "gem", "install", "sinatra", "sinatra-contrib", "rack-test", "--quiet", "--no-document"],
    { encoding: "utf8", timeout: 120000 },
  );
  if (gem.status !== 0) {
    return { ok: false, error: gem.stderr || gem.stdout || "gem install sinatra failed" };
  }
  gemsEnsured = true;
  return { ok: true };
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function runRubySinatraProbe(scriptRoot, fixture) {
  const ruby = resolveHubRuby();
  if (!ruby) {
    return { status: 1, stderr: "ruby-not-on-path", stdout: "" };
  }
  const routesSrc = join(fixture, "generated/ruby/lib/routes.rb");
  if (!existsSync(routesSrc)) {
    return { status: 1, stderr: "missing-generated-routes", stdout: "" };
  }
  const gems = ensureHubSinatraAvailable(ruby);
  if (!gems.ok) {
    return { status: 1, stderr: gems.error ?? "sinatra-gems-unavailable", stdout: "" };
  }
  const probeScript = join(scriptRoot, "packages/oracle-ruby/probe_routes.rb");
  return spawnSync(ruby, [probeScript, fixture], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function createRubySinatraInProcessFetch(scriptRoot, fixture) {
  /** @type {Map<string, { status: number, body: string, headers: Record<string, string> }> | null} */
  let cache = null;

  async function loadCache() {
    if (cache) return cache;
    const probe = runRubySinatraProbe(scriptRoot, fixture);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "sinatra probe failed");
    }
    const report = JSON.parse(probe.stdout.trim().split("\n").pop() ?? "{}");
    if (!report.ok) throw new Error(report.error ?? "sinatra probe not ok");
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
