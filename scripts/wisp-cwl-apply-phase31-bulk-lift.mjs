#!/usr/bin/env node
/**
 * Phase 31 — bulk SvelteKit → CWL @page lift (replaces Phase 27c/28g UI stubs).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { applyWispBulkSvelteLift, WISP_BULK_LIFT_KIND } from "./wisp-cwl-bulk-lift-lib.mjs";
import { routesPath } from "./wisp-cwl-apply-surfaces-lib.mjs";
import { reconcilePreviewFromRoutesCwl } from "./wisp-cwl-apply-module-routes-lib.mjs";
import { buildWispHoleManifest } from "./wisp-cwl-hole-manifest.mjs";
import { scanWispRoutesForForbiddenStubs } from "./wisp-cwl-ui-parity-verify.mjs";

export const WISP_PHASE31_BULK_LIFT_KIND = WISP_BULK_LIFT_KIND;

/** @param {object} [opts] */
export function applyWispPhase31BulkLift(opts = {}) {
  const path = opts.routesPath ?? routesPath;
  if (!existsSync(path)) {
    return { kind: WISP_PHASE31_BULK_LIFT_KIND, schemaVersion: 1, ok: false, skip: "missing-routes-cwl" };
  }

  const lift = applyWispBulkSvelteLift({ ...opts, routesPath: path });
  if (!lift.ok) {
    return { kind: WISP_PHASE31_BULK_LIFT_KIND, schemaVersion: 1, ok: false, skip: lift.skip, path: lift.path };
  }

  writeFileSync(path, lift.text, "utf8");
  const preview = reconcilePreviewFromRoutesCwl();
  const holeManifest = buildWispHoleManifest();
  const stubScan = scanWispRoutesForForbiddenStubs({ routesPath: path });
  const routesText = readFileSync(path, "utf8");
  const htmlPageCount = (routesText.match(/^@page\s+GET/gm) ?? []).length;

  return {
    kind: WISP_PHASE31_BULK_LIFT_KIND,
    schemaVersion: 1,
    ok: htmlPageCount >= 80 && lift.lifted + lift.shelled + lift.unchanged >= lift.routeCount - lift.skipped,
    routeCount: lift.routeCount,
    lifted: lift.lifted,
    shelled: lift.shelled,
    skipped: lift.skipped,
    unchanged: lift.unchanged,
    missingSvelte: lift.missingSvelte,
    htmlPageCount,
    stubScan,
    preview,
    holeManifest,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = applyWispPhase31BulkLift();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-phase31-bulk-lift")) main();
