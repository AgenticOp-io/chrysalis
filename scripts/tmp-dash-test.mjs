import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const scriptRoot = "C:/Users/david/AgenticOps/engines/PHP_converter";
const wispRoot = "C:/Users/david/AgenticOps/products/wisptools/Module_Manager";
const ingest = await import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);

const componentSources = ingest.indexSvelteComponentSources(join(wispRoot, "src"));
const raw = readFileSync(join(wispRoot, "src/lib/components/GlobalSettings.svelte"), "utf8");
const lifted = ingest.liftStructuralSveltePageHtml(raw, {
  loadBools: { show: true },
  applyShowcaseLoadBools: false,
  promoteRuntimeBindings: true,
  componentSources,
  structuralInlineComponents: new Set(["GlobalSettings"]),
});
console.log("GlobalSettings own lift:", lifted === null ? "NULL" : `mode=${lifted.liftMode} len=${lifted.html.length} holes=${lifted.holes.length}`);
if (lifted) {
  console.log("hole details:", JSON.stringify(lifted.holes.slice(0, 10)));
  console.log("has UME hole:", lifted.html.includes('data-cwl-hole-detail="UserManagementEmbedded"'));
  console.log("has UME lifted:", lifted.html.includes('data-cwl-lifted-component="UserManagementEmbedded"'));
}
