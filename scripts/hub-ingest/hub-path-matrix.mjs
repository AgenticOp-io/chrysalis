#!/usr/bin/env node
/**
 * Dump the full Translation Hub path matrix (origin×output ingest/IR/emit/verify).
 * Usage:
 *   node scripts/hub-ingest/hub-path-matrix.mjs
 *   node scripts/hub-ingest/hub-path-matrix.mjs --origin python --output java
 *   node scripts/hub-ingest/hub-path-matrix.mjs --json-out reports/ci/hub-path-matrix.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHubTranslationPathMatrix } from "./hub-translation-paths.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  let origin = null;
  let output = null;
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  return { origin, output, jsonOut };
}

async function main() {
  const { origin, output, jsonOut } = parseArgs(process.argv);
  const matrix = buildHubTranslationPathMatrix({
    origin: origin ?? undefined,
    output: output ?? undefined,
  });

  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  }

  process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
