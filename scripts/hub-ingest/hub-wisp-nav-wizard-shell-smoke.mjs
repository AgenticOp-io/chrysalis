#!/usr/bin/env node
/** WISP nav/wizard shell lift smoke (G9710 / D6390). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_WISP_NAV_WIZARD_SHELL_KIND = "chrysalis.hub.wisp-nav-wizard-shell-smoke";
export const HUB_WISP_NAV_WIZARD_SHELL_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runWispNavWizardShellSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const ingest = await import(pathToFileURL(join(repoRoot, "packages/ingest/dist/index.js")).href);

  const menu = ingest.liftStructuralSveltePageHtml(`<MainMenu />`);
  const wizardMenu = ingest.liftStructuralSveltePageHtml(`<ModuleWizardMenu />`);
  const crumb = ingest.liftStructuralSveltePageHtml(`<AdminBreadcrumb />`);
  const wizard = ingest.liftStructuralSveltePageHtml(`<DeploymentWizard />`);
  const widget = ingest.liftStructuralSveltePageHtml(`<CustomWidget />`);

  const checks = {
    mainMenuShell: menu?.html.includes('data-cwl-nav-shell="MainMenu"') === true,
    // ModuleWizardMenu is structural-inline (not empty nav shell) — without sources → component hole.
    wizardMenuNotNavShell:
      wizardMenu?.html.includes('data-cwl-nav-shell="ModuleWizardMenu"') !== true &&
      /ModuleWizardMenu/.test(wizardMenu?.html ?? "") === true,
    breadcrumbShell: crumb?.html.includes('data-cwl-nav-shell="AdminBreadcrumb"') === true,
    wizardShell: wizard?.html.includes('data-cwl-wizard-shell="DeploymentWizard"') === true,
    widgetStillHoles: widget?.html.includes("legacy:markup-lift-svelte-component") === true,
    exportNavSet: ingest.DEFAULT_NAV_SHELL_COMPONENTS?.has("MainMenu") === true,
    exportWizardMenuStructural:
      ingest.DEFAULT_STRUCTURAL_INLINE_COMPONENTS?.has("ModuleWizardMenu") === true &&
      ingest.DEFAULT_NAV_SHELL_COMPONENTS?.has("ModuleWizardMenu") !== true,
    exportWizardSet: ingest.DEFAULT_WIZARD_SHELL_COMPONENTS?.has("DeploymentWizard") === true,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_WISP_NAV_WIZARD_SHELL_KIND,
    schemaVersion: HUB_WISP_NAV_WIZARD_SHELL_SCHEMA_VERSION,
    ok,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runWispNavWizardShellSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-nav-wizard-shell-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
