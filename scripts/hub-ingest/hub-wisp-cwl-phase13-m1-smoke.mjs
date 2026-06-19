#!/usr/bin/env node
/** Phase 13 M1 surface smoke (G6360) — dashboard load + page shell. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { applyWispPhase13Surfaces } from "../wisp-cwl-apply-phase13-surfaces.mjs";
import { buildWispHoleManifest } from "../wisp-cwl-hole-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_CWL_PHASE13_M1_SMOKE_KIND = "chrysalis.wisp-cwl-phase13-m1-smoke";
export const WISP_CWL_PHASE13_M1_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const routesPath = join(fixtureDir, "routes.cwl");
const manifestPath = join(fixtureDir, "wisp-m1-surface-manifest.v1.json");

/** G6360-doc — M1 manifest. */
export function runWispM1SurfaceManifestGate() {
  if (!existsSync(manifestPath)) return { ok: false, skip: "missing-m1-manifest" };
  const json = JSON.parse(readFileSync(manifestPath, "utf8"));
  const ok =
    json.ok === true &&
    json.wave === "M1" &&
    Array.isArray(json.surfaces?.data) &&
    json.surfaces.data.some((d) => d.path === "/dashboard") &&
    Array.isArray(json.surfaces?.uiWidgetHoles);
  return { ok, manifestOk: ok };
}

/** G6360-routes — /dashboard @page + load. */
export function runWispM1RoutesGate() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  const text = readFileSync(routesPath, "utf8");
  const ok =
    text.includes('@page GET "/dashboard"') &&
    text.includes("load { tenantLabel:") &&
    !/@route GET "\/dashboard"/.test(text);
  return { ok, dashboardLoad: text.includes("load { tenantLabel:") };
}

/** G6360-runtime — page-load sidecar on /dashboard. */
export async function runWispM1DashboardLoadGate() {
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
  const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/dashboard" });
  const body = await res.text();
  await runtime.stop();
  const ok =
    res.status === 200 &&
    body.includes("cwl-page-load") &&
    body.includes("tenantLabel") &&
    body.includes("Dashboard") &&
    body.includes("WISP Tenant");
  return { ok, status: res.status, hasPageLoad: body.includes("cwl-page-load") };
}

/** G6360 — Phase 13 M1 composite. */
export async function runWispCwlPhase13M1Gate(opts = {}) {
  if (opts.apply !== false) applyWispPhase13Surfaces();
  buildWispHoleManifest();
  const manifest = runWispM1SurfaceManifestGate();
  const routes = runWispM1RoutesGate();
  const load = await runWispM1DashboardLoadGate();
  const ok = manifest.ok === true && routes.ok === true && load.ok === true;
  return {
    kind: WISP_CWL_PHASE13_M1_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE13_M1_SMOKE_SCHEMA_VERSION,
    ok,
    manifest,
    routes,
    load,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispCwlPhase13M1SmokeGate(opts = {}) {
  const progress = createSmokeProgress("wisp-cwl-phase13-m1");
  const t0 = progress.start("WISP CWL Phase 13 M1 (G6360)");
  const gate = await runWispCwlPhase13M1Gate(opts);
  progress.end("WISP CWL Phase 13 M1 (G6360)", gate.ok === true, t0);
  return gate;
}

async function main() {
  const r = await runWispCwlPhase13M1SmokeGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase13-m1-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
