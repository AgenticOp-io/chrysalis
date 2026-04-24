#!/usr/bin/env node
/**
 * Milestone 4: Oracle capture + dual emit (Hono + Fastify) + in-process verify
 * for `flagship/laravel-min`.
 *
 * PHP's document root is `public/` (Laravel-shaped); ingest manifest lives at
 * project root (`chrysalis.routes.json`).
 *
 * Requires PHP on PATH. Exits 0 with a skip notice if PHP is missing (same as
 * verify-tiny-blog.mjs).
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
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
const fixture = resolve(repo, "flagship/laravel-min");
const docroot = resolve(fixture, "public");
const traceDir = resolve(repo, "traces/flagship-laravel-min");
const generatedHono = resolve(repo, "generated/flagship-laravel-min");
const generatedFastify = resolve(repo, "generated/flagship-laravel-min-fastify");
const reportRoot = resolve(repo, "reports/verify-flagship-laravel-min");
const preludePath = resolve(repo, "packages/oracle-php/src/bootstrap.php");
const THRESHOLD = Number.parseFloat(process.env.VERIFY_THRESHOLD ?? "0.95");

try {
  execSync("php --version", { stdio: "ignore" });
} catch {
  console.log(
    "[verify-flagship] php not found on PATH — skipping. Install PHP >=7.4 to run this script.",
  );
  process.exit(0);
}

if (existsSync(traceDir)) rmSync(traceDir, { recursive: true, force: true });
mkdirSync(traceDir, { recursive: true });

const redaction = loadObserveConfig(fixture);
const obsPort = 18081;
const observer = startObserver({
  phpRoot: docroot,
  traceDir,
  preludePath,
  redaction,
  host: "127.0.0.1",
  port: obsPort,
  onStderr: (s) => process.stderr.write(`[php] ${s}`),
});

try {
  await waitUp(`http://127.0.0.1:${obsPort}/`);
  console.log(`[verify-flagship] PHP observer up at http://127.0.0.1:${obsPort} (docroot=public/)`);
  const r = await fetch(`http://127.0.0.1:${obsPort}/`);
  if (!r.ok) console.warn(`[verify-flagship] GET / returned ${r.status}`);
} finally {
  await observer.stop();
}

const corpus = readCorpus({ root: traceDir });
console.log(`[verify-flagship] corpus: ${corpus.traces.length} traces`);

const webirModule = await ingestDirectory(fixture);

console.log("[verify-flagship] emitting Hono...");
if (existsSync(generatedHono)) rmSync(generatedHono, { recursive: true, force: true });
const resH = await emitHono({ module: webirModule, outDir: generatedHono });
console.log(
  `[verify-flagship] emit-hono handlers=${resH.handlerCount} emit-holes=${resH.holes.length}`,
);

console.log("[verify-flagship] emitting Fastify...");
if (existsSync(generatedFastify)) rmSync(generatedFastify, { recursive: true, force: true });
const resF = await emitFastify({ module: webirModule, outDir: generatedFastify });
console.log(
  `[verify-flagship] emit-fastify handlers=${resF.handlerCount} emit-holes=${resF.holes.length}`,
);

for (const dir of [generatedHono, generatedFastify]) {
  const label = dir === generatedHono ? "hono" : "fastify";
  console.log(`[verify-flagship] npm install (${label})...`);
  execSync("npm install --no-audit --no-fund --silent", {
    cwd: dir,
    stdio: "inherit",
  });
  const dbPath = join(dir, "blog.sqlite");
  if (!existsSync(dbPath)) {
    const db = new DatabaseSync(dbPath);
    db.close();
  }
}

await rm(reportRoot, { recursive: true, force: true });

const baseUrl = "http://127.0.0.1:3000";
const backends = [
  { id: "hono", dir: generatedHono, kind: "hono" },
  { id: "fastify", dir: generatedFastify, kind: "fastify" },
];

let exitCode = 0;
for (const b of backends) {
  console.log(`\n[verify-flagship] —— replay vs ${b.id} ——`);
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
  console.log(`[verify-flagship] wrote ${written.length} report file(s) under ${outDir}`);
  console.log(
    `[verify-flagship] ${b.id} aggregate: ${(report.aggregate.correctness * 100).toFixed(1)}%  (${report.aggregate.framesPassed}/${report.aggregate.framesTotal})`,
  );

  if (report.aggregate.correctness + 1e-9 < THRESHOLD) {
    console.error(
      `[verify-flagship] ${b.id}: correctness ${report.aggregate.correctness.toFixed(3)} below threshold ${THRESHOLD}`,
    );
    exitCode = 1;
  }
}

if (exitCode === 0) {
  console.log("\n[verify-flagship] dual-backend gate OK (laravel-min).");
}

process.exit(exitCode);

/**
 * @param {string} outAbs
 * @param {"hono" | "fastify"} kind
 */
async function loadEmittedFetch(outAbs, kind) {
  const { tsImport } = await import("tsx/esm/api");
  process.env.CHRYSALIS_DB_PATH = join(outAbs, "blog.sqlite");
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
