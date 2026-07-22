import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const scriptRoot = "C:/Users/david/AgenticOps/engines/PHP_converter";
const wispRoot = "C:/Users/david/AgenticOps/products/wisptools/Module_Manager";
const ingest = await import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);

const componentSources = ingest.indexSvelteComponentSources(join(wispRoot, "src"));
console.log("has UserManagementEmbedded:", componentSources.has("UserManagementEmbedded"));
console.log("has BrandingManagement:", componentSources.has("BrandingManagement"));
console.log("has ImportSystem:", componentSources.has("ImportSystem"));
console.log("has SubscriberList:", componentSources.has("SubscriberList"));
console.log("has RemoteEPCs:", componentSources.has("RemoteEPCs"));

for (const n of ["UserManagementEmbedded", "SubscriberList", "RemoteEPCs"]) {
  const p = componentSources.get(n);
  if (!p) continue;
  const raw = readFileSync(p, "utf8");
  const lifted = ingest.liftStructuralSveltePageHtml(raw, {
    loadBools: { show: true },
    applyShowcaseLoadBools: false,
    promoteRuntimeBindings: true,
    componentSources,
    structuralInlineComponents: new Set([n]),
  });
  console.log(n, "lift:", lifted === null ? "NULL" : `mode=${lifted.liftMode} len=${lifted.html?.length} holes=${lifted.holes?.length}`);
}
