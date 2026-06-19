#!/usr/bin/env node
/** Phase 13 M4 surface smoke (G6390) — HSS + monitoring POC showcase (D6205). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { M4_API_SURFACES, M4_MODULE_ROUTES } from "../wisp-cwl-apply-m4-surfaces.mjs";
import { applyWispPhase13Surfaces } from "../wisp-cwl-apply-phase13-surfaces.mjs";
import { buildWispHoleManifest } from "../wisp-cwl-hole-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_CWL_PHASE13_M4_SMOKE_KIND = "chrysalis.wisp-cwl-phase13-m4-smoke";
export const WISP_CWL_PHASE13_M4_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const routesPath = join(fixtureDir, "routes.cwl");
const apiProxyPath = join(fixtureDir, "api-proxy.cwl");
const manifestPath = join(fixtureDir, "wisp-m4-surface-manifest.v1.json");

export function runWispM4SurfaceManifestGate() {
  if (!existsSync(manifestPath)) return { ok: false, skip: "missing-m4-manifest" };
  const json = JSON.parse(readFileSync(manifestPath, "utf8"));
  const ok =
    json.ok === true &&
    json.wave === "M4" &&
    json.surfaces?.backendPolicy?.hss?.includes("proxy-only");
  return { ok, manifestOk: ok };
}

export function runWispM4RoutesGate() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  const text = readFileSync(routesPath, "utf8");
  const ok = M4_MODULE_ROUTES.every(
    (r) => text.includes(`@page GET "${r.path}"`) && text.includes('source: "wisp-m4"'),
  );
  return { ok };
}

export function runWispM4ApiProxyGate() {
  if (!existsSync(apiProxyPath)) return { ok: false, skip: "missing-api-proxy-cwl" };
  const text = readFileSync(apiProxyPath, "utf8");
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  const ok = M4_API_SURFACES.every((apiPath) => {
    if (apiPath === "/api/monitoring/graphs") {
      return methods.slice(0, 2).every((m) => text.includes(`@route ${m} "${apiPath}"`));
    }
    return methods.every((m) => text.includes(`@route ${m} "${apiPath}"`));
  });
  return { ok, apiSurfaces: M4_API_SURFACES };
}

async function runPageLoad(urlPath, needles) {
  const runtimeDist = join(scriptRoot, "packages/runtime-cwl/dist/index.js");
  if (!existsSync(runtimeDist)) {
    spawnSync("pnpm", ["--filter", "@chrysalis/runtime-cwl", "build"], {
      cwd: scriptRoot,
      shell: process.platform === "win32",
      encoding: "utf8",
    });
  }
  const { createCwlRuntime, loadModuleFromCwlFile } = await import(
    pathToFileURL(runtimeDist).href
  );
  const runtime = createCwlRuntime({ module: loadModuleFromCwlFile(routesPath, scriptRoot) });
  const res = await runtime.fetch({ method: "GET", url: `http://127.0.0.1${urlPath}` });
  const body = await res.text();
  await runtime.stop();
  return {
    ok: res.status === 200 && body.includes("cwl-page-load") && needles.every((n) => body.includes(n)),
    status: res.status,
    path: urlPath,
  };
}

export async function runWispM4RuntimeLoadGate() {
  const hss = await runPageLoad("/modules/hss-management", ["HSS Management", "wisp-m4", "/api/hss"]);
  const monitoring = await runPageLoad("/modules/monitoring", ["SNMP Monitoring", "wisp-m4", "/api/monitoring"]);
  const ok = hss.ok === true && monitoring.ok === true;
  return { ok, hss, monitoring };
}

export async function runWispCwlPhase13M4Gate(opts = {}) {
  if (opts.apply !== false) applyWispPhase13Surfaces();
  buildWispHoleManifest();
  const manifest = runWispM4SurfaceManifestGate();
  const routes = runWispM4RoutesGate();
  const api = runWispM4ApiProxyGate();
  const load = await runWispM4RuntimeLoadGate();
  const ok = manifest.ok === true && routes.ok === true && api.ok === true && load.ok === true;
  return {
    kind: WISP_CWL_PHASE13_M4_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE13_M4_SMOKE_SCHEMA_VERSION,
    ok,
    manifest,
    routes,
    api,
    load,
    generatedAt: new Date().toISOString(),
  };
}

/** @param {Record<string, unknown>} [opts] */
export async function runWispCwlPhase13M4Smoke(opts = {}) {
  const progress = createSmokeProgress("wisp-cwl-phase13-m4");
  const t0 = progress.start("WISP Phase 13 M4");
  const gate = await runWispCwlPhase13M4Gate(opts);
  progress.end("WISP Phase 13 M4", gate.ok === true, t0);
  return {
    kind: WISP_CWL_PHASE13_M4_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE13_M4_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlPhase13M4Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase13-m4-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
