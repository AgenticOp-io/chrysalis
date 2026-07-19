import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_WIZARD_CATALOG_KIND = "chrysalis.wisp-wizard-catalog";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function extractWispWizardCatalog(opts = {}) {
  const wispRoot = resolve(
    opts.wispRoot ??
      process.env.CHRYSALIS_WISP_ROOT ??
      process.env.WISP_MODULE_DIR ??
      "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
  );
  const sourcePath = join(wispRoot, "src/lib/config/wizardCatalog.ts");
  const outPath = resolve(
    opts.outPath ?? join(repoRoot, "fixtures/hub-wisp-management/wisp-wizard-catalog.json"),
  );
  if (!existsSync(sourcePath)) {
    return {
      kind: WISP_WIZARD_CATALOG_KIND,
      schemaVersion: 1,
      ok: false,
      skip: "missing-wizard-catalog-source",
      sourcePath,
    };
  }
  const source = readFileSync(sourcePath, "utf8");
  const entries = [];
  const entryRe =
    /\{\s*id:\s*(['"])(.*?)\1\s*,\s*label:\s*(['"])(.*?)\3\s*,\s*icon:\s*(['"])(.*?)\5\s*,\s*path:\s*(['"])(.*?)\7\s*\}/g;
  let match;
  while ((match = entryRe.exec(source)) !== null) {
    entries.push({ id: match[2], label: match[4], icon: match[6], path: match[8] });
  }
  const wizardsByPath = {};
  for (const entry of entries) {
    (wizardsByPath[entry.path] ??= []).push({
      id: entry.id,
      label: entry.label,
      icon: entry.icon,
    });
  }
  const doc = {
    kind: WISP_WIZARD_CATALOG_KIND,
    schemaVersion: 1,
    source: "Module_Manager/src/lib/config/wizardCatalog.ts",
    generatedAt: new Date().toISOString(),
    entryCount: entries.length,
    wizardsByPath,
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  return {
    kind: WISP_WIZARD_CATALOG_KIND,
    schemaVersion: 1,
    ok: entries.length > 0,
    sourcePath,
    outPath,
    entryCount: entries.length,
    pathCount: Object.keys(wizardsByPath).length,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = extractWispWizardCatalog();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}
