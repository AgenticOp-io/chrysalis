#!/usr/bin/env node
/**
 * Full loop for tiny-blog:
 *   1. seed the fixture DB and hash alice's password (via `php -r`)
 *   2. start the Oracle observer; drive all 5 routes; stop
 *   3. ingest + emit **Hono** → generated/tiny-blog and **Fastify** → generated/tiny-blog-fastify
 *   4. npm-install both emitted projects
 *   5. seed each project's blog.sqlite with the same rows + alice hash
 *   6. replay the captured corpus **in-process** (injected `fetch`) against each
 *      backend — same WebIR, same oracle, two targets (portability gate)
 *   7. write reports under reports/verify/hono and reports/verify/fastify;
 *      exit non-zero if either backend falls below threshold
 *
 * Requires `php` on PATH. If absent, exits 0 with a skip notice (same policy
 * as scripts/drive-tiny-blog.mjs).
 *
 * Replay tuning (same as `chrysalis verify`, env-only): `CHRYSALIS_VERIFY_REPLAY_CONCURRENCY`,
 * `CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN=1`, `CHRYSALIS_VERIFY_TIMEOUT_MS`,
 * `CHRYSALIS_VERIFY_WORKER_THREADS=1` (with concurrency / cookie-chain off; in-process `fetch` cannot use workers). See DESIGN D204 / D206.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import {
  loadObserveConfig,
  readCorpus,
  startObserver,
} from "../packages/oracle/dist/index.js";
import { ingestDirectory } from "../packages/ingest/dist/index.js";
import {
  buildReport,
  replayCorpus,
  resolveVerifyReplayExtras,
  writeReport,
} from "../packages/verify/dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const fixture = resolve(repo, "fixtures/tiny-blog");
const generatedHono = resolve(repo, "generated/tiny-blog");
const generatedFastify = resolve(repo, "generated/tiny-blog-fastify");
const traceDir = resolve(repo, "traces");
const reportRoot = resolve(repo, "reports/verify");
const ciReportDir = resolve(repo, "reports/ci");
const ciSummaryPath = resolve(ciReportDir, "verify-e2e-summary.json");
const preludePath = resolve(repo, "packages/oracle-php/src/bootstrap.php");
const fixtureDb = resolve(fixture, "blog.sqlite");
const honoDb = join(generatedHono, "blog.sqlite");
const fastifyDb = join(generatedFastify, "blog.sqlite");

const THRESHOLD = Number.parseFloat(process.env.VERIFY_THRESHOLD ?? "0.6");

const replayParsed = resolveVerifyReplayExtras({});
if (!replayParsed.ok) {
  console.error(replayParsed.message);
  process.exit(2);
}
if (replayParsed.logHint) {
  console.log(`[verify-e2e] replay options: ${replayParsed.logHint}`);
}

try {
  execSync("php --version", { stdio: "ignore" });
} catch {
  console.log(
    "[verify-e2e] php not found on PATH — skipping. Install PHP >=7.4 to run this script.",
  );
  process.exit(0);
}

// ---------- 1) seed fixture DB + hash alice's password ----------
console.log("[verify-e2e] seeding fixtures/tiny-blog/blog.sqlite...");
execSync("node scripts/seed-fixture-db.mjs", { cwd: repo, stdio: "inherit" });

const aliceHash = execSync(
  'php -r "echo password_hash(\'secret\', PASSWORD_BCRYPT);"',
  { cwd: repo },
)
  .toString()
  .trim();
patchAlicePassword(fixtureDb, aliceHash);
console.log(`[verify-e2e] alice hash: ${aliceHash.slice(0, 7)}...`);

// ---------- 2) observe + drive ----------
if (existsSync(traceDir)) rmSync(traceDir, { recursive: true, force: true });
mkdirSync(traceDir, { recursive: true });

const redaction = loadObserveConfig(fixture);
const obsPort = 18080;
const observer = startObserver({
  phpRoot: fixture,
  traceDir,
  preludePath,
  redaction,
  host: "127.0.0.1",
  port: obsPort,
  onStderr: (s) => process.stderr.write(`[php] ${s}`),
});

try {
  await waitUp(`http://127.0.0.1:${obsPort}/`);
  console.log(`[verify-e2e] PHP observer up at http://127.0.0.1:${obsPort}`);
  await driveAll(`http://127.0.0.1:${obsPort}`);
} finally {
  await observer.stop();
}
const corpus = readCorpus({ root: traceDir });
console.log(`[verify-e2e] corpus: ${corpus.traces.length} traces captured`);

// ---------- 3) emit both backends ----------
console.log("[verify-e2e] emitting Hono → generated/tiny-blog...");
if (existsSync(generatedHono)) rmSync(generatedHono, { recursive: true, force: true });
execSync("node scripts/run-e2e.mjs", { cwd: repo, stdio: "inherit" });

console.log("[verify-e2e] emitting Fastify → generated/tiny-blog-fastify...");
if (existsSync(generatedFastify)) rmSync(generatedFastify, { recursive: true, force: true });
execSync("node scripts/emit-tiny-blog-fastify.mjs", { cwd: repo, stdio: "inherit" });

// ---------- 4) npm install ----------
for (const dir of [generatedHono, generatedFastify]) {
  const label = dir === generatedHono ? "hono" : "fastify";
  console.log(`[verify-e2e] npm install (${label})...`);
  execSync("npm install --no-audit --no-fund --silent", {
    cwd: dir,
    stdio: "inherit",
  });
}

// ---------- 5) seed emitted DBs ----------
console.log("[verify-e2e] seeding generated/tiny-blog/blog.sqlite...");
execFileSync("node", ["scripts/seed-db.mjs", honoDb], { cwd: repo, stdio: "inherit" });
console.log("[verify-e2e] seeding generated/tiny-blog-fastify/blog.sqlite...");
execFileSync("node", ["scripts/seed-db.mjs", fastifyDb], { cwd: repo, stdio: "inherit" });
patchAlicePassword(honoDb, aliceHash);
patchAlicePassword(fastifyDb, aliceHash);

// ---------- 6–7) in-process replay both ----------
const baseUrl = "http://127.0.0.1:3000";
await rm(reportRoot, { recursive: true, force: true });

const backends = [
  { id: "hono", dir: generatedHono, kind: "hono" },
  { id: "fastify", dir: generatedFastify, kind: "fastify" },
];

const webirModule = await ingestDirectory(fixture);
let exitCode = 0;
const backendSummaries = [];
for (const b of backends) {
  console.log(`\n[verify-e2e] —— replay vs ${b.id} (in-process fetch) ——`);
  const fetchFn = await loadEmittedFetch(b.dir, b.kind);
  const outcomes = await replayCorpus(corpus, {
    baseUrl,
    fetch: fetchFn,
    recordedSqlReplay: true,
    module: webirModule,
    ...replayParsed.extras,
  });
  const report = buildReport(outcomes);
  const outDir = join(reportRoot, b.id);
  const written = writeReport(outDir, report, outcomes);
  console.log(`[verify-e2e] wrote ${written.length} report file(s) under ${outDir}`);

  console.log(
    `[verify-e2e] ${b.id} aggregate: ${(report.aggregate.correctness * 100).toFixed(1)}%  (${report.aggregate.framesPassed}/${report.aggregate.framesTotal})`,
  );
  for (const e of report.endpoints) {
    const pct = (e.correctness * 100).toFixed(1).padStart(5);
    const sim = e.avgBodySimilarity.toFixed(2);
    console.log(
      `  [${b.id}] ${e.route.padEnd(25)} ${pct}%   body≈${sim}   (${e.framesPassed}/${e.framesTotal})`,
    );
    for (const d of e.divergences) {
      console.log(`    ✗ ${d.traceId}: ${d.kinds.join(", ")}`);
      if (d.attributedNodeIds?.length) {
        console.log(`      IR nodes: ${d.attributedNodeIds.join(", ")}`);
      }
      for (const detail of d.details) console.log(`      · ${detail}`);
    }
  }

  if (report.aggregate.correctness + 1e-9 < THRESHOLD) {
    console.error(
      `[verify-e2e] ${b.id}: correctness ${report.aggregate.correctness.toFixed(3)} below threshold ${THRESHOLD}`,
    );
    exitCode = 1;
  }
  backendSummaries.push({
    backend: b.id,
    summaryPath: join(outDir, "summary.json"),
    aggregate: report.aggregate,
    failedFrameCount: report.aggregate.framesTotal - report.aggregate.framesPassed,
    endpoints: report.endpoints,
  });
}

mkdirSync(ciReportDir, { recursive: true });
writeFileSync(
  ciSummaryPath,
  `${JSON.stringify(
    {
      kind: "chrysalis.verify.summary.dual",
      schemaVersion: 1,
      toolVersion: repoToolVersion(repo),
      corpusRoot: traceDir,
      threshold: THRESHOLD,
      reportDir: reportRoot,
      generatedAt: new Date().toISOString(),
      pass: exitCode === 0,
      backends: backendSummaries,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
console.log(`[verify-e2e] wrote machine summary: ${ciSummaryPath}`);

if (exitCode === 0) {
  console.log("\n[verify-e2e] dual-backend gate OK (Hono + Fastify both above threshold).");
}

process.exit(exitCode);

function repoToolVersion(root) {
  try {
    const raw = readFileSync(resolve(root, "package.json"), "utf8");
    const j = JSON.parse(raw);
    if (typeof j.version === "string" && j.version.length > 0) return j.version;
  } catch {
    // keep default
  }
  return "0.0.0";
}

// ---------- helpers ----------

/**
 * @param {string} outAbs absolute path to emitted project root
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

async function driveAll(base) {
  await fetch(`${base}/`);
  await fetch(`${base}/posts/1`);

  const login = await fetch(`${base}/login`, {
    method: "POST",
    body: new URLSearchParams({ username: "alice", password: "secret" }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    redirect: "manual",
  });
  const setCookie = login.headers.get("set-cookie") ?? "";
  const sessionCookie = (setCookie.match(/PHPSESSID=[^;]+/) ?? [""])[0];

  await fetch(`${base}/posts`, {
    method: "POST",
    body: new URLSearchParams({ title: "hello", body: "world" }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: sessionCookie,
    },
    redirect: "manual",
  });
  await fetch(`${base}/comments`, {
    method: "POST",
    body: new URLSearchParams({ post_id: "1", body: "nice!" }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: sessionCookie,
    },
    redirect: "manual",
  });
}

function patchAlicePassword(dbPath, hash) {
  const db = new DatabaseSync(dbPath);
  db.prepare("UPDATE users SET password = ? WHERE username = ?").run(hash, "alice");
  db.close();
}
