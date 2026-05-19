/**
 * Run WPTP D4 bronze harness: OpenAPI + HAR → IR v0 → @wptp/emit-nextjs (App Router stubs).
 *
 * Env:
 *   WPTP_MATRIX_ROOT   — wptp-matrix checkout (default: ../wptp-matrix)
 */
import { existsSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const matrixRoot = resolve(process.env.WPTP_MATRIX_ROOT ?? join(ROOT, "..", "wptp-matrix"));

if (!existsSync(join(matrixRoot, "src", "compose.ts"))) {
  process.stderr.write(`wptp-d4-nextjs-harness: missing wptp-matrix at ${matrixRoot}\n`);
  process.exit(1);
}

const { composeOpenApiIrNextJs, composeHarIrNextJs } = await import(
  pathToFileURL(join(matrixRoot, "src", "compose.ts")).href,
);
const { verifyComposedNextJsBronze } = await import(
  pathToFileURL(join(matrixRoot, "src", "verify-contract.ts")).href,
);

const OPENAPI_ROUTES = [
  { path: "/pets", method: "GET", file: "app/pets/route.ts" },
  { path: "/pets", method: "POST", file: "app/pets/route.ts" },
  { path: "/pets/{id}", method: "GET", file: "app/pets/{id}/route.ts" },
];

const HAR_ROUTES = [
  { path: "/api/pets", method: "GET", file: "app/api/pets/route.ts" },
  { path: "/api/pets", method: "POST", file: "app/api/pets/route.ts" },
  { path: "/api/pets/42", method: "GET", file: "app/api/pets/42/route.ts" },
];

function runCase(id, composeFn, inputPath, routes) {
  const outDir = mkdtempSync(join(tmpdir(), "wptp-d4-nextjs-"));
  try {
    const compose = composeFn(inputPath, outDir);
    const contract = verifyComposedNextJsBronze(outDir, compose, routes);
    const ok = contract.ok && compose.filesWritten.length > 0;
    return {
      id,
      ok,
      detail: `files=${compose.filesWritten.length} contract=${contract.ok}`,
    };
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

const openapi = join(matrixRoot, "fixtures", "petstore-mini.openapi.json");
const har = join(matrixRoot, "fixtures", "mini.har.json");

const results = [
  runCase("openapi-ir-nextjs", composeOpenApiIrNextJs, openapi, OPENAPI_ROUTES),
  runCase("har-ir-nextjs", composeHarIrNextJs, har, HAR_ROUTES),
];

let failed = false;
for (const r of results) {
  console.log(`${r.id}: ${r.ok ? "ok" : "FAIL"} — ${r.detail}`);
  if (!r.ok) failed = true;
}

if (failed) process.exit(1);
