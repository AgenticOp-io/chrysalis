#!/usr/bin/env node
/**
 * Extract Module_Manager moduleTips into JSON for CWL islands (D6442/D6444).
 * Translates tip content from source — does not invent copy.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MODULE_TIPS_EXTRACT_KIND = "chrysalis.wisp.module-tips-extract";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {object} [opts]
 */
export function extractWispModuleTips(opts = {}) {
  const wispRoot = resolve(
    opts.wispRoot ??
      process.env.CHRYSALIS_WISP_ROOT ??
      process.env.WISP_MODULE_DIR ??
      "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
  );
  const tipsTs = join(wispRoot, "src/lib/config/moduleTips.ts");
  const outDir = resolve(opts.outDir ?? join(scriptRoot, "fixtures/hub-wisp-management"));
  const outJson = join(outDir, "wisp-module-tips.json");

  if (!existsSync(tipsTs)) {
    return { kind: MODULE_TIPS_EXTRACT_KIND, schemaVersion: 1, ok: false, skip: "missing-moduleTips" };
  }

  const raw = readFileSync(tipsTs, "utf8");
  /** @type {Record<string, object[]>} */
  const byModule = {};

  const moduleRe = /['"]([a-z0-9-]+)['"]\s*:\s*\[/g;
  let m;
  while ((m = moduleRe.exec(raw)) !== null) {
    const moduleId = m[1];
    const start = m.index + m[0].length - 1;
    let depth = 0;
    let end = start;
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === "[") depth++;
      else if (raw[i] === "]") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const block = raw.slice(start, end + 1);
    /** @type {object[]} */
    const tips = [];
    const tipRe =
      /\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*title:\s*['"]([^'"]*)['"]\s*,\s*icon:\s*['"]([^'"]*)['"]\s*,\s*content:\s*`([\s\S]*?)`\s*\}/g;
    let t;
    while ((t = tipRe.exec(block)) !== null) {
      tips.push({
        id: t[1],
        title: t[2],
        icon: t[3] || undefined,
        content: t[4].replace(/\$\{FIELD_APP_DOWNLOAD_PLACEHOLDER\}/g, "").trim(),
      });
    }
    if (tips.length === 0) {
      const tipRe2 =
        /\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*title:\s*['"]([^'"]*)['"]\s*,\s*content:\s*`([\s\S]*?)`\s*\}/g;
      while ((t = tipRe2.exec(block)) !== null) {
        tips.push({ id: t[1], title: t[2], content: t[3].trim() });
      }
    }
    if (tips.length) byModule[moduleId] = tips;
  }

  const doc = {
    kind: "chrysalis.wisp.module-tips",
    schemaVersion: 1,
    source: "Module_Manager/src/lib/config/moduleTips.ts",
    generatedAt: new Date().toISOString(),
    moduleCount: Object.keys(byModule).length,
    tipCount: Object.values(byModule).reduce((n, a) => n + a.length, 0),
    tips: byModule,
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outJson, `${JSON.stringify(doc, null, 2)}\n`, "utf8");

  return {
    kind: MODULE_TIPS_EXTRACT_KIND,
    schemaVersion: 1,
    ok: true,
    outJson: outJson.replace(/\\/g, "/"),
    moduleCount: doc.moduleCount,
    tipCount: doc.tipCount,
    modules: Object.keys(byModule).sort(),
  };
}

function main() {
  const r = extractWispModuleTips();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("extract-wisp-module-tips")) main();
