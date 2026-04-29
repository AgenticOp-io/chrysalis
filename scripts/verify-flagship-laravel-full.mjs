#!/usr/bin/env node
/**
 * Milestone 4–5: Oracle capture + dual emit (Hono + Fastify) + verify for
 * **`flagship/chrysalis-laravel-work`** after `pnpm run scaffold:laravel-full`.
 * CI scaffolds with **`CHRYSALIS_SCAFFOLD_BREEZE=1`** (Laravel Breeze + Vite build) so this
 * script continuously gates **Chrysalis routes** alongside a real starter kit; ingest still
 * reads only **`chrysalis.routes.json`**.
 *
 * Corpus: **`GET /chrysalis-ping`** (twice), **`GET /chrysalis-health.txt`** (twice),
 * **`GET /api/chrysalis-health`** (twice), **`GET /chrysalis-jump`** (302 manual),
 * **`GET /chrysalis-session/visit`** (twice), **`GET /chrysalis-hello`** (no query, default
 * `name`), **`GET /chrysalis-hello?name=`** (empty trimmed name), **`GET /chrysalis-hello?name=...`**
 * twice (**`flagship`** / **`composer`**) plus one percent-encoded **`x y`**, **`GET /chrysalis-count`** (twice), **`GET /chrysalis-first-item`** (twice),
 * **`GET /chrysalis-last-item`** (twice),
 * **`GET /chrysalis-items`** (twice), **`GET /chrysalis-lib-count`** (twice),
 * **`GET /chrysalis-sum-ids`** (twice), **`GET /chrysalis-min-id`** (twice),
 * **`GET /chrysalis-max-id`** (twice),
 * **`GET /chrysalis-avg-id`** (twice), **`GET /chrysalis-id-span`** (twice),
 * **`GET /chrysalis-sum-squares`** (twice), **`GET /chrysalis-even-count`** (twice),
 * **`GET /chrysalis-odd-count`** (twice), **`GET /chrysalis-gt-two-count`** (twice),
 * **`GET /chrysalis-lt-three-count`** (twice), **`GET /chrysalis-gte-two-count`** (twice),
 * **`GET /chrysalis-lte-three-count`** (twice), **`GET /chrysalis-ne-two-count`** (twice),
 * **`GET /chrysalis-between-count`** (twice),
 * **`GET /chrysalis-eq-one-count`** (twice),
 * **`GET /chrysalis-eq-three-count`** (twice),
 * **`GET /chrysalis-eq-two-count`** (twice),
 * **`GET /chrysalis-ne-one-count`** (twice),
 * **`GET /chrysalis-ne-three-count`** (twice),
 * **`GET /chrysalis-lt-two-count`** (twice),
 * **`GET /chrysalis-gt-one-count`** (twice),
 * **`GET /chrysalis-gte-one-count`** (twice),
 * **`GET /chrysalis-lte-one-count`** (twice),
 * **`GET /chrysalis-between-one-two-count`** (twice),
 * **`GET /chrysalis-gt-three-count`** (twice),
 * **`GET /chrysalis-lt-one-count`** (twice),
 * **`GET /chrysalis-gte-three-count`** (twice),
 * **`GET /chrysalis-lte-two-count`** (twice),
 * **`GET /chrysalis-eq-zero-count`** (twice),
 * **`GET /chrysalis-ne-zero-count`** (twice),
 * **`GET /chrysalis-items-snapshot`** (twice),
 * **`GET /chrysalis-items-group-parity`** (twice),
 * **`GET /chrysalis-items-cte-rollup`** (twice),
 * **`GET /chrysalis-recursive-stress`** (twice),
 * **`GET /chrysalis-auth-probe`** (twice; Sanctum/OAuth stub JSON),
 * **`GET /chrysalis-socialite-fortify-probe`** (twice; Socialite/Fortify stub JSON),
 * **`GET /chrysalis-framework`** (twice),
 * **`GET /chrysalis-session/me`** + **`GET /chrysalis-session/login`** (negative method guard) +
 * **`POST /chrysalis-session/login`** (bad username) + **`POST /chrysalis-session/login`** +
 * **`GET /chrysalis-session/me`** + **`POST /chrysalis-session/logout`** +
 * **`GET /chrysalis-session/me`**, and **`POST /chrysalis-echo`**
 * (two form bodies).
 * Ingest uses project-root **`chrysalis.routes.json`** (Chrysalis handlers); PHP docroot is
 * Laravel **`public/`**.
 *
 * Writes **`reports/migration/flagship-laravel-full-emit-stats.json`** (manifest route count +
 * per-emitter hole/handler counts) for **`status:laravel-full`** to derive optional migration
 * sidecars (`idiomaticity.json`, `residual-legacy.json`) via **`scripts/flagship-migration-metrics.mjs`**.
 *
 * Optional stress mode:
 * - `--stress-runs=N` (or `CHRYSALIS_VERIFY_STRESS_RUNS=N`) repeats replay N times
 *   per backend and fails on report fingerprint drift.
 * - `--seed-variant=baseline|empty|ten` (or `CHRYSALIS_VERIFY_SEED_VARIANT`) rewrites
 *   the SQLite seed rows before capture + replay.
 * - `--seed-variants=baseline,empty,ten` (or `CHRYSALIS_VERIFY_SEED_VARIANTS`) runs a
 *   sequential seed matrix.
 *
 * Replay tuning (same as `chrysalis verify`, env-only): `CHRYSALIS_VERIFY_REPLAY_CONCURRENCY`,
 * `CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN=1`, `CHRYSALIS_VERIFY_TIMEOUT_MS`,
 * `CHRYSALIS_VERIFY_WORKER_THREADS=1` (D204 / D206).
 *
 * Skips with exit 0 when:
 * - PHP is not on PATH
 * - Scaffold tree is missing **`vendor/autoload.php`** or **`public/index.php`**
 *
 * Emitted **`blog.sqlite`** and fixture SQLite are seeded from
 * **`chrysalis/schema.sql`** inside the scaffold tree.
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { ingestDirectory } from "../packages/ingest/dist/index.js";
import {
  groupByRoute,
  loadObserveConfig,
  readCorpus,
  startObserver,
} from "../packages/oracle/dist/index.js";
import {
  buildReport,
  replayCorpus,
  resolveVerifyReplayExtras,
  writeReport,
} from "../packages/verify/dist/index.js";
import { emit as emitHono } from "../packages/emit-hono/dist/index.js";
import { emit as emitFastify } from "../packages/emit-fastify/dist/index.js";
import {
  countAuthTaggedHoles as countWebirAuthTaggedHoles,
  countHoles as countWebirHoles,
} from "../packages/webir/dist/index.js";
import { countAuthTaggedHoles } from "./flagship-migration-metrics.mjs";
import {
  LARAVEL_FULL_AUTH_BOUNDARY_ROUTES,
  authBoundaryReplayRollup,
} from "./milestone-6a-auth-verify-gate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const repo = resolve(here, "..");
const fixture = resolve(repo, "flagship/chrysalis-laravel-work");
const docroot = resolve(fixture, "public");
const traceDir = resolve(repo, "traces/flagship-laravel-full");
const generatedHono = resolve(repo, "generated/flagship-laravel-full");
const generatedFastify = resolve(repo, "generated/flagship-laravel-full-fastify");
const reportRoot = resolve(repo, "reports/verify-flagship-laravel-full");
const confidenceRoot = resolve(repo, "reports/confidence");
const confidencePath = resolve(confidenceRoot, "flagship-laravel-full.json");
const confidenceHistoryRoot = resolve(confidenceRoot, "history");
const confidenceHistoryPath = resolve(confidenceHistoryRoot, "flagship-laravel-full.history.json");
const preludePath = resolve(repo, "packages/oracle-php/src/bootstrap.php");
const observeFallback = resolve(
  repo,
  "flagship/laravel-full/chrysalis-templates/chrysalis.observe.json",
);
const schemaSource = resolve(fixture, "chrysalis/schema.sql");
const THRESHOLD = Number.parseFloat(process.env.VERIFY_THRESHOLD ?? "0.95");
const STRESS_RUNS = parseStressRuns();
const SEED_VARIANT = parseSeedVariant();
const SEED_VARIANTS = parseSeedVariants();
let seedSchemaSql = null;
const OBS_PORT = 18082;

const replayParsed = resolveVerifyReplayExtras({});
if (!replayParsed.ok) {
  console.error(replayParsed.message);
  process.exit(2);
}
if (replayParsed.logHint) {
  console.log(`[verify-flagship-laravel-full] replay options: ${replayParsed.logHint}`);
}

if (!process.argv.includes("--_seed-driver") && SEED_VARIANTS.length > 1) {
  let matrixExit = 0;
  const matrix = [];
  for (const variant of SEED_VARIANTS) {
    console.log(`\n[verify-flagship-laravel-full] seed matrix: ${variant}`);
    if (existsSync(confidencePath)) {
      rmSync(confidencePath, { force: true });
    }
    try {
      execSync(
        `"${process.execPath}" "${scriptPath}" --_seed-driver --seed-variant=${variant} --stress-runs=${STRESS_RUNS}`,
        {
          cwd: repo,
          stdio: "inherit",
          env: { ...process.env, CHRYSALIS_VERIFY_MATRIX_ACTIVE: "1" },
        },
      );
      if (existsSync(confidencePath)) {
        const child = JSON.parse(readFileSync(confidencePath, "utf8"));
        matrix.push({ variant, ...child });
      } else {
        matrix.push({ variant, skipped: true });
      }
    } catch {
      matrixExit = 1;
    }
  }
  const matrixCrossBackendParityOk = matrix.every(
    (m) => m.skipped === true || m.crossBackendParity?.ok !== false,
  );
  const summary = {
    profile: "flagship-laravel-full",
    target: "5-nines-confidence",
    matrix,
    matrixExit,
    matrixCrossBackendParityOk,
  };
  mkdirSync(confidenceRoot, { recursive: true });
  writeFileSync(confidencePath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`[verify-flagship-laravel-full] wrote confidence artifact ${confidencePath}`);
  process.exit(matrixExit);
}

try {
  execSync("php --version", { stdio: "ignore" });
} catch {
  console.log(
    "[verify-flagship-laravel-full] php not found on PATH — skipping. Install PHP to run this script.",
  );
  process.exit(0);
}

const vendorAutoload = join(fixture, "vendor/autoload.php");
const frontController = join(fixture, "public/index.php");
if (!existsSync(vendorAutoload) || !existsSync(frontController)) {
  console.log(
    "[verify-flagship-laravel-full] scaffold tree missing (no vendor/ or public/index.php). Run `pnpm run scaffold:laravel-full` then `composer install` in that tree if needed — skipping.",
  );
  process.exit(0);
}

const observeDest = join(fixture, "chrysalis.observe.json");
if (!existsSync(observeDest) && existsSync(observeFallback)) {
  copyFileSync(observeFallback, observeDest);
}

if (existsSync(traceDir)) rmSync(traceDir, { recursive: true, force: true });
mkdirSync(traceDir, { recursive: true });
initLaravelFullSqliteDb(fixture);

const redaction = loadObserveConfig(fixture);
const observer = startObserver({
  phpRoot: docroot,
  traceDir,
  preludePath,
  redaction,
  host: "127.0.0.1",
  port: OBS_PORT,
  onStderr: (s) => process.stderr.write(`[php] ${s}`),
});

try {
  await waitUp(`http://127.0.0.1:${OBS_PORT}/`);
  console.log(
    `[verify-flagship-laravel-full] PHP observer up at http://127.0.0.1:${OBS_PORT}/ (docroot=public/)`,
  );
  await driveLaravelFullCorpus(OBS_PORT);
} finally {
  await observer.stop();
}

const corpus = readCorpus({ root: traceDir });
console.log(`[verify-flagship-laravel-full] corpus: ${corpus.traces.length} traces`);
assertCorpusSemantics(corpus);
let riskCells = buildRiskCells(corpus);

const webirModule = await ingestDirectory(fixture);

console.log("[verify-flagship-laravel-full] emitting Hono...");
if (existsSync(generatedHono)) rmSync(generatedHono, { recursive: true, force: true });
const resH = await emitHono({ module: webirModule, outDir: generatedHono });
console.log(
  `[verify-flagship-laravel-full] emit-hono handlers=${resH.handlerCount} emit-holes=${resH.holes.length}`,
);

console.log("[verify-flagship-laravel-full] emitting Fastify...");
if (existsSync(generatedFastify)) rmSync(generatedFastify, { recursive: true, force: true });
const resF = await emitFastify({ module: webirModule, outDir: generatedFastify });
console.log(
  `[verify-flagship-laravel-full] emit-fastify handlers=${resF.handlerCount} emit-holes=${resF.holes.length}`,
);

const routesManifestPath = join(fixture, "chrysalis.routes.json");
let manifestRoutes = 0;
try {
  const rawRoutes = readFileSync(routesManifestPath, "utf8");
  const parsedRoutes = JSON.parse(rawRoutes);
  manifestRoutes = Array.isArray(parsedRoutes.routes) ? parsedRoutes.routes.length : 0;
} catch {
  console.warn(`[verify-flagship-laravel-full] could not read manifest routes from ${routesManifestPath}`);
}
const migrationReportsDir = resolve(repo, "reports/migration");
mkdirSync(migrationReportsDir, { recursive: true });
const emitStatsPayload = {
  schema: "chrysalis/flagship-laravel-full-emit-stats/1",
  manifestRoutes,
  ingest: {
    holes: countWebirHoles(webirModule),
    authHoles: countWebirAuthTaggedHoles(webirModule),
  },
  hono: {
    holes: resH.holes.length,
    authHoles: countAuthTaggedHoles(resH.holes),
    handlerCount: resH.handlerCount,
  },
  fastify: {
    holes: resF.holes.length,
    authHoles: countAuthTaggedHoles(resF.holes),
    handlerCount: resF.handlerCount,
  },
};
writeFileSync(
  join(migrationReportsDir, "flagship-laravel-full-emit-stats.json"),
  `${JSON.stringify(emitStatsPayload, null, 2)}\n`,
);
console.log(`[verify-flagship-laravel-full] wrote reports/migration/flagship-laravel-full-emit-stats.json`);

for (const dir of [generatedHono, generatedFastify]) {
  const label = dir === generatedHono ? "hono" : "fastify";
  console.log(`[verify-flagship-laravel-full] npm install (${label})...`);
  execSync("npm install --no-audit --no-fund --silent", {
    cwd: dir,
    stdio: "inherit",
  });
  const dbPath = join(dir, "blog.sqlite");
  if (existsSync(dbPath)) rmSync(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec(getSeedSchemaSql());
  db.close();
  applyFlagshipUserPassword(dbPath);
  const sessDir = join(dir, "chrysalis-sessions");
  if (existsSync(sessDir)) rmSync(sessDir, { recursive: true, force: true });
  mkdirSync(sessDir, { recursive: true });
}

await rm(reportRoot, { recursive: true, force: true });

const baseUrl = "http://127.0.0.1:3000";
const backends = [
  { id: "hono", dir: generatedHono, kind: "hono" },
  { id: "fastify", dir: generatedFastify, kind: "fastify" },
];

let exitCode = 0;
const backendSummaries = [];
for (const b of backends) {
  console.log(`\n[verify-flagship-laravel-full] —— replay vs ${b.id} ——`);
  const fetchFn = await loadEmittedFetch(b.dir, b.kind);
  const outDir = join(reportRoot, b.id);
  let baselineFingerprint = "";
  let firstRunStableFingerprint = "";
  let driftDetected = false;
  let minCorrectness = 1;
  let maxCorrectness = 0;
  for (let run = 1; run <= STRESS_RUNS; run++) {
    resetEmittedBackendState(b.dir);
    const outcomes = await replayCorpus(corpus, {
      baseUrl,
      fetch: fetchFn,
      recordedSqlReplay: true,
      module: webirModule,
      ...replayParsed.extras,
    });
    const report = buildReport(outcomes);
    const runOutDir = STRESS_RUNS === 1 ? outDir : join(outDir, `run-${run}`);
    const written = writeReport(runOutDir, report, outcomes);
    console.log(`[verify-flagship-laravel-full] wrote ${written.length} report file(s) under ${runOutDir}`);
    console.log(
      `[verify-flagship-laravel-full] ${b.id} run ${run}/${STRESS_RUNS}: ${(report.aggregate.correctness * 100).toFixed(1)}%  (${report.aggregate.framesPassed}/${report.aggregate.framesTotal})`,
    );
    const fp = stableReportFingerprint(report);
    if (run === 1) {
      baselineFingerprint = fp;
      firstRunStableFingerprint = fp;
    } else if (baselineFingerprint !== fp) {
      console.error(
        `[verify-flagship-laravel-full] ${b.id} run ${run}: stable report fingerprint drift detected vs run 1`,
      );
      exitCode = 1;
      driftDetected = true;
    }
    if (report.aggregate.correctness + 1e-9 < THRESHOLD) {
      console.error(
        `[verify-flagship-laravel-full] ${b.id} run ${run}: correctness ${report.aggregate.correctness.toFixed(3)} below threshold ${THRESHOLD}`,
      );
      exitCode = 1;
    }

    const authRollup = authBoundaryReplayRollup(report, LARAVEL_FULL_AUTH_BOUNDARY_ROUTES);
    if (authRollup.missingRoutes.length > 0) {
      console.error(
        `[verify-flagship-laravel-full] Milestone 6A auth corpus incomplete [${b.id} run ${run}]: missing routes ${authRollup.missingRoutes.join(", ")}`,
      );
      exitCode = 1;
    } else if (authRollup.framesTotal > 0 && authRollup.correctness + 1e-9 < THRESHOLD) {
      console.error(
        `[verify-flagship-laravel-full] Milestone 6A auth-route correctness ${authRollup.correctness.toFixed(3)} below threshold ${THRESHOLD} (${authRollup.framesPassed}/${authRollup.framesTotal} frames) [${b.id} run ${run}]`,
      );
      exitCode = 1;
    } else if (authRollup.framesTotal > 0) {
      console.log(
        `[verify-flagship-laravel-full] Milestone 6A auth-route gate OK: ${(authRollup.correctness * 100).toFixed(1)}% (${authRollup.framesPassed}/${authRollup.framesTotal}) [${b.id} run ${run}]`,
      );
    }

    minCorrectness = Math.min(minCorrectness, report.aggregate.correctness);
    maxCorrectness = Math.max(maxCorrectness, report.aggregate.correctness);
  }
  backendSummaries.push({
    backend: b.id,
    stressRuns: STRESS_RUNS,
    driftDetected,
    minCorrectness,
    maxCorrectness,
    threshold: THRESHOLD,
    firstRunStableFingerprint,
  });
}

const crossBackendParity = assertCrossBackendReportParity(backendSummaries);
if (!crossBackendParity.ok) {
  console.error(
    `[verify-flagship-laravel-full] cross-backend verify parity FAILED: Hono and Fastify run-1 ` +
      `stable report fingerprints differ (see confidence.crossBackendParity).`,
  );
  exitCode = 1;
}

riskCells = [
  ...riskCells,
  {
    cell: "cross-backend-verify-parity",
    status: crossBackendParity.ok ? "covered" : "at-risk",
    kpi: { value: crossBackendParity.ok ? 1 : 0, min: 1, unit: "match" },
    evidence: "run-1 stable verify report (aggregate + per-endpoint scores) identical for Hono and Fastify",
  },
];

const confidence = {
  profile: "flagship-laravel-full",
  target: "5-nines-confidence",
  targetCorrectness: 0.99999,
  seedVariant: SEED_VARIANT,
  stressRuns: STRESS_RUNS,
  semanticChecks: "passed",
  metamorphicChecks: "passed",
  riskCells,
  crossBackendParity,
  exitCode,
  backends: backendSummaries,
};
mkdirSync(confidenceRoot, { recursive: true });
writeFileSync(confidencePath, `${JSON.stringify(confidence, null, 2)}\n`);
console.log(`[verify-flagship-laravel-full] wrote confidence artifact ${confidencePath}`);
appendConfidenceHistory(confidence);

if (exitCode === 0) {
  if (STRESS_RUNS > 1) {
    console.log(
      `\n[verify-flagship-laravel-full] dual-backend stress gate OK (${STRESS_RUNS} runs, chrysalis-laravel-work).`,
    );
  } else {
    console.log("\n[verify-flagship-laravel-full] dual-backend gate OK (chrysalis-laravel-work).");
  }
}

process.exit(exitCode);

/**
 * @param {number} port
 */
