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
 * **`GET /chrysalis-session/visit`** (twice), **`GET /chrysalis-hello?name=...`**
 * (twice), **`GET /chrysalis-count`** (twice), **`GET /chrysalis-first-item`** (twice),
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
 * **`GET /chrysalis-framework`** (twice),
 * **`GET /chrysalis-session/me`** + **`POST /chrysalis-session/login`** +
 * **`GET /chrysalis-session/me`** + **`POST /chrysalis-session/logout`** +
 * **`GET /chrysalis-session/me`**, and **`POST /chrysalis-echo`**
 * (two form bodies).
 * Ingest uses project-root **`chrysalis.routes.json`** (Chrysalis handlers); PHP docroot is
 * Laravel **`public/`**.
 *
 * Skips with exit 0 when:
 * - PHP is not on PATH
 * - Scaffold tree is missing **`vendor/autoload.php`** or **`public/index.php`**
 *
 * Emitted **`blog.sqlite`** and fixture SQLite are seeded from
 * **`chrysalis/schema.sql`** inside the scaffold tree.
 */

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { ingestDirectory } from "../packages/ingest/dist/index.js";
import {
  loadObserveConfig,
  readCorpus,
  startObserver,
} from "../packages/oracle/dist/index.js";
import {
  buildReport,
  replayCorpus,
  writeReport,
} from "../packages/verify/dist/index.js";
import { emit as emitHono } from "../packages/emit-hono/dist/index.js";
import { emit as emitFastify } from "../packages/emit-fastify/dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const fixture = resolve(repo, "flagship/chrysalis-laravel-work");
const docroot = resolve(fixture, "public");
const traceDir = resolve(repo, "traces/flagship-laravel-full");
const generatedHono = resolve(repo, "generated/flagship-laravel-full");
const generatedFastify = resolve(repo, "generated/flagship-laravel-full-fastify");
const reportRoot = resolve(repo, "reports/verify-flagship-laravel-full");
const preludePath = resolve(repo, "packages/oracle-php/src/bootstrap.php");
const observeFallback = resolve(
  repo,
  "flagship/laravel-full/chrysalis-templates/chrysalis.observe.json",
);
const schemaSource = resolve(fixture, "chrysalis/schema.sql");
const THRESHOLD = Number.parseFloat(process.env.VERIFY_THRESHOLD ?? "0.95");
const OBS_PORT = 18082;

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

for (const dir of [generatedHono, generatedFastify]) {
  const label = dir === generatedHono ? "hono" : "fastify";
  console.log(`[verify-flagship-laravel-full] npm install (${label})...`);
  execSync("npm install --no-audit --no-fund --silent", {
    cwd: dir,
    stdio: "inherit",
  });
  const dbPath = join(dir, "blog.sqlite");
  if (existsSync(dbPath)) rmSync(dbPath);
  const schemaSql = readFileSync(schemaSource, "utf8");
  const db = new DatabaseSync(dbPath);
  db.exec(schemaSql);
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
for (const b of backends) {
  console.log(`\n[verify-flagship-laravel-full] —— replay vs ${b.id} ——`);
  const fetchFn = await loadEmittedFetch(b.dir, b.kind);
  const outcomes = await replayCorpus(corpus, {
    baseUrl,
    fetch: fetchFn,
    recordedSqlReplay: true,
    module: webirModule,
  });
  const report = buildReport(outcomes);
  const outDir = join(reportRoot, b.id);
  const written = writeReport(outDir, report, outcomes);
  console.log(`[verify-flagship-laravel-full] wrote ${written.length} report file(s) under ${outDir}`);
  console.log(
    `[verify-flagship-laravel-full] ${b.id} aggregate: ${(report.aggregate.correctness * 100).toFixed(1)}%  (${report.aggregate.framesPassed}/${report.aggregate.framesTotal})`,
  );

  if (report.aggregate.correctness + 1e-9 < THRESHOLD) {
    console.error(
      `[verify-flagship-laravel-full] ${b.id}: correctness ${report.aggregate.correctness.toFixed(3)} below threshold ${THRESHOLD}`,
    );
    exitCode = 1;
  }
}

if (exitCode === 0) {
  console.log("\n[verify-flagship-laravel-full] dual-backend gate OK (chrysalis-laravel-work).");
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
  const helloA = await fetch(`${base}/chrysalis-hello?name=flagship`);
  if (!helloA.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-hello returned ${helloA.status}`);
  }
  const helloB = await fetch(`${base}/chrysalis-hello?name=composer`);
  if (!helloB.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-hello returned ${helloB.status}`);
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
  const me0 = await fetch(`${base}/chrysalis-session/me`);
  if (!me0.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-session/me returned ${me0.status}`);
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
  const me2 = await fetch(`${base}/chrysalis-session/me`);
  if (!me2.ok) {
    console.warn(`[verify-flagship-laravel-full] GET /chrysalis-session/me returned ${me2.status}`);
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

function initLaravelFullSqliteDb(fixtureRoot) {
  const dataDir = join(fixtureRoot, "chrysalis/data");
  const dbPath = join(dataDir, "app.sqlite");
  mkdirSync(dataDir, { recursive: true });
  if (existsSync(dbPath)) rmSync(dbPath);
  const sql = readFileSync(schemaSource, "utf8");
  const db = new DatabaseSync(dbPath);
  db.exec(sql);
  db.close();
  console.log(`[verify-flagship-laravel-full] fixture DB ready at ${dbPath}`);
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
