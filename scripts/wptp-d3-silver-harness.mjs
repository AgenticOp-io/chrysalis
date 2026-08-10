/**
 * Run WPTP D3 silver harness cases (OpenAPI + HAR → IR → Chrysalis emit-hono).
 *
 * Env:
 *   CHRYSALIS_ROOT     — Chrysalis repo root (required)
 *   WPTP_MATRIX_ROOT   — override (else platforms/ then engines/ via wptp-siblings)
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { resolveWptpRepoRoot } from "./lib/wptp-siblings.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chrysalisRoot = process.env.CHRYSALIS_ROOT?.trim();
if (!chrysalisRoot) {
  process.stderr.write("wptp-d3-silver-harness: CHRYSALIS_ROOT is required\n");
  process.exit(1);
}

const matrixRoot = resolveWptpRepoRoot(ROOT, "wptp-matrix");
if (!existsSync(join(matrixRoot, "src", "verify-silver-chrysalis.ts"))) {
  process.stderr.write(`wptp-d3-silver-harness: missing wptp-matrix at ${matrixRoot}\n`);
  process.exit(1);
}

const {
  runSilverOpenApiIrHonoChrysalis,
  runSilverEchoApiIrHonoChrysalis,
  runSilverHarIrHonoChrysalis,
} = await import(pathToFileURL(join(matrixRoot, "src", "verify-silver-chrysalis.ts")).href);

const openapi = join(matrixRoot, "fixtures", "petstore-mini.openapi.json");
const echoApi = join(matrixRoot, "fixtures", "echo-api.openapi.json");
const har = join(matrixRoot, "fixtures", "mini.har.json");

const results = [
  runSilverOpenApiIrHonoChrysalis(openapi, chrysalisRoot),
  runSilverEchoApiIrHonoChrysalis(echoApi, chrysalisRoot),
  runSilverHarIrHonoChrysalis(har, chrysalisRoot),
];

let failed = false;
for (const r of results) {
  console.log(`${r.id}: ${r.ok ? "ok" : "FAIL"} — ${r.detail ?? ""}`);
  if (!r.ok) failed = true;
}

if (failed) process.exit(1);