async function driveLaravelFullCorpus(port) {
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-ping`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-ping returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-health.txt`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-health.txt returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/api/chrysalis-health`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /api/chrysalis-health returned ${r.status}`);
    }
  }
  const jump = await fetch(`${base}/chrysalis-jump`, { redirect: "manual" });
  if (jump.status < 300 || jump.status >= 400) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-jump expected 3xx, got ${jump.status}`);
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-session/visit`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-session/visit returned ${r.status}`);
    }
  }
  const helloDefault = await fetch(`${base}/chrysalis-hello`);
  if (!helloDefault.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-hello (default) returned ${helloDefault.status}`);
  }
  const helloEmpty = await fetch(`${base}/chrysalis-hello?name=`);
  if (!helloEmpty.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-hello?name= returned ${helloEmpty.status}`);
  }
  const helloA = await fetch(`${base}/chrysalis-hello?name=flagship`);
  if (!helloA.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-hello returned ${helloA.status}`);
  }
  const helloB = await fetch(`${base}/chrysalis-hello?name=composer`);
  if (!helloB.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-hello returned ${helloB.status}`);
  }
  const helloEncoded = await fetch(
    `${base}/chrysalis-hello?name=${encodeURIComponent("x y")}`,
  );
  if (!helloEncoded.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-hello (encoded name) returned ${helloEncoded.status}`);
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-framework`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-framework returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-first-item`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-first-item returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-last-item`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-last-item returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-items`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-items returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-lib-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-lib-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-sum-ids`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-sum-ids returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-min-id`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-min-id returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-max-id`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-max-id returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-avg-id`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-avg-id returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-id-span`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-id-span returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-sum-squares`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-sum-squares returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-even-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-even-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-odd-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-odd-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-gt-two-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-gt-two-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-lt-three-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-lt-three-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-gte-two-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-gte-two-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-lte-three-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-lte-three-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-ne-two-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-ne-two-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-between-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-between-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-eq-one-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-eq-one-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-eq-three-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-eq-three-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-eq-two-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-eq-two-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-ne-one-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-ne-one-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-ne-three-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-ne-three-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-lt-two-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-lt-two-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-gt-one-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-gt-one-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-gte-one-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-gte-one-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-lte-one-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-lte-one-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-between-one-two-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-between-one-two-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-gt-three-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-gt-three-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-lt-one-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-lt-one-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-gte-three-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-gte-three-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-lte-two-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-lte-two-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-eq-zero-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-eq-zero-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-ne-zero-count`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-ne-zero-count returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-items-snapshot`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-items-snapshot returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-items-group-parity`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-items-group-parity returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-items-cte-rollup`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-items-cte-rollup returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-recursive-stress`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-recursive-stress returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-auth-probe`);
    if (!r.ok) {
      console.warn(`[verify-flagship-laravel-full] GET /chrysalis-auth-probe returned ${r.status}`);
    }
  }
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/chrysalis-socialite-fortify-probe`);
    if (!r.ok) {
      console.warn(
        `[verify-flagship-laravel-full] GET /chrysalis-socialite-fortify-probe returned ${r.status}`,
      );
    }
  }
  const me0 = await fetch(`${base}/chrysalis-session/me`);
  if (!me0.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-session/me returned ${me0.status}`);
  }
  const loginWrongMethod = await fetch(`${base}/chrysalis-session/login`);
  if (loginWrongMethod.status !== 405) {
    console.warn(
      `[verify-flagship-laravel-full] GET /chrysalis-session/login expected 405, got ${loginWrongMethod.status}`,
    );
  }
  const badLogin = await fetch(`${base}/chrysalis-session/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "intruder" }).toString(),
  });
  if (!badLogin.ok) {
    console.warn(`[verify-flagship-laravel-full] POST /chrysalis-session/login (bad) returned ${badLogin.status}`);
  }
  const emptyLogin = await fetch(`${base}/chrysalis-session/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({}).toString(),
  });
  if (!emptyLogin.ok) {
    console.warn(`[verify-flagship-laravel-full] POST /chrysalis-session/login (empty) returned ${emptyLogin.status}`);
  }
  const jsonLogin = await fetch(`${base}/chrysalis-session/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "flagship" }),
  });
  if (!jsonLogin.ok) {
    console.warn(`[verify-flagship-laravel-full] POST /chrysalis-session/login (json) returned ${jsonLogin.status}`);
  }
  const login = await fetch(`${base}/chrysalis-session/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "flagship" }).toString(),
  });
  if (!login.ok) {
    console.warn(`[verify-flagship-laravel-full] POST /chrysalis-session/login returned ${login.status}`);
  }
  const me1 = await fetch(`${base}/chrysalis-session/me`);
  if (!me1.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-session/me returned ${me1.status}`);
  }
  const logout = await fetch(`${base}/chrysalis-session/logout`, { method: "POST" });
  if (!logout.ok) {
    console.warn(`[verify-flagship-laravel-full] POST /chrysalis-session/logout returned ${logout.status}`);
  }
  const logoutAgain = await fetch(`${base}/chrysalis-session/logout`, { method: "POST" });
  if (!logoutAgain.ok) {
    console.warn(`[verify-flagship-laravel-full] POST /chrysalis-session/logout (second) returned ${logoutAgain.status}`);
  }
  const logoutWrongMethod = await fetch(`${base}/chrysalis-session/logout`);
  if (logoutWrongMethod.status !== 405) {
    console.warn(
      `[verify-flagship-laravel-full] GET /chrysalis-session/logout expected 405, got ${logoutWrongMethod.status}`,
    );
  }
  const me2 = await fetch(`${base}/chrysalis-session/me`);
  if (!me2.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-session/me returned ${me2.status}`);
  }
  const relogin = await fetch(`${base}/chrysalis-session/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "flagship" }).toString(),
  });
  if (!relogin.ok) {
    console.warn(`[verify-flagship-laravel-full] POST /chrysalis-session/login (relogin) returned ${relogin.status}`);
  }
  const me3 = await fetch(`${base}/chrysalis-session/me`);
  if (!me3.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-session/me (after relogin) returned ${me3.status}`);
  }
  const echoA = await fetch(`${base}/chrysalis-echo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ msg: "composer-full" }).toString(),
  });
  if (!echoA.ok) {
    console.warn(`[verify-flagship-laravel-full] POST /chrysalis-echo returned ${echoA.status}`);
  }
  const echoB = await fetch(`${base}/chrysalis-echo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ msg: "second-post" }).toString(),
  });
  if (!echoB.ok) {
    console.warn(`[verify-flagship-laravel-full] POST /chrysalis-echo (second) returned ${echoB.status}`);
  }
  const echoEmpty = await fetch(`${base}/chrysalis-echo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({}).toString(),
  });
  if (!echoEmpty.ok) {
    console.warn(`[verify-flagship-laravel-full] POST /chrysalis-echo (empty) returned ${echoEmpty.status}`);
  }
  const echoJson = await fetch(`${base}/chrysalis-echo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ msg: "json-body" }),
  });
  if (!echoJson.ok) {
    console.warn(`[verify-flagship-laravel-full] POST /chrysalis-echo (json) returned ${echoJson.status}`);
  }
  const echoWrongMethod = await fetch(`${base}/chrysalis-echo`);
  if (echoWrongMethod.status !== 405) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-echo expected 405, got ${echoWrongMethod.status}`);
  }
}

/**
 * @param {string} outAbs
 * @param {"hono" | "fastify"} kind
 */
async function loadEmittedFetch(outAbs, kind) {
  const { tsImport } = await import("tsx/esm/api");
  process.env.CHRYSALIS_DB_PATH = join(outAbs, "blog.sqlite");
  process.env.CHRYSALIS_SESSION_DIR = join(outAbs, "chrysalis-sessions");
  const parentURL = pathToFileURL(join(outAbs, "package.json")).href;
  const mod = await tsImport("./src/server.ts", parentURL);
  if (kind === "hono") {
    if (typeof mod.chrysalisInProcessFetch === "function") {
      return mod.chrysalisInProcessFetch.bind(mod);
    }
    if (typeof mod.app?.fetch !== "function") {
      throw new Error(`expected Hono app.fetch from ${outAbs}`);
    }
    const honoFetch = mod.app.fetch.bind(mod.app);
    return async (url, init) => honoFetch(new Request(url, init));
  }
  if (typeof mod.fetch !== "function") {
    throw new Error(`expected named fetch from Fastify server ${outAbs}`);
  }
  return mod.fetch;
}

function applyFlagshipUserPassword(dbPath) {
  const hash = execSync('php -r "echo password_hash(\'secret\', PASSWORD_BCRYPT);"', {
    encoding: "utf8",
  }).trim();
  const db = new DatabaseSync(dbPath);
  const hasUsers =
    db.prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type = 'table' AND name = 'users'").get().c > 0;
  if (hasUsers) {
    db.prepare("UPDATE users SET password = ? WHERE username = ?").run(hash, "flagship");
  }
  db.close();
}

function resetEmittedBackendState(outAbs) {
  const dbPath = join(outAbs, "blog.sqlite");
  if (existsSync(dbPath)) rmSync(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec(getSeedSchemaSql());
  db.close();
  applyFlagshipUserPassword(dbPath);
  const sessDir = join(outAbs, "chrysalis-sessions");
  if (existsSync(sessDir)) rmSync(sessDir, { recursive: true, force: true });
  mkdirSync(sessDir, { recursive: true });
}

/**
 * Fingerprint of verify outcome for drift and cross-backend checks. Omits
 * `generatedAt` so replays and emitters are comparable.
 *
 * @param {ReturnType<typeof buildReport>} report
 */
function stableReportFingerprint(report) {
  const stable = {
    aggregate: report.aggregate,
    endpoints: report.endpoints,
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

/**
 * @param {ReadonlyArray<{
 *   backend: string;
 *   firstRunStableFingerprint: string;
 * }>} summaries
 */
function assertCrossBackendReportParity(summaries) {
  const withFp = summaries.filter((s) => typeof s.firstRunStableFingerprint === "string" && s.firstRunStableFingerprint.length > 0);
  if (withFp.length < 2) {
    return { ok: true, skipped: true, reason: "fewer than two backends with stable fingerprints" };
  }
  const ref = withFp[0].firstRunStableFingerprint;
  const mismatches = withFp.filter((s) => s.firstRunStableFingerprint !== ref);
  if (mismatches.length > 0) {
    return {
      ok: false,
      refFingerprint: ref,
      mismatchedBackends: mismatches.map((s) => s.backend),
      fingerprints: Object.fromEntries(withFp.map((s) => [s.backend, s.firstRunStableFingerprint])),
    };
  }
  return { ok: true, refFingerprint: ref, fingerprints: Object.fromEntries(withFp.map((s) => [s.backend, s.firstRunStableFingerprint])) };
}

function parseStressRuns() {
  const arg = process.argv.find((a) => a.startsWith("--stress-runs="));
  const raw = arg ? arg.slice("--stress-runs=".length) : (process.env.CHRYSALIS_VERIFY_STRESS_RUNS ?? "1");
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`invalid stress run count: ${raw}`);
  }
  return parsed;
}

function assertCorpusSemantics(corpus) {
  const expectations = semanticExpectationsForSeed(SEED_VARIANT);
  const byRoute = groupByRoute(corpus);
  assertRouteBody(byRoute, "GET /chrysalis-items-snapshot", expectations.itemsSnapshot);
  assertRouteBody(byRoute, "GET /chrysalis-items-group-parity", expectations.itemsGroupParity);
  assertRouteBody(byRoute, "GET /chrysalis-items-cte-rollup", expectations.itemsCteRollup);
  assertRouteBody(byRoute, "GET /chrysalis-recursive-stress", expectations.recursiveStress);
  assertRouteBody(
    byRoute,
    "GET /chrysalis-auth-probe",
    '{"sanctum":true,"oauth":"oauth-probe-ok"}',
  );
  assertRouteBody(
    byRoute,
    "GET /chrysalis-socialite-fortify-probe",
    '{"socialite":"socialite-probe-ok","fortify":"fortify-probe-ok"}',
  );
  assertRouteStatus(byRoute, "GET /chrysalis-session/login", 405);
  assertRouteContainsBody(byRoute, "POST /chrysalis-session/login", '{"ok":false}');
  assertRouteContainsBody(byRoute, "POST /chrysalis-session/login", '{"ok":true}');
  assertRouteContainsBody(byRoute, "GET /chrysalis-session/me", '{"user":null}');
  assertRouteContainsBody(byRoute, "GET /chrysalis-session/me", '{"user":"flagship"}');
  assertRouteStatus(byRoute, "GET /chrysalis-session/logout", 405);
  assertRouteContainsBody(byRoute, "POST /chrysalis-session/logout", '{"ok":true}');
  assertRouteStatus(byRoute, "GET /chrysalis-echo", 405);
  assertRouteContainsBody(byRoute, "POST /chrysalis-echo", '{"msg":""}');
  assertRouteContainsBody(byRoute, "GET /chrysalis-hello", "hello world\n");
  assertRouteContainsBody(byRoute, "GET /chrysalis-hello", "hello \n");
  assertRouteContainsBody(byRoute, "GET /chrysalis-hello", "hello flagship\n");
  assertRouteContainsBody(byRoute, "GET /chrysalis-hello", "hello composer\n");
  assertRouteContainsBody(byRoute, "GET /chrysalis-hello", "hello x y\n");
  assertRouteHeaderContains(byRoute, "GET /chrysalis-items-snapshot", "content-type", "application/json");
  assertRouteHeaderContains(byRoute, "GET /chrysalis-session/me", "content-type", "application/json");
  assertRouteHeaderContains(byRoute, "GET /chrysalis-health.txt", "content-type", "text/plain");
  assertRouteHeaderContains(byRoute, "GET /api/chrysalis-health", "content-type", "application/json");
  assertRouteHeaderContains(byRoute, "GET /chrysalis-jump", "location", "/chrysalis-health.txt");
  assertRouteHeaderContains(byRoute, "POST /chrysalis-session/login", "set-cookie", "chrysalis_sid=");
  assertRouteHeaderContains(byRoute, "POST /chrysalis-session/logout", "set-cookie", "chrysalis_sid=");
  assertRouteHeaderContains(byRoute, "GET /chrysalis-session/me", "set-cookie", "chrysalis_sid=");
  assertSessionTransitionSequence(byRoute);
  assertMetamorphicRelations(byRoute);
}

function assertRouteBody(byRoute, routeSig, expectedBody) {
  const traces = byRoute.get(routeSig) ?? [];
  if (traces.length === 0) {
    throw new Error(`[verify-flagship-laravel-full] missing traces for ${routeSig}`);
  }
  for (const trace of traces) {
    const response = trace.events.find((e) => e.type === "http.response");
    if (!response || response.type !== "http.response") {
      throw new Error(`[verify-flagship-laravel-full] missing http.response event for ${routeSig}`);
    }
    if (response.status !== 200) {
      throw new Error(`[verify-flagship-laravel-full] ${routeSig} expected status 200, got ${response.status}`);
    }
    if (response.body !== expectedBody) {
      throw new Error(
        `[verify-flagship-laravel-full] ${routeSig} body mismatch; expected ${expectedBody}, got ${response.body}`,
      );
    }
  }
}

function assertRouteStatus(byRoute, routeSig, expectedStatus) {
  const traces = byRoute.get(routeSig) ?? [];
  if (traces.length === 0) {
    throw new Error(`[verify-flagship-laravel-full] missing traces for ${routeSig}`);
  }
  for (const trace of traces) {
    const response = trace.events.find((e) => e.type === "http.response");
    if (!response || response.type !== "http.response") {
      throw new Error(`[verify-flagship-laravel-full] missing http.response event for ${routeSig}`);
    }
    if (response.status !== expectedStatus) {
      throw new Error(
        `[verify-flagship-laravel-full] ${routeSig} expected status ${expectedStatus}, got ${response.status}`,
      );
    }
  }
}

function assertRouteContainsBody(byRoute, routeSig, expectedBody) {
  const traces = byRoute.get(routeSig) ?? [];
  if (traces.length === 0) {
    throw new Error(`[verify-flagship-laravel-full] missing traces for ${routeSig}`);
  }
  const hasBody = traces.some((trace) => {
    const response = trace.events.find((e) => e.type === "http.response");
    return response && response.type === "http.response" && response.body === expectedBody;
  });
  if (!hasBody) {
    throw new Error(`[verify-flagship-laravel-full] ${routeSig} missing expected body ${expectedBody}`);
  }
}

function assertRouteHeaderContains(byRoute, routeSig, headerName, expectedFragment) {
  const traces = byRoute.get(routeSig) ?? [];
  if (traces.length === 0) {
    throw new Error(`[verify-flagship-laravel-full] missing traces for ${routeSig}`);
  }
  for (const trace of traces) {
    const response = trace.events.find((e) => e.type === "http.response");
    if (!response || response.type !== "http.response") {
      throw new Error(`[verify-flagship-laravel-full] missing http.response event for ${routeSig}`);
    }
    const key = Object.keys(response.headers ?? {}).find((k) => k.toLowerCase() === headerName.toLowerCase());
    const value = key ? String(response.headers[key] ?? "") : "";
    if (!value.toLowerCase().includes(expectedFragment.toLowerCase())) {
      throw new Error(
        `[verify-flagship-laravel-full] ${routeSig} expected header ${headerName} to include ${expectedFragment}, got ${value}`,
      );
    }
  }
}

function assertMetamorphicRelations(byRoute) {
  const snapshot = parseRouteBody(byRoute, "GET /chrysalis-items-snapshot", "itemsSnapshot");
  const parity = parseRouteBody(byRoute, "GET /chrysalis-items-group-parity", "parityCounts");
  const cte = parseRouteBody(byRoute, "GET /chrysalis-items-cte-rollup", "cteRollup");
  const recursive = parseRouteBody(byRoute, "GET /chrysalis-recursive-stress", "recursiveStress");

  if (snapshot.count !== parity.even + parity.odd) {
    throw new Error("[verify-flagship-laravel-full] metamorphic mismatch: snapshot.count != even + odd");
  }
  if (snapshot.count !== cte.count || snapshot.sumId !== cte.sumId) {
    throw new Error("[verify-flagship-laravel-full] metamorphic mismatch: snapshot and cte rollup disagree");
  }
  const expectedMaxN = snapshot.count * 10;
  if (recursive.maxN !== expectedMaxN) {
    throw new Error(
      `[verify-flagship-laravel-full] metamorphic mismatch: recursive maxN ${recursive.maxN} != ${expectedMaxN}`,
    );
  }
  const expectedSumN = (recursive.maxN * (recursive.maxN + 1)) / 2;
  if (recursive.sumN !== expectedSumN) {
    throw new Error(
      `[verify-flagship-laravel-full] metamorphic mismatch: recursive sumN ${recursive.sumN} != ${expectedSumN}`,
    );
  }
}

function assertSessionTransitionSequence(byRoute) {
  const traces = byRoute.get("GET /chrysalis-session/me") ?? [];
  if (traces.length < 4) {
    throw new Error(
      `[verify-flagship-laravel-full] expected >=4 GET /chrysalis-session/me traces for transition check, got ${traces.length}`,
    );
  }
  const bodies = traces.map((trace) => {
    const response = trace.events.find((e) => e.type === "http.response");
    if (!response || response.type !== "http.response") {
      throw new Error("[verify-flagship-laravel-full] missing http.response in GET /chrysalis-session/me trace");
    }
    return response.body;
  });
  const expected = ['{"user":null}', '{"user":"flagship"}', '{"user":null}', '{"user":"flagship"}'];
  for (let i = 0; i < expected.length; i++) {
    if (bodies[i] !== expected[i]) {
      throw new Error(
        `[verify-flagship-laravel-full] session transition mismatch at step ${i + 1}: expected ${expected[i]}, got ${bodies[i]}`,
      );
    }
  }
}

function parseRouteBody(byRoute, routeSig, key) {
  const traces = byRoute.get(routeSig) ?? [];
  if (traces.length === 0) {
    throw new Error(`[verify-flagship-laravel-full] missing traces for ${routeSig}`);
  }
  const response = traces[0].events.find((e) => e.type === "http.response");
  if (!response || response.type !== "http.response") {
    throw new Error(`[verify-flagship-laravel-full] missing http.response event for ${routeSig}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    throw new Error(`[verify-flagship-laravel-full] ${routeSig} body is not valid JSON: ${response.body}`);
  }
  if (parsed == null || typeof parsed !== "object" || !(key in parsed)) {
    throw new Error(`[verify-flagship-laravel-full] ${routeSig} missing expected top-level key ${key}`);
  }
  return parsed[key];
}

