#!/usr/bin/env node
/** WISP modal shell lift smoke (G9660 / D6383). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_WISP_MODAL_SHELL_KIND = "chrysalis.hub.wisp-modal-shell-smoke";
export const HUB_WISP_MODAL_SHELL_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runWispModalShellSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const ingest = await import(
    pathToFileURL(join(repoRoot, "packages/ingest/dist/index.js")).href
  );

  const tips = ingest.liftStructuralSveltePageHtml(`<TipsModal />`);
  const help = ingest.liftStructuralSveltePageHtml(`<HelpModal><p>Help text</p></HelpModal>`);
  const widget = ingest.liftStructuralSveltePageHtml(`<CustomWidget />`);

  const checks = {
    tipsShell: tips?.html.includes('data-cwl-modal-shell="TipsModal"') === true,
    tipsNoComponentHole: !tips?.html.includes("legacy:markup-lift-svelte-component"),
    helpShell: help?.html.includes('data-cwl-modal-shell="HelpModal"') === true,
    helpKeepsContent: help?.html.includes("Help text") === true,
    expandedModal: ingest.DEFAULT_MODAL_SHELL_COMPONENTS?.has("SiteEditModal") === true,
    widgetStillHoles: widget?.html.includes("legacy:markup-lift-svelte-component") === true,
    exportModalSet: ingest.DEFAULT_MODAL_SHELL_COMPONENTS?.has("TipsModal") === true,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_WISP_MODAL_SHELL_KIND,
    schemaVersion: HUB_WISP_MODAL_SHELL_SCHEMA_VERSION,
    ok,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runWispModalShellSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-modal-shell-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
