#!/usr/bin/env node
/** WISP map/chart embed shell lift (G9680 / D6387). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_WISP_MAP_SHELL_KIND = "chrysalis.hub.wisp-map-shell-smoke";
export const HUB_WISP_MAP_SHELL_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runWispMapShellSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const ingest = await import(pathToFileURL(join(repoRoot, "packages/ingest/dist/index.js")).href);

  const map = ingest.liftStructuralSveltePageHtml(`<SharedMap />`);
  const coverage = ingest.liftStructuralSveltePageHtml(`<CoverageMapView><div>x</div></CoverageMapView>`);
  const chart = ingest.liftStructuralSveltePageHtml(`<TR069RSSIChart />`);
  const modal = ingest.liftStructuralSveltePageHtml(`<SiteEditModal />`);
  const widget = ingest.liftStructuralSveltePageHtml(`<CustomWidget />`);

  const checks = {
    mapShell: map?.html.includes('data-cwl-map-shell="SharedMap"') === true,
    coverageShell: coverage?.html.includes('data-cwl-map-shell="CoverageMapView"') === true,
    chartShell: chart?.html.includes('data-cwl-chart-shell="TR069RSSIChart"') === true,
    expandedModal: modal?.html.includes('data-cwl-modal-shell="SiteEditModal"') === true,
    widgetStillHoles: widget?.html.includes("legacy:markup-lift-svelte-component") === true,
    exportMapSet: ingest.DEFAULT_MAP_SHELL_COMPONENTS?.has("SharedMap") === true,
    exportChartSet: ingest.DEFAULT_CHART_SHELL_COMPONENTS?.has("TR069RSSIChart") === true,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_WISP_MAP_SHELL_KIND,
    schemaVersion: HUB_WISP_MAP_SHELL_SCHEMA_VERSION,
    ok,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runWispMapShellSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-map-shell-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