function buildRiskCells(corpus) {
  const byRoute = groupByRoute(corpus);
  const tracesTotal = corpus.traces.length;
  const getCount = (routeSig) => (byRoute.get(routeSig) ?? []).length;
  const sumCounts = (routeSigs) => routeSigs.reduce((acc, sig) => acc + getCount(sig), 0);
  const kpi = (id, value, min, unit) => ({
    cell: id,
    status: value >= min ? "covered" : "at-risk",
    kpi: { value, min, unit },
  });
  return [
    {
      ...kpi(
        "http-health-and-metadata",
        sumCounts([
          "GET /chrysalis-ping",
          "GET /chrysalis-health.txt",
          "GET /api/chrysalis-health",
        ]),
        6,
        "traces",
      ),
      evidence: "ping + health endpoints captured multiple times",
    },
    {
      ...kpi("redirect-contract", getCount("GET /chrysalis-jump"), 1, "traces"),
      evidence: "manual redirect capture for /chrysalis-jump",
    },
    {
      ...kpi(
        "session-auth-happy-path",
        sumCounts([
          "POST /chrysalis-session/login",
          "POST /chrysalis-session/logout",
          "GET /chrysalis-session/me",
        ]),
        8,
        "traces",
      ),
      evidence: "login/me/logout/relogin sequence assertions",
    },
    {
      ...kpi(
        "session-auth-negative-path",
        getCount("GET /chrysalis-session/login") +
          getCount("GET /chrysalis-session/logout") +
          getCount("POST /chrysalis-session/login"),
        5,
        "traces",
      ),
      evidence: "method-guard, wrong-method logout, bad/empty/json login semantic assertions",
    },
    {
      ...kpi("session-idempotency", getCount("POST /chrysalis-session/logout"), 2, "traces"),
      evidence: "logout invoked repeatedly and remains stable",
    },
    {
      ...kpi("session-transition-monotonicity", getCount("GET /chrysalis-session/me"), 4, "traces"),
      evidence: "me state follows null->flagship->null->flagship transition",
    },
    {
      ...kpi(
        "header-contract-strictness",
        sumCounts([
          "GET /chrysalis-health.txt",
          "GET /api/chrysalis-health",
          "GET /chrysalis-items-snapshot",
          "GET /chrysalis-session/me",
        ]),
        6,
        "traces",
      ),
      evidence: "content-type invariants for text/plain and application/json routes",
    },
    {
      ...kpi("redirect-location-invariants", getCount("GET /chrysalis-jump"), 1, "traces"),
      evidence: "redirect location header remains pinned to /chrysalis-health.txt",
    },
    {
      ...kpi(
        "cookie-session-header-invariants",
        sumCounts([
          "POST /chrysalis-session/login",
          "POST /chrysalis-session/logout",
          "GET /chrysalis-session/me",
        ]),
        8,
        "traces",
      ),
      evidence: "set-cookie contains chrysalis_sid across session transitions",
    },
    {
      ...kpi(
        "request-shape-robustness",
        getCount("GET /chrysalis-echo") + getCount("POST /chrysalis-echo"),
        5,
        "traces",
      ),
      evidence: "echo route method guard + form/json/empty request shape handling",
    },
    {
      ...kpi(
        "sql-aggregates-and-cte",
        sumCounts([
          "GET /chrysalis-items-snapshot",
          "GET /chrysalis-items-group-parity",
          "GET /chrysalis-items-cte-rollup",
          "GET /chrysalis-recursive-stress",
        ]),
        8,
        "traces",
      ),
      evidence: "snapshot/parity/cte/recursive semantic + metamorphic checks",
    },
    {
      ...kpi("seed-cardinality-variance", SEED_VARIANTS.length > 1 ? SEED_VARIANTS.length : 1, 1, "variants"),
      evidence: "seed matrix baseline/empty/ten where enabled",
    },
    {
      ...kpi("determinism-under-replay", STRESS_RUNS, 1, "runs"),
      evidence: "report fingerprint drift detection across stress runs",
    },
    {
      ...kpi("dual-emitter-parity", 2, 2, "backends"),
      evidence: "hono and fastify replayed against same corpus",
    },
    {
      ...kpi("overall-corpus-volume", tracesTotal, 1, "traces"),
      evidence: "total corpus traces used for replay + assertions",
    },
  ];
}

