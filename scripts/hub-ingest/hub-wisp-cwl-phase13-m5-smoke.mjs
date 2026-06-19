#!/usr/bin/env node
/** Phase 13 M5 surface smoke (G6400) — full UI cutover; ≥99% native @page; login firebase hole only. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { m5CutoverSatisfied } from "../wisp-cwl-apply-m5-surfaces.mjs";
import { countStrayHoledRoutes } from "../wisp-cwl-apply-module-routes-lib.mjs";
import { applyWispPhase13Surfaces } from "../wisp-cwl-apply-phase13-surfaces.mjs";
import { buildWispHoleManifest } from "../wisp-cwl-hole-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_CWL_PHASE13_M5_SMOKE_KIND = "chrysalis.wisp-cwl-phase13-m5-smoke";
export const WISP_CWL_PHASE13_M5_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const routesPath = join(fixtureDir, "routes.cwl");
const previewPath = join(fixtureDir, "cwl-preview.json");
const manifestPath = join(fixtureDir, "wisp-m5-surface-manifest.v1.json");

export function runWispM5SurfaceManifestGate() {
  if (!existsSync(manifestPath)) return { ok: false, skip: "missing-m5-manifest" };
  const json = JSON.parse(readFileSync(manifestPath, "utf8"));
  const ok =
    json.ok === true &&
    json.wave === "M5" &&
    m5CutoverSatisfied(json.cutover ?? {});
  return { ok, manifestOk: ok, cutover: json.cutover };
}

export function runWispM5RoutesGate() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  const text = readFileSync(routesPath, "utf8");
  const pageLines = (text.match(/^@page GET/gm) ?? []).length;
  const strayHoled = countStrayHoledRoutes(text);
  const loginFirebase =
    text.includes('@route GET "/login"') && text.includes("hole hub-svelte:firebase-auth");
  const ok = pageLines >= 86 && strayHoled === 0 && loginFirebase;
  return { ok, pageLines, strayHoled, loginFirebase };
}

export function runWispM5PreviewGate() {
  if (!existsSync(previewPath)) return { ok: false, skip: "missing-cwl-preview" };
  const json = JSON.parse(readFileSync(previewPath, "utf8"));
  const routes = json.routes ?? [];
  const holed = routes.filter((r) => r.hole === true);
  const cutover = {
    uiRouteCount: routes.length,
    nativePageCount: routes.length - holed.length,
    uiHoleCount: holed.length,
    loginFirebaseHole: holed.length === 1 && holed[0]?.path === "/login",
  };
  const ok = m5CutoverSatisfied(cutover);
  return { ok, nativeRatio: cutover.nativePageCount / routes.length, uiHoleCount: holed.length };
}

export async function runWispM5RuntimeCoverageGate() {
  const runtimeDist = join(scriptRoot, "packages/runtime-cwl/dist/index.js");
  if (!existsSync(runtimeDist)) {
    spawnSync("pnpm", ["--filter", "@chrysalis/runtime-cwl", "build"], {
      cwd: scriptRoot,
      shell: process.platform === "win32",
      encoding: "utf8",
    });
  }
  const preview = JSON.parse(readFileSync(previewPath, "utf8"));
  const native = (preview.routes ?? []).filter((r) => r.hole === false);
  const { createCwlRuntime, loadModuleFromCwlFile } = await import(
    pathToFileURL(runtimeDist).href
  );
  const runtime = createCwlRuntime({ module: loadModuleFromCwlFile(routesPath, scriptRoot) });
  let okCount = 0;
  const samples = [];
  for (const r of native) {
    const res = await runtime.fetch({ method: "GET", url: `http://127.0.0.1${r.path}` });
    const body = await res.text();
    const ok = res.status === 200 && body.length > 10;
    if (ok) okCount++;
    if (samples.length < 5) samples.push({ path: r.path, status: res.status, ok });
  }
  await runtime.stop();
  const ratio = native.length > 0 ? okCount / native.length : 0;
  const ok = ratio >= 0.99;
  return { ok, ratio, okCount, total: native.length, samples };
}

export async function runWispCwlPhase13M5Gate(opts = {}) {
  if (opts.apply !== false) applyWispPhase13Surfaces();
  else buildWispHoleManifest();
  const manifest = runWispM5SurfaceManifestGate();
  const routes = runWispM5RoutesGate();
  const preview = runWispM5PreviewGate();
  const coverage = await runWispM5RuntimeCoverageGate();
  const ok =
    manifest.ok === true &&
    routes.ok === true &&
    preview.ok === true &&
    coverage.ok === true;
  return {
    kind: WISP_CWL_PHASE13_M5_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE13_M5_SMOKE_SCHEMA_VERSION,
    ok,
    manifest,
    routes,
    preview,
    coverage,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispCwlPhase13M5SmokeGate(opts = {}) {
  const progress = createSmokeProgress("wisp-cwl-phase13-m5");
  const t0 = progress.start("WISP CWL Phase 13 M5 (G6400)");
  const gate = await runWispCwlPhase13M5Gate(opts);
  progress.end("WISP CWL Phase 13 M5 (G6400)", gate.ok === true, t0);
  return gate;
}

async function main() {
  const r = await runWispCwlPhase13M5SmokeGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase13-m5-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
