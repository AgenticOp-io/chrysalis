#!/usr/bin/env node
/**
 * CWL formatter v1 (G1164): WebIR round-trip normalize route blocks.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { liftCwlFileToWebir } from "./cwl-ingest.mjs";
import { resolveCwlModuleFromPath } from "./cwl-module-graph.mjs";
import { listCwlRoutes, renderCwlRoutes } from "./hub-webir-routes.mjs";
import { loadWebir } from "./shared.mjs";

export const CWL_FMT_KIND = "chrysalis.cwl.fmt";
export const CWL_FMT_SCHEMA_VERSION = 1;

/**
 * @param {string} source
 * @param {string} cwlPath
 */
export async function formatCwlSource(source, cwlPath) {
  const webir = await loadWebir();
  const builder = new webir.ModuleBuilder({ sourceApp: "cwl-fmt" });
  const wr = webir.webRequest.builders(builder);
  liftCwlFileToWebir({
    webir,
    builder,
    wr,
    source,
    file: cwlPath,
    language: "cwl",
    entryPath: cwlPath,
  });
  const mod = builder.finish();
  const routes = listCwlRoutes(mod);
  const parsed = resolveCwlModuleFromPath(cwlPath);
  const header =
    source
      .split(/\r?\n/)
      .filter((l) => l.startsWith("#"))
      .join("\n") || "# Chrysalis Web Language";
  const { text } = renderCwlRoutes(routes, {
    header,
    moduleName: parsed.moduleName ?? "main",
  });
  const importLines = (parsed.imports ?? []).map((i) => `import "${i}";`).join("\n");
  if (!importLines) return text;
  const lines = text.split("\n");
  const modIdx = lines.findIndex((l) => /^module\s+/.test(l.trim()));
  if (modIdx < 0) return `${importLines}\n\n${text}`;
  lines.splice(modIdx + 1, 0, importLines, "");
  return `${lines.join("\n")}\n`;
}

/**
 * @param {string} cwlPath
 * @param {{ write?: boolean }} [opts]
 */
export async function formatCwlFile(cwlPath, opts = {}) {
  const path = resolve(cwlPath);
  const source = await readFile(path, "utf8");
  const formatted = await formatCwlSource(source, path);
  const changed = formatted !== source;
  if (opts.write !== false && changed) {
    await writeFile(path, formatted, "utf8");
  }
  return {
    kind: CWL_FMT_KIND,
    schemaVersion: CWL_FMT_SCHEMA_VERSION,
    ok: true,
    path,
    changed,
    byteLength: formatted.length,
  };
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: cwl-fmt.mjs <path/to/file.cwl>");
    process.exit(2);
  }
  const report = await formatCwlFile(path);
  console.log(JSON.stringify(report, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