function appendConfidenceHistory(confidence) {
  const current = readConfidenceHistory();
  const minCorrectness =
    confidence.backends.length > 0
      ? Math.min(...confidence.backends.map((b) => Number(b.minCorrectness ?? 0)))
      : 0;
  const driftDetected = confidence.backends.some((b) => b.driftDetected === true);
  const riskCovered = confidence.riskCells.every((c) => c.status === "covered");
  const crossBackendParityOk = confidence.crossBackendParity?.ok !== false;
  const matrixActive = process.env.CHRYSALIS_VERIFY_MATRIX_ACTIVE === "1";
  const matrixCrossBackendParityOk = crossBackendParityOk;
  const entry = {
    timestamp: new Date().toISOString(),
    seedVariant: confidence.seedVariant,
    stressRuns: confidence.stressRuns,
    exitCode: confidence.exitCode,
    semanticChecks: confidence.semanticChecks,
    metamorphicChecks: confidence.metamorphicChecks,
    minCorrectness,
    driftDetected,
    riskCovered,
    crossBackendParityOk,
    matrixActive,
    matrixCrossBackendParityOk,
  };
  current.entries.push(entry);
  const maxEntries = Number.parseInt(process.env.CHRYSALIS_CONFIDENCE_HISTORY_MAX ?? "200", 10);
  if (Number.isFinite(maxEntries) && maxEntries > 0 && current.entries.length > maxEntries) {
    current.entries = current.entries.slice(current.entries.length - maxEntries);
  }
  mkdirSync(confidenceHistoryRoot, { recursive: true });
  writeFileSync(confidenceHistoryPath, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`[verify-flagship-laravel-full] wrote confidence history ${confidenceHistoryPath}`);
}

