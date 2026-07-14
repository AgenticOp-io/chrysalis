#!/usr/bin/env node
/**
 * G9904 — no leaked Svelte arrow-fn tails (`true}` / `/>`) in WISP CWL HTML.
 *
 * Run: pnpm run hub:wisp-cwl-markup-artifact-smoke
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const WISP_CWL_MARKUP_ARTIFACT_SMOKE_KIND = "chrysalis.wisp.cwl-markup-artifact-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadLift() {
  try {
    const ingest = await import("@chrysalis/ingest");
    return ingest.liftStructuralSveltePageHtml;
  } catch {
    const mod = await import(
      pathToFileURL(join(ROOT, "packages/ingest/dist/ui-markup-svelte-structural.js")).href
    );
    return mod.liftStructuralSveltePageHtml;
  }
}

function walkHtml(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkHtml(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

function countArtifacts(text) {
  const re = /\s(?:true|false)\}\s*(?:\r?\n\s*)?\/>/g;
  return (text.match(re) || []).length;
}

export async function runWispCwlMarkupArtifactSmoke() {
  const liftStructuralSveltePageHtml = await loadLift();
  const sample = liftStructuralSveltePageHtml(`<div>
      <ModuleWizardMenu
        wizards={getWizardsForPath('/modules/hardware')}
        on:select={() => showEPCWizard = true}
      />
</div>`);
  const liftClean =
    sample !== null &&
    sample.html.includes("data-cwl-nav-shell") &&
    countArtifacts(sample.html) === 0 &&
    !sample.html.includes("true}");

  const routesPath = join(ROOT, "fixtures/hub-wisp-management/routes.cwl");
  const routes = existsSync(routesPath) ? readFileSync(routesPath, "utf8") : "";
  const routesArtifacts = countArtifacts(routes);

  const exportDir = join(ROOT, "fixtures/hub-wisp-management/cwl-static-export");
  let exportArtifacts = 0;
  let exportFiles = 0;
  for (const file of walkHtml(exportDir)) {
    exportFiles++;
    exportArtifacts += countArtifacts(readFileSync(file, "utf8"));
  }

  const ok = liftClean && routesArtifacts === 0 && exportArtifacts === 0;
  return {
    kind: WISP_CWL_MARKUP_ARTIFACT_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    liftClean,
    routesArtifacts,
    exportArtifacts,
    exportFiles,
    note: "Arrow-fn props must not leave true}/ /> tails after shell substitution",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlMarkupArtifactSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-markup-artifact-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
