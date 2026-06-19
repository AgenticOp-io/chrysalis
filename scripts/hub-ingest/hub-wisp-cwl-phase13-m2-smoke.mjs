#!/usr/bin/env node
/** Phase 13 M2 surface smoke (G6370) — admin + customers API/Pages/Data shells. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  M2_ADMIN_ROUTES,
  M2_API_SURFACES,
  M2_CUSTOMERS_MODULE_PATH,
} from "../wisp-cwl-apply-m2-surfaces.mjs";
import { applyWispPhase13Surfaces } from "../wisp-cwl-apply-phase13-surfaces.mjs";
import { buildWispHoleManifest } from "../wisp-cwl-hole-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_CWL_PHASE13_M2_SMOKE_KIND = "chrysalis.wisp-cwl-phase13-m2-smoke";
export const WISP_CWL_PHASE13_M2_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const routesPath = join(fixtureDir, "routes.cwl");
const apiProxyPath = join(fixtureDir, "api-proxy.cwl");
const manifestPath = join(fixtureDir, "wisp-m2-surface-manifest.v1.json");

/** G6370-doc — M2 manifest. */
export function runWispM2SurfaceManifestGate() {
  if (!existsSync(manifestPath)) return { ok: false, skip: "missing-m2-manifest" };
  const json = JSON.parse(readFileSync(manifestPath, "utf8"));
  const ok =
    json.ok === true &&
    json.wave === "M2" &&
    Array.isArray(json.surfaces?.api) &&
    json.surfaces.api.includes("/api/admin") &&
    json.surfaces.api.includes("/api/customers") &&
    Array.isArray(json.surfaces?.pages) &&
    json.surfaces.pages.includes(M2_CUSTOMERS_MODULE_PATH);
  return { ok, manifestOk: ok };
}

/** G6370-routes — admin + customers @page + load. */
export function runWispM2RoutesGate() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  const text = readFileSync(routesPath, "utf8");
  const adminOk = M2_ADMIN_ROUTES.every(
    (route) =>
      text.includes(`@page GET "${route.path}"`) &&
      text.includes(`adminArea: "${route.area}"`) &&
      !text.includes(`@route GET "${route.path}"`),
  );
  const customersOk =
    text.includes(`@page GET "${M2_CUSTOMERS_MODULE_PATH}"`) &&
    text.includes('load { module: "customers"') &&
    !/@route GET "\/modules\/customers"/.test(text);
  const ok = adminOk && customersOk;
  return { ok, adminOk, customersOk };
}

/** G6370-api — admin + customers in api-proxy contract. */
export function runWispM2ApiProxyGate() {
  if (!existsSync(apiProxyPath)) return { ok: false, skip: "missing-api-proxy-cwl" };
  const text = readFileSync(apiProxyPath, "utf8");
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  const surfacesOk = M2_API_SURFACES.every((apiPath) =>
    methods.every((m) => text.includes(`@route ${m} "${apiPath}"`)),
  );
  return { ok: surfacesOk, apiSurfaces: M2_API_SURFACES };
}

/** @param {string} urlPath @param {string[]} needles */
async function runM2PageLoadGate(urlPath, needles) {
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

/** G6370-runtime — page-load on admin management + customers module. */
export async function runWispM2RuntimeLoadGate() {
  const admin = await runM2PageLoadGate("/admin/management", ["Management", "wisp-m2", "/api/admin"]);
  const customers = await runM2PageLoadGate("/modules/customers", [
    "Customers Module",
    "wisp-m2",
    "/api/customers",
  ]);
  const ok = admin.ok === true && customers.ok === true;
  return { ok, admin, customers };
}

/** G6370 — Phase 13 M2 composite. */
export async function runWispCwlPhase13M2Gate(opts = {}) {
  if (opts.apply !== false) applyWispPhase13Surfaces();
  buildWispHoleManifest();
  const manifest = runWispM2SurfaceManifestGate();
  const routes = runWispM2RoutesGate();
  const api = runWispM2ApiProxyGate();
  const load = await runWispM2RuntimeLoadGate();
  const ok = manifest.ok === true && routes.ok === true && api.ok === true && load.ok === true;
  return {
    kind: WISP_CWL_PHASE13_M2_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE13_M2_SMOKE_SCHEMA_VERSION,
    ok,
    manifest,
    routes,
    api,
    load,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispCwlPhase13M2SmokeGate(opts = {}) {
  const progress = createSmokeProgress("wisp-cwl-phase13-m2");
  const t0 = progress.start("WISP CWL Phase 13 M2 (G6370)");
  const gate = await runWispCwlPhase13M2Gate(opts);
  progress.end("WISP CWL Phase 13 M2 (G6370)", gate.ok === true, t0);
  return gate;
}

async function main() {
  const r = await runWispCwlPhase13M2SmokeGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase13-m2-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