function readConfidenceHistory() {
  if (!existsSync(confidenceHistoryPath)) {
    return { profile: "flagship-laravel-full", entries: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(confidenceHistoryPath, "utf8"));
    if (parsed && parsed.profile === "flagship-laravel-full" && Array.isArray(parsed.entries)) {
      return parsed;
    }
  } catch {}
  return { profile: "flagship-laravel-full", entries: [] };
}

function parseSeedVariant() {
  const arg = process.argv.find((a) => a.startsWith("--seed-variant="));
  const raw = arg ? arg.slice("--seed-variant=".length) : (process.env.CHRYSALIS_VERIFY_SEED_VARIANT ?? "baseline");
  if (!["baseline", "empty", "ten"].includes(raw)) {
    throw new Error(`invalid seed variant: ${raw}`);
  }
  return raw;
}

function parseSeedVariants() {
  const arg = process.argv.find((a) => a.startsWith("--seed-variants="));
  const raw = arg ? arg.slice("--seed-variants=".length) : process.env.CHRYSALIS_VERIFY_SEED_VARIANTS;
  if (!raw) return [SEED_VARIANT];
  const variants = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (variants.length === 0) return [SEED_VARIANT];
  for (const v of variants) {
    if (!["baseline", "empty", "ten"].includes(v)) {
      throw new Error(`invalid seed variant in list: ${v}`);
    }
  }
  return variants;
}

