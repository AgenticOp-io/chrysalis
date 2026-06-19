#!/usr/bin/env node
/** Phase 14 HSS upstream proxy smoke (G6530) — api-proxy contract + chimera /api/* headers. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createWispChimeraGateway } from "../wisp-cwl-chimera-gateway.mjs";
import { loadWispPipelineConfig } from "../wisp-cwl-pipeline.mjs";

export const WISP_CWL_PHASE14_HSS_PROXY_SMOKE_KIND = "chrysalis.wisp-cwl-phase14-hss-proxy-smoke";
export const WISP_CWL_PHASE14_HSS_PROXY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");

/** HSS operator paths that must stay in proxy contract (not CWL-converted). */
export const WISP_HSS_PROXY_CONTRACT_PATHS = [
  "/api/hss",
  "/api/device-assignment",
  "/api/tenants",
  "/api/plans",
  "/api/monitoring",
];

/** G6531 — api-proxy.cwl includes HSS operator contract paths. */
export function runWispHssProxyContractGate() {
  const path = join(fixtureDir, "api-proxy.cwl");
  if (!existsSync(path)) return { ok: false, skip: "missing-api-proxy-cwl" };
  const text = readFileSync(path, "utf8");
  const missing = WISP_HSS_PROXY_CONTRACT_PATHS.filter((p) => !text.includes(`upstream-path "${p}"`));
  const ok = missing.length === 0 && text.includes("hub-cwl:upstream-proxy");
  return { ok, missing, pathCount: WISP_HSS_PROXY_CONTRACT_PATHS.length };
}

/** G6532 — chimera gateway proxies /api/* with backend header (local runtime). */
export async function runWispHssChimeraProxyGate() {
  const routesPath = join(fixtureDir, "routes.cwl");
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };

  const runtimeDist = join(scriptRoot, "packages/runtime-cwl/dist/index.js");
  if (!existsSync(runtimeDist)) return { ok: false, skip: "missing-runtime-cwl-dist" };

  /** @type {Awaited<ReturnType<typeof createWispChimeraGateway>> | null} */
  let gw = null;
  try {
    gw = await createWispChimeraGateway({
      repoRoot: scriptRoot,
      cwlPath: routesPath,
      backendUrl: "http://127.0.0.1:9",
      host: "127.0.0.1",
      port: 0,
    });
    const addr = gw.server.address();
    const port = typeof addr === "object" && addr ? addr.port : gw.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    /** @type {Array<Record<string, unknown>>} */
    const probes = [];
    for (const path of WISP_HSS_PROXY_CONTRACT_PATHS) {
      const res = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
      probes.push({
        path,
        status: res.status,
        proxyHeader: res.headers.get("x-chrysalis-wisp-proxy") ?? "",
        ok: res.headers.get("x-chrysalis-wisp-proxy") === "backend",
      });
    }
    const ok = probes.every((p) => p.ok === true);
    return { ok, probes, baseUrl };
  } finally {
    if (gw) await gw.stop();
  }
}

/** G6533 — optional live probe to configured HSS backend (operator network). */
export async function runWispHssLiveBackendProbeGate() {
  if (process.env.CHRYSALIS_WISP_LIVE_BACKEND_PROBE !== "1") {
    return { ok: true, skip: "live-probe-not-requested" };
  }
  const config = loadWispPipelineConfig();
  const backend = (config.gce?.backendUrl ?? "https://hss.wisptools.io").replace(/\/$/, "");
  try {
    const res = await fetch(`${backend}/api/tenants`, { redirect: "manual" });
    return {
      ok: res.status > 0 && res.status < 600,
      backend,
      status: res.status,
      live: true,
    };
  } catch (e) {
    return { ok: false, backend, error: String(e), live: true };
  }
}

/** G6530 composite. */
export async function runWispCwlPhase14HssProxyGate(opts = {}) {
  const contract = runWispHssProxyContractGate();
  const chimera = opts.skipChimera === true ? { ok: true, skip: "skip-chimera" } : await runWispHssChimeraProxyGate();
  const live = opts.skipLive === true ? { ok: true, skip: "skip-live" } : await runWispHssLiveBackendProbeGate();
  const ok = contract.ok === true && chimera.ok === true && live.ok === true;
  return {
    kind: WISP_CWL_PHASE14_HSS_PROXY_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE14_HSS_PROXY_SMOKE_SCHEMA_VERSION,
    ok,
    contract,
    chimera,
    live,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlPhase14HssProxyGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase14-hss-proxy-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
