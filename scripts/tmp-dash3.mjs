import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const scriptRoot = "C:/Users/david/AgenticOps/engines/PHP_converter";
const wispRoot = "C:/Users/david/AgenticOps/products/wisptools/Module_Manager";
const ingest = await import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);

const componentSources = ingest.indexSvelteComponentSources(join(wispRoot, "src"));
const raw = readFileSync(join(wispRoot, "src/routes/dashboard/+page.svelte"), "utf8");

// Full converter-equivalent inline set
const inline = new Set(ingest.DEFAULT_STRUCTURAL_INLINE_COMPONENTS ?? []);
for (const [name, abs] of componentSources) {
  const p = abs.replace(/\\/g, "/");
  if (
    p.includes("/lib/components/") &&
    !/(?:Chart|Map)$/.test(name) &&
    /(?:Modal|Wizard|Menu|Panel|Widget|Manager|Switcher|Connections|Plans|Stats|BulkImport|CardForm|DeviceRow)$/.test(name)
  ) {
    inline.add(name);
  }
}
const impRe = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)\.svelte['"]/g;
let m;
while ((m = impRe.exec(raw))) {
  const name = m[1];
  if (!componentSources.has(name)) continue;
  if (/(?:Chart|Map)$/.test(name)) continue;
  const spec = m[2].replace(/\\/g, "/");
  if (/(?:^|\/)components\//.test(spec) || /\/modules\//.test(spec) || /(?:Modal|Wizard|Menu|Panel|Widget)$/.test(name)) inline.add(name);
}
console.log("inline size", inline.size, "hasGS", inline.has("GlobalSettings"), "hasBM", inline.has("BrandingManagement"));
const lifted = ingest.liftStructuralSveltePageHtml(raw, {
  applyShowcaseLoadBools: true,
  promoteRuntimeBindings: true,
  componentSources,
  structuralInlineComponents: inline,
  loadBools: { isDeployMode: false, hideStats: false, isLoading: false, loading: false, error: false, success: false },
});
console.log("mode", lifted.liftMode, "holes", lifted.holes.length, JSON.stringify(lifted.holes.slice(0, 8)));
console.log("UME lifted:", lifted.html.includes('data-cwl-lifted-component="UserManagementEmbedded"'));
console.log("UME hole:", lifted.html.includes('data-cwl-hole-detail="UserManagementEmbedded"'));
