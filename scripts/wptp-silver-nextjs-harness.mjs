/**
 * WPTP silver: OpenAPI + HAR → IR → WebIR bundle → @wptp/emit-nextjs (Chrysalis bridge).
 *
 * Env:
 *   CHRYSALIS_ROOT         — Chrysalis repo root (required)
 *   WPTP_MATRIX_ROOT       — override (else platforms/ then engines/ via wptp-siblings)
 *   WPTP_EMIT_NEXTJS_ROOT  — override (same resolver)
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { resolveWptpRepoRoot } from "./lib/wptp-siblings.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chrysalisRoot = process.env.CHRYSALIS_ROOT?.trim();
if (!chrysalisRoot) {
  process.stderr.write("wptp-silver-nextjs-harness: CHRYSALIS_ROOT is required\n");
  process.exit(1);
}

const matrixRoot = resolveWptpRepoRoot(ROOT, "wptp-matrix");
const emitNextJsRoot = resolveWptpRepoRoot(ROOT, "wptp-emit-nextjs");

if (!existsSync(join(matrixRoot, "src", "verify-silver-chrysalis.ts"))) {
  process.stderr.write(`wptp-silver-nextjs-harness: missing wptp-matrix at ${matrixRoot}\n`);
  process.exit(1);
}

const {
  runSilverOpenApiIrNextJsChrysalis,
  runSilverEchoApiIrNextJsChrysalis,
  runSilverHarIrNextJsChrysalis,
} = await import(pathToFileURL(join(matrixRoot, "src/verify-silver-chrysalis.ts")).href);

const openapi = join(matrixRoot, "fixtures", "petstore-mini.openapi.json");
const echoApi = join(matrixRoot, "fixtures", "echo-api.openapi.json");
const har = join(matrixRoot, "fixtures", "mini.har.json");

const results = [
  runSilverOpenApiIrNextJsChrysalis(openapi, chrysalisRoot, emitNextJsRoot),
  runSilverEchoApiIrNextJsChrysalis(echoApi, chrysalisRoot, emitNextJsRoot),
  runSilverHarIrNextJsChrysalis(har, chrysalisRoot, emitNextJsRoot),
];

let failed = false;
for (const r of results) {
  console.log(`${r.id}: ${r.ok ? "ok" : "FAIL"} — ${r.detail ?? ""}`);
  if (!r.ok) failed = true;
}

if (failed) process.exit(1);
