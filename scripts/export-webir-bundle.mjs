/**
 * Wrap a Chrysalis WebIR module snapshot (golden JSON) in a chrysalis.webir.bundle envelope
 * for import by theorem6/wptp-ir (WPTP D2).
 *
 * Usage:
 *   node scripts/export-webir-bundle.mjs --in packages/ingest/tests/golden/tiny-blog.webir.json --out /tmp/tiny-blog.webir.bundle.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function usage() {
  process.stderr.write(
    "Usage: node scripts/export-webir-bundle.mjs --in <module.webir.json> --out <bundle.json>\n",
  );
  process.exit(1);
}

function parseArgs(argv) {
  let input = null;
  let output = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--in" && argv[i + 1]) input = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) output = argv[++i];
  }
  if (!input || !output) usage();
  return { input: resolve(input), output: resolve(output) };
}

const { input, output } = parseArgs(process.argv.slice(2));
const module = JSON.parse(readFileSync(input, "utf8"));
if (!module?.meta || !Array.isArray(module.nodes) || !Array.isArray(module.roots)) {
  process.stderr.write("export-webir-bundle: input does not look like a WebIR module snapshot\n");
  process.exit(1);
}

const bundle = {
  format: "chrysalis.webir.bundle",
  bundleVersion: "1.0.0",
  module,
};

writeFileSync(output, `${JSON.stringify(bundle, null, 2)}\n`);
console.log(`Wrote ${output}`);
