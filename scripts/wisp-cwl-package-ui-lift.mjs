#!/usr/bin/env node
/**
 * WISP package UI lift — replaces legacy Phase 31 Svelte-only bulk lift for
 * routes that the G9300/G9306 adapters can handle (DESIGN D6366, G9410).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { routesPath } from "./wisp-cwl-apply-surfaces-lib.mjs";
import { WISP_BULK_LIFT_SKIP_PATHS } from "./wisp-cwl-bulk-lift-lib.mjs";

export const WISP_PACKAGE_UI_LIFT_KIND = "chrysalis.wisp.package-ui-lift";
export const WISP_PACKAGE_UI_LIFT_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  }
}

/**
 * @param {object} [opts]
 * @param {string} [opts.wispRoot]
 * @param {string} [opts.routesPath]
 */
export async function applyWispPackageUiLift(opts = {}) {
  const wispRoot = resolve(
    opts.wispRoot ??
      process.env.CHRYSALIS_WISP_ROOT ??
      process.env.WISP_MODULE_DIR ??
      "C:/Users/david/Downloads/WISPTools/Module_Manager",
  );
  const path = opts.routesPath ?? routesPath;
  if (!existsSync(path)) {
    return {
      kind: WISP_PACKAGE_UI_LIFT_KIND,
      schemaVersion: WISP_PACKAGE_UI_LIFT_SCHEMA_VERSION,
      ok: false,
      skip: "missing-routes-cwl",
      wispRoot,
    };
  }

  const ingest = await loadIngest();
  const convert = ingest.convertSiteProjectUi({
    projectDir: wispRoot,
    cwlPaths: [path],
  });

  const routesText = readFileSync(path, "utf8");
  const htmlPageCount = (routesText.match(/^@page\s+GET/gm) ?? []).length;
  const patch = convert.cwlPatches[0] ?? null;

  return {
    kind: WISP_PACKAGE_UI_LIFT_KIND,
    schemaVersion: WISP_PACKAGE_UI_LIFT_SCHEMA_VERSION,
    ok: convert.ok === true,
    wispRoot,
    routesPath: path,
    uiAssets: summarizeLift(convert.uiAssets),
    uiMarkup: summarizeLift(convert.uiMarkup),
    cwlPatch: patch,
    htmlPageCount,
    skipPaths: [...WISP_BULK_LIFT_SKIP_PATHS],
    generatedAt: new Date().toISOString(),
  };
}

/** @param {import("@chrysalis/ingest").LiftProjectUiAssetsResult | import("@chrysalis/ingest").LiftProjectUiMarkupResult} lift */
function summarizeLift(lift) {
  if (!lift.ok) return { ok: false, hole: lift.hole?.reason ?? "lift-failed" };
  if ("skip" in lift) return { ok: true, skip: lift.skip };
  return {
    ok: true,
    framework: "framework" in lift ? lift.framework : null,
    bundleCount: "bundles" in lift ? lift.bundles.length : null,
    mapPath: "written" in lift ? lift.written.mapPath : null,
  };
}

function main() {
  applyWispPackageUiLift().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    if (!r.ok) process.exit(1);
  });
}

if (process.argv[1]?.includes("wisp-cwl-package-ui-lift")) main();