function buildSeedSchemaSql(seedVariant) {
  const base = readFileSync(schemaSource, "utf8");
  const insertIdx = base.indexOf("INSERT INTO items");
  const schemaOnly = (insertIdx >= 0 ? base.slice(0, insertIdx) : base).trimEnd();
  const rows = seedRows(seedVariant);
  if (rows.length === 0) return `${schemaOnly}\n`;
  const values = rows.map((name) => `  ('${name.replace(/'/g, "''")}')`).join(",\n");
  return `${schemaOnly}\n\nINSERT INTO items (name) VALUES\n${values};\n`;
}

function getSeedSchemaSql() {
  if (seedSchemaSql === null) {
    seedSchemaSql = buildSeedSchemaSql(SEED_VARIANT);
  }
  return seedSchemaSql;
}

function seedRows(seedVariant) {
  switch (seedVariant) {
    case "baseline":
      return ["alpha", "bravo", "charlie"];
    case "empty":
      return [];
    case "ten":
      return [
        "alpha",
        "bravo",
        "charlie",
        "delta",
        "echo",
        "foxtrot",
        "golf",
        "hotel",
        "india",
        "juliet",
      ];
    default:
      return ["alpha", "bravo", "charlie"];
  }
}

function semanticExpectationsForSeed(seedVariant) {
  switch (seedVariant) {
    case "empty":
      return {
        itemsSnapshot: '{"itemsSnapshot":{"count":0,"minId":0,"maxId":0,"sumId":0}}',
        itemsGroupParity: '{"parityCounts":{"even":0,"odd":0}}',
        itemsCteRollup: '{"cteRollup":{"count":0,"sumId":0,"avgId":0}}',
        recursiveStress: '{"recursiveStress":{"maxN":1,"sumN":1}}',
      };
    case "ten":
      return {
        itemsSnapshot: '{"itemsSnapshot":{"count":10,"minId":1,"maxId":10,"sumId":55}}',
        itemsGroupParity: '{"parityCounts":{"even":5,"odd":5}}',
        itemsCteRollup: '{"cteRollup":{"count":10,"sumId":55,"avgId":6}}',
        recursiveStress: '{"recursiveStress":{"maxN":100,"sumN":5050}}',
      };
    case "baseline":
    default:
      return {
        itemsSnapshot: '{"itemsSnapshot":{"count":3,"minId":1,"maxId":3,"sumId":6}}',
        itemsGroupParity: '{"parityCounts":{"even":1,"odd":2}}',
        itemsCteRollup: '{"cteRollup":{"count":3,"sumId":6,"avgId":2}}',
        recursiveStress: '{"recursiveStress":{"maxN":30,"sumN":465}}',
      };
  }
}

function initLaravelFullSqliteDb(fixtureRoot) {
  const dataDir = join(fixtureRoot, "chrysalis/data");
  const dbPath = join(dataDir, "app.sqlite");
  mkdirSync(dataDir, { recursive: true });
  if (existsSync(dbPath)) rmSync(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec(getSeedSchemaSql());
  db.close();
  console.log(`[verify-flagship-laravel-full] fixture DB ready at ${dbPath} (seed=${SEED_VARIANT})`);
}

/**
 * @param {string} url
 * @param {number} [attempts]
 * @param {number} [delayMs]
 */
async function waitUp(url, attempts = 50, delayMs = 200) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url);
      if (r.status) return;
    } catch {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`server at ${url} failed to come up`);
}
