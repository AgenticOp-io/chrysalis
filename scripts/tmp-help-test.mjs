import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const scriptRoot = "C:/Users/david/AgenticOps/engines/PHP_converter";
const wispRoot = "C:/Users/david/AgenticOps/products/wisptools/Module_Manager";
const ingest = await import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);

// Reuse the converter's lib-const inliner via a fresh import of the module.
const pieces = await import(pathToFileURL(join(scriptRoot, "scripts/lib/convert-origin-pieces.mjs")).href);

const pageFile = join(wispRoot, "src/routes/modules/plan/+page.svelte");
let raw = readFileSync(pageFile, "utf8");

// inlineLibConstLiterals is not exported; emulate through convert path if needed.
if (typeof pieces.inlineLibConstLiterals === "function") {
  raw = pieces.inlineLibConstLiterals(raw, wispRoot);
} else {
  console.log("inlineLibConstLiterals not exported; testing via manual append");
  const docs = readFileSync(join(wispRoot, "src/lib/docs/plan-docs.ts"), "utf8");
  const m = /export const planDocs\s*=\s*`([\s\S]*?)`;/.exec(docs);
  raw += "\n<script>\nconst planDocs = `" + m[1] + "`;\n</script>";
}

const componentSources = ingest.indexSvelteComponentSources(join(wispRoot, "src"));
const inline = new Set([...(ingest.DEFAULT_STRUCTURAL_INLINE_COMPONENTS ?? []), "HelpModal", "TipsModal"]);
const lifted = ingest.liftStructuralSveltePageHtml(raw, {
  applyShowcaseLoadBools: true,
  promoteRuntimeBindings: true,
  componentSources,
  structuralInlineComponents: inline,
});
const html = lifted?.html ?? "";
const i = html.indexOf('data-cwl-lifted-component="HelpModal"');
console.log("helpShellIdx:", i);
if (i >= 0) {
  const seg = html.slice(i, i + 3000);
  console.log("hasPlanModuleHelpTitle:", seg.includes("Plan Module Help"));
  console.log("hasKeyFeatures:", html.slice(i).includes("Key Features"));
  console.log("shellLen(first 3000):");
  console.log(seg.slice(0, 1200));
}
