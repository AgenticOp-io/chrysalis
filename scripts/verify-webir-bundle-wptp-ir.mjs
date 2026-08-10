/**
 * CI helper: import a chrysalis.webir.bundle via @wptp/ir and assert zero losses.
 *
 * Env:
 *   WPTP_IR_ROOT        path to wptp-ir checkout (default: platforms/ then engines/ via wptp-siblings)
 *   WEBIR_BUNDLE_PATH   bundle JSON file (required)
 *
 * Optional flags:
 *   --bundle <path>     overrides WEBIR_BUNDLE_PATH
 *   --expect-nodes N    default 325 (tiny-blog flagship)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolveWptpPackageEntry, resolveWptpRepoRoot } from "./lib/wptp-siblings.mjs";

function usage() {
  process.stderr.write(
    "Usage: WEBIR_BUNDLE_PATH=... node --import tsx scripts/verify-webir-bundle-wptp-ir.mjs\n" +
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

const convertRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wptpRoot = resolveWptpRepoRoot(convertRoot, "wptp-ir");
if (!existsSync(join(wptpRoot, "package.json"))) {
  process.stderr.write(`verify-webir-bundle-wptp-ir: wptp-ir missing at ${wptpRoot}\n`);
  process.exit(1);
}

const { bundle, expectNodes } = parseArgs(process.argv.slice(2));
if (!bundle) {
  process.stderr.write("verify-webir-bundle-wptp-ir: WEBIR_BUNDLE_PATH or --bundle is required\n");
  process.exit(1);
}

const bundlePath = resolve(bundle);
const entry =
  resolveWptpPackageEntry(convertRoot, "wptp-ir") ??
  (existsSync(join(wptpRoot, "src/index.ts")) ? join(wptpRoot, "src/index.ts") : join(wptpRoot, "dist/index.js"));
const { importWebIrBundleJson, summarizeLosses, assertIrDocumentV0 } = await import(pathToFileURL(entry).href);

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

console.log(
  `verify-webir-bundle-wptp-ir: ok (${s.importedNodes} nodes, zero losses) from ${bundlePath} via ${entry}`,
);
