#!/usr/bin/env node
/** Phase 13 M3 surface smoke (G6380) — plan, deploy, coverage-map + ArcGIS client holes. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  M3_API_SURFACES,
  M3_MODULE_ROUTES,
} from "../wisp-cwl-apply-m3-surfaces.mjs";
import { applyWispPhase13Surfaces } from "../wisp-cwl-apply-phase13-surfaces.mjs";
import { buildWispHoleManifest } from "../wisp-cwl-hole-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_CWL_PHASE13_M3_SMOKE_KIND = "chrysalis.wisp-cwl-phase13-m3-smoke";
export const WISP_CWL_PHASE13_M3_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const routesPath = join(fixtureDir, "routes.cwl");
const apiProxyPath = join(fixtureDir, "api-proxy.cwl");
const manifestPath = join(fixtureDir, "wisp-m3-surface-manifest.v1.json");

/** G6380-doc — M3 manifest incl. ArcGIS client holes. */
export function runWispM3SurfaceManifestGate() {
  if (!existsSync(manifestPath)) return { ok: false, skip: "missing-m3-manifest" };
  const json = JSON.parse(readFileSync(manifestPath, "utf8"));
  const arcgisHole = (json.surfaces?.clientHoles ?? []).some(
    (h) => h.reason === "hub-svelte:arcgis-map" && h.host === "/modules/coverage-map",
  );
  const ok =
    json.ok === true &&
    json.wave === "M3" &&
    Array.isArray(json.surfaces?.api) &&
    json.surfaces.api.includes("/api/plans") &&
    Array.isArray(json.surfaces?.pages) &&
    json.surfaces.pages.includes("/modules/coverage-map") &&
    arcgisHole === true;
  return { ok, manifestOk: ok, arcgisHole };
}

/** G6380-routes — plan/deploy/coverage-map @page + load. */
export function runWispM3RoutesGate() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  const text = readFileSync(routesPath, "utf8");
  const modulesOk = M3_MODULE_ROUTES.every(
    (route) =>
      text.includes(`@page GET "${route.path}"`) &&
      text.includes(`module: "${route.module}"`) &&
      !text.includes(`@route GET "${route.path}"`),
  );
  return { ok: modulesOk, modulesOk };
}

/** G6380-api — plans, deploy, network in api-proxy contract. */
export function runWispM3ApiProxyGate() {
  if (!existsSync(apiProxyPath)) return { ok: false, skip: "missing-api-proxy-cwl" };
  const text = readFileSync(apiProxyPath, "utf8");
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  const surfacesOk = M3_API_SURFACES.every((apiPath) =>
    methods.every((m) => text.includes(`@route ${m} "${apiPath}"`)),
  );
  return { ok: surfacesOk, apiSurfaces: M3_API_SURFACES };
}

/** @param {string} urlPath @param {string[]} needles */
async function runM3PageLoadGate(urlPath, needles) {
  const runtimeDist = join(scriptRoot, "packages/runtime-cwl/dist/index.js");
  if (!existsSync(runtimeDist)) {
    spawnSync("pnpm", ["--filter", "@chrysalis/runtime-cwl", "build"], {
      cwd: scriptRoot,
      shell: process.platform === "win32",
      encoding: "utf8",
    });
  }
  const { createCwlRuntime, loadModuleFromCwlFile } = await import(
    pathToFileURL(join(scriptRoot, "packages/runtime-cwl/dist/index.js")).href
  );
  const runtime = createCwlRuntime({
    module: loadModuleFromCwlFile(routesPath, scriptRoot),
  });
  const res = await runtime.fetch({ method: "GET", url: `http://127.0.0.1${urlPath}` });
  const body = await res.text();
  await runtime.stop();
  const ok = res.status === 200 && body.includes("cwl-page-load") && needles.every((n) => body.includes(n));
  return { ok, status: res.status, path: urlPath, hasPageLoad: body.includes("cwl-page-load") };
}

/** G6380-runtime — page-load on plan + coverage-map (ArcGIS note in shell). */
export async function runWispM3RuntimeLoadGate() {
  const plan = await runM3PageLoadGate("/modules/plan", ["Plan", "wisp-m3", "/api/plans"]);
  const coverage = await runM3PageLoadGate("/modules/coverage-map", [
    "Coverage Map",
    "wisp-m3",
    "hub-svelte:arcgis-map",
  ]);
  const ok = plan.ok === true && coverage.ok === true;
  return { ok, plan, coverage };
}

/** G6380 — Phase 13 M3 composite. */
export async function runWispCwlPhase13M3Gate(opts = {}) {
  if (opts.apply !== false) applyWispPhase13Surfaces();
  buildWispHoleManifest();
  const manifest = runWispM3SurfaceManifestGate();
  const routes = runWispM3RoutesGate();
  const api = runWispM3ApiProxyGate();
  const load = await runWispM3RuntimeLoadGate();
  const ok = manifest.ok === true && routes.ok === true && api.ok === true && load.ok === true;
  return {
    kind: WISP_CWL_PHASE13_M3_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE13_M3_SMOKE_SCHEMA_VERSION,
    ok,
    manifest,
    routes,
    api,
    load,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispCwlPhase13M3SmokeGate(opts = {}) {
  const progress = createSmokeProgress("wisp-cwl-phase13-m3");
  const t0 = progress.start("WISP CWL Phase 13 M3 (G6380)");
  const gate = await runWispCwlPhase13M3Gate(opts);
  progress.end("WISP CWL Phase 13 M3 (G6380)", gate.ok === true, t0);
  return gate;
}

async function main() {
  const r = await runWispCwlPhase13M3SmokeGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase13-m3-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
