#!/usr/bin/env node
/**
 * Apply WISP Phase 13 M5 — lift all remaining page-component holes to @page + load shells.
 * Leaves /login as hub-svelte:firebase-auth. Target: ≥99% native CWL pages on UI routes.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fixtureDir, routesPath, previewPath } from "./wisp-cwl-apply-surfaces-lib.mjs";
import {
  buildLiftSpecsFromRoutesCwl,
  writeRoutesCwlFromLift,
  reconcilePreviewFromRoutesCwl,
  countStrayHoledRoutes,
} from "./wisp-cwl-apply-module-routes-lib.mjs";

export const WISP_M5_SURFACE_MANIFEST_KIND = "chrysalis.wisp.m5-surface-manifest";
export const WISP_M5_SURFACE_MANIFEST_SCHEMA_VERSION = 1;

const manifestPath = join(fixtureDir, "wisp-m5-surface-manifest.v1.json");

export const M5_SKIP_PATHS = ["/login"];

/** Max native ratio when /login remains hub-svelte:firebase-auth (86/87 UI routes). */
export function m5CutoverSatisfied(cutover) {
  return (
    cutover.loginFirebaseHole === true &&
    cutover.uiHoleCount === 1 &&
    cutover.nativePageCount >= cutover.uiRouteCount - 1
  );
}

export function applyM5SurfacesToRoutesCwl() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  let lifted = 0;
  for (let pass = 0; pass < 5; pass++) {
    const specs = buildLiftSpecsFromRoutesCwl("wisp-m5", { skipPaths: M5_SKIP_PATHS });
    if (specs.length === 0) break;
    const applied = writeRoutesCwlFromLift(readFileSync(routesPath, "utf8"), specs);
    if (!applied.ok) return applied;
    lifted += specs.length;
  }
  const text = readFileSync(routesPath, "utf8");
  const stray = countStrayHoledRoutes(text);
  if (stray > 0) return { ok: false, skip: "m5-stray-holed-routes", stray };
  return { ok: true, routesPath, lifted };
}

export function applyM5SurfacesToPreview() {
  return reconcilePreviewFromRoutesCwl();
}

export function buildM5SurfaceManifest() {
  if (!existsSync(previewPath)) return { ok: false, skip: "missing-cwl-preview", manifestPath };
  const preview = JSON.parse(readFileSync(previewPath, "utf8"));
  const routes = preview.routes ?? [];
  const uiRoutes = routes.length;
  const holed = routes.filter((r) => r.hole === true);
  const nativePages = routes.filter((r) => r.hole === false);
  const nativeRatio = uiRoutes > 0 ? nativePages.length / uiRoutes : 0;
  const loginOnlyHole =
    holed.length === 1 && holed[0]?.path === "/login" && holed[0]?.holeReason === "hub-svelte:firebase-auth";
  const cutover = {
    uiRouteCount: uiRoutes,
    nativePageCount: nativePages.length,
    uiHoleCount: holed.length,
    nativeRatio: Math.round(nativeRatio * 10000) / 10000,
    loginFirebaseHole: loginOnlyHole,
  };
  const ok = m5CutoverSatisfied(cutover);
  const manifest = {
    kind: WISP_M5_SURFACE_MANIFEST_KIND,
    schemaVersion: WISP_M5_SURFACE_MANIFEST_SCHEMA_VERSION,
    ok,
    wave: "M5",
    cutover,
    surfaces: {
      pages: "all UI routes except /login",
      uiHoles: [{ path: "/login", reason: "hub-svelte:firebase-auth", rfc: "CWL-RFC-0012" }],
      note: "Interactive widgets remain sidecar; shells are native CWL Pages + Data load",
    },
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...manifest, manifestPath };
}

/** @param {object} [opts] */
export function applyWispM5Surfaces(opts = {}) {
  const routes = opts.skipRoutes ? { ok: true, skip: "skip-routes" } : applyM5SurfacesToRoutesCwl();
  const preview = opts.skipPreview ? { ok: true, skip: "skip-preview" } : applyM5SurfacesToPreview();
  const manifest = buildM5SurfaceManifest();
  const routesOk = routes.ok === true;
  const ok = routesOk && preview.ok !== false && manifest.ok === true;
  return { ok, routes, preview, manifest };
}

async function main() {
  const r = applyWispM5Surfaces();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-m5-surfaces")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
