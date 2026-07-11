#!/usr/bin/env node
/**
 * G9490 / D6370 — WISP remaining-holes finish smoke.
 *
 * Re-lift with layout passthrough, re-bind with structural hydration,
 * regenerate static export with document shell, assert hole reduction +
 * export freshness. GenieACS remains permanently out of scope.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWispCwlStaticExport } from "../wisp-cwl-static-export.mjs";
import { countWispMarkupHoles } from "../wisp-hole-metrics-lib.mjs";

export const WISP_REMAINING_HOLES_FINISH_KIND = "chrysalis.hub.wisp-remaining-holes-finish";
export const WISP_REMAINING_HOLES_FINISH_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function countHoles(cwlText) {
  const m = countWispMarkupHoles(cwlText);
  return { total: m.total, reasons: m.reasons };
}

export async function runWispRemainingHolesFinishSmoke(opts = {}) {
  const root = resolve(opts.repoRoot ?? scriptRoot);
  const wisp = resolve(
    opts.wispRoot ??
      process.env.CHRYSALIS_WISP_ROOT ??
      "C:/Users/david/Downloads/WISPTools/Module_Manager",
  );
  const fixture = join(root, "fixtures/hub-wisp-management");
  const fixtureCwl = join(fixture, "routes.cwl");
  const tracesDir = join(fixture, "wisp-api-pilot-traces");

  if (!existsSync(join(wisp, "src", "routes")) && !existsSync(join(wisp, "package.json"))) {
    return {
      kind: WISP_REMAINING_HOLES_FINISH_KIND,
      schemaVersion: WISP_REMAINING_HOLES_FINISH_SCHEMA_VERSION,
      ok: true,
      skip: "wisp-root-missing",
      wispRoot: wisp,
    };
  }
  if (!existsSync(fixtureCwl) || !existsSync(tracesDir)) {
    return {
      kind: WISP_REMAINING_HOLES_FINISH_KIND,
      schemaVersion: WISP_REMAINING_HOLES_FINISH_SCHEMA_VERSION,
      ok: false,
      skip: "fixture-missing",
    };
  }

  const before = countHoles(readFileSync(fixtureCwl, "utf8"));
  const ingest = await import(pathToFileURL(join(root, "packages/ingest/dist/index.js")).href);
  const emitShared = await import(pathToFileURL(join(root, "packages/emit-shared/dist/index.js")).href);

  // CSS + structural convert (layout passthrough now in lift)
  const cssLift = ingest.liftProjectUiAssets({ projectDir: wisp });
  if (!cssLift.ok || "skip" in cssLift) {
    return {
      kind: WISP_REMAINING_HOLES_FINISH_KIND,
      schemaVersion: WISP_REMAINING_HOLES_FINISH_SCHEMA_VERSION,
      ok: false,
      skip: "css-lift-failed",
      cssLift,
    };
  }
  const fixtureUiAssets = join(fixture, ".chrysalis", "ui-assets");
  mkdirSync(fixtureUiAssets, { recursive: true });
  cpSync(join(wisp, ".chrysalis", "ui-assets"), fixtureUiAssets, { recursive: true });

  const genCwl = join(wisp, "generated", "cwl", "routes.cwl");
  mkdirSync(dirname(genCwl), { recursive: true });
  cpSync(fixtureCwl, genCwl);

  const convert = ingest.convertSiteProjectUi({
    projectDir: wisp,
    cwlPaths: [genCwl, fixtureCwl],
    markupMode: "structural-shell",
    writeReport: true,
    tracesDir: undefined,
  });

  const known = new Set(
    convert.uiMarkup.ok && "bundles" in convert.uiMarkup
      ? convert.uiMarkup.bundles.map((b) => b.routeId)
      : [],
  );
  let cwlText = readFileSync(fixtureCwl, "utf8");
  const holes = emitShared.applyNoSourceMarkupHolesToCwlSource({
    cwlSource: cwlText,
    knownSourcePaths: known,
    onlyDemoShells: true,
  });
  writeFileSync(fixtureCwl, holes.text, "utf8");
  cpSync(fixtureCwl, genCwl);

  const bind = ingest.bindSiteProjectLoadFromTraces({
    tracesDir,
    cwlPaths: [fixtureCwl, genCwl],
    seedApiPaths: true,
  });

  const after = countHoles(readFileSync(fixtureCwl, "utf8"));
  const htmlHydrated = bind.routes.filter((r) => r.htmlHydrated).length;
  const componentHolesAfter = after.reasons["legacy:markup-lift-svelte-component"] ?? 0;
  // Pre-G9490 baseline was 188 component holes including TenantGuard wrappers.
  const G9480_COMPONENT_HOLE_BASELINE = 188;
  const tenantGuardInCwl = /data-cwl-hole-detail=\\"TenantGuard\\"/.test(
    readFileSync(fixtureCwl, "utf8"),
  );

  const exportResult = await runWispCwlStaticExport();
  const dashExport = join(fixture, "cwl-static-export/dashboard/index.html");
  const addExport = join(fixture, "cwl-static-export/modules/hardware/add/index.html");
  const dashHtml = existsSync(dashExport) ? readFileSync(dashExport, "utf8") : "";
  const addHtml = existsSync(addExport) ? readFileSync(addExport, "utf8") : "";

  const summary = {
    kind: WISP_REMAINING_HOLES_FINISH_KIND,
    schemaVersion: WISP_REMAINING_HOLES_FINISH_SCHEMA_VERSION,
    ok:
      convert.ok === true &&
      bind.ok === true &&
      exportResult.ok === true &&
      componentHolesAfter < G9480_COMPONENT_HOLE_BASELINE &&
      tenantGuardInCwl === false &&
      dashHtml.includes("<!DOCTYPE html>") &&
      dashHtml.includes("stylesheet") &&
      !dashHtml.includes('data-cwl-hole-detail="TenantGuard"') &&
      !dashHtml.includes('data-cwl-component="TenantGuard"') &&
      addHtml.includes("legacy:markup-no-source-route") &&
      !addHtml.includes("wisp-module-demo"),
    skip: null,
    holesBefore: before,
    holesAfter: after,
    holesDelta: after.total - before.total,
    componentHolesBaseline: G9480_COMPONENT_HOLE_BASELINE,
    componentHolesAfter,
    tenantGuardInCwl,
    htmlHydratedRoutes: htmlHydrated,
    export: {
      ok: exportResult.ok === true,
      pageCount: exportResult.pageCount ?? 0,
      exportedCount: exportResult.exportedCount ?? 0,
      dashboardHasShell: dashHtml.includes("<!DOCTYPE html>"),
      dashboardHasCss: dashHtml.includes("stylesheet"),
      addHasNoSourceHole: addHtml.includes("legacy:markup-no-source-route"),
    },
    genieacsOutOfScope: true,
  };
  return summary;
}

async function main() {
  const summary = await runWispRemainingHolesFinishSmoke();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-remaining-holes-finish-smoke")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
