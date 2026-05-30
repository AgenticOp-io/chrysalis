#!/usr/bin/env node
/**
 * Export a .cwl file to WebIR golden JSON (stdout). Used by @chrysalis/runtime-cwl.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { liftCwlFileToWebir } from "./cwl-ingest.mjs";
import { loadWebir } from "./shared.mjs";

/**
 * @param {string} cwlPath
 */
export async function exportCwlFileToWebirJson(cwlPath) {
  const file = resolve(cwlPath);
  const source = readFileSync(file, "utf8");
  const webir = await loadWebir();
  const builder = new webir.ModuleBuilder({ sourceApp: "cwl-runtime" });
  const wr = webir.webRequest.builders(builder);
  liftCwlFileToWebir({
    webir,
    builder,
    wr,
    source,
    file,
    entryPath: file,
    language: "cwl",
  });
  const module = builder.finish();
  return webir.moduleToGoldenSnapshot(module);
}

async function main() {
  const cwlPath = process.argv[2];
  if (!cwlPath) {
    console.error("usage: export-cwl-webir.mjs <routes.cwl>");
    process.exit(1);
  }
  const json = await exportCwlFileToWebirJson(cwlPath);
  process.stdout.write(`${json}\n`);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
