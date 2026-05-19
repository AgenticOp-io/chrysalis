/**
 * CI helper: import a chrysalis.webir.bundle via theorem6/wptp-ir and assert zero losses.
 *
 * Env:
 *   WPTP_IR_ROOT        path to wptp-ir checkout (required)
 *   WEBIR_BUNDLE_PATH   bundle JSON file (required)
 *
 * Optional flags:
 *   --bundle <path>     overrides WEBIR_BUNDLE_PATH
 *   --expect-nodes N    default 325 (tiny-blog flagship)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function usage() {
  process.stderr.write(
    "Usage: WPTP_IR_ROOT=... WEBIR_BUNDLE_PATH=... node --import tsx scripts/verify-webir-bundle-wptp-ir.mjs\n" +
      "       node --import tsx scripts/verify-webir-bundle-wptp-ir.mjs --bundle <path> [--expect-nodes N]\n",
  );
  process.exit(1);
}

function parseArgs(argv) {
  let bundle = process.env.WEBIR_BUNDLE_PATH ?? null;
  let expectNodes = 325;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--bundle" && argv[i + 1]) bundle = argv[++i];
    else if (argv[i] === "--expect-nodes" && argv[i + 1]) expectNodes = Number(argv[++i]);
    else if (argv[i] === "-h" || argv[i] === "--help") usage();
  }
  return { bundle, expectNodes };
}

const wptpRoot = process.env.WPTP_IR_ROOT;
if (!wptpRoot) {
  process.stderr.write("verify-webir-bundle-wptp-ir: WPTP_IR_ROOT is required\n");
  process.exit(1);
}

const { bundle, expectNodes } = parseArgs(process.argv.slice(2));
if (!bundle) {
  process.stderr.write("verify-webir-bundle-wptp-ir: WEBIR_BUNDLE_PATH or --bundle is required\n");
  process.exit(1);
}

const bundlePath = resolve(bundle);
const { importWebIrBundleJson, summarizeLosses, assertIrDocumentV0 } = await import(
  pathToFileURL(resolve(wptpRoot, "src/index.ts")).href,
);

const raw = JSON.parse(readFileSync(bundlePath, "utf8"));
const doc = importWebIrBundleJson(raw);
assertIrDocumentV0(doc);
const s = summarizeLosses(doc);

if (s.lossCount !== 0) {
  process.stderr.write(
    `verify-webir-bundle-wptp-ir: expected zero losses, got ${s.lossCount} (${JSON.stringify(s.byCategory)})\n`,
  );
  process.exit(1);
}

if (s.importedNodes !== expectNodes) {
  process.stderr.write(
    `verify-webir-bundle-wptp-ir: expected ${expectNodes} imported nodes, got ${s.importedNodes}\n`,
  );
  process.exit(1);
}

console.log(`verify-webir-bundle-wptp-ir: ok (${s.importedNodes} nodes, zero losses) from ${bundlePath}`);
