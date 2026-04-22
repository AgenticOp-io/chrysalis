#!/usr/bin/env node
/**
 * Full loop for tiny-blog:
 *   1. seed the fixture DB and hash alice's password (via `php -r`)
 *   2. start the Oracle observer; drive all 5 routes; stop
 *   3. ingest + emit the tiny-blog fixture into generated/tiny-blog
 *   4. npm-install the emitted project
 *   5. seed generated/tiny-blog/blog.sqlite with the same hash
 *   6. start the emitted app; wait for :3000
 *   7. replay the captured corpus against it via @chrysalis/verify
 *   8. emit a correctness report; exit non-zero if below threshold
 *
 * Requires `php` on PATH. If absent, exits 0 with a skip notice (same policy
 * as scripts/drive-tiny-blog.mjs).
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

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

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const fixture = resolve(repo, "fixtures/tiny-blog");
const generated = resolve(repo, "generated/tiny-blog");
const traceDir = resolve(repo, "traces");
const reportDir = resolve(repo, "reports/verify");
const preludePath = resolve(repo, "packages/oracle-php/src/bootstrap.php");
const fixtureDb = resolve(fixture, "blog.sqlite");
const generatedDb = resolve(generated, "blog.sqlite");

// Thresholds (tunable via env).
const THRESHOLD = Number.parseFloat(process.env.VERIFY_THRESHOLD ?? "0.6");
const PORT = Number.parseInt(process.env.VERIFY_PORT ?? "3737", 10);

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

// ---------- 3) ingest + emit ----------
console.log("[verify-e2e] emitting generated/tiny-blog...");
if (existsSync(generated)) rmSync(generated, { recursive: true, force: true });
execSync("node scripts/run-e2e.mjs", { cwd: repo, stdio: "inherit" });

// ---------- 4) npm install in the emitted project ----------
console.log("[verify-e2e] npm install in generated/tiny-blog...");
execSync("npm install --no-audit --no-fund --silent", {
  cwd: generated,
  stdio: "inherit",
});

// ---------- 5) seed generated DB with the same hash ----------
console.log("[verify-e2e] seeding generated/tiny-blog/blog.sqlite...");
execSync("node scripts/seed-db.mjs", { cwd: repo, stdio: "inherit" });
patchAlicePassword(generatedDb, aliceHash);

// ---------- 6) start the emitted app ----------
console.log(`[verify-e2e] starting emitted app on :${PORT}...`);
const app = spawn("npx", ["tsx", "src/index.ts"], {
  cwd: generated,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
  shell: process.platform === "win32",
});
app.stdout?.on("data", (b) => process.stdout.write(`[app] ${b}`));
app.stderr?.on("data", (b) => process.stderr.write(`[app] ${b}`));

let exitCode = 1;
try {
  await waitUp(`http://127.0.0.1:${PORT}/`);
  console.log(`[verify-e2e] app up at http://127.0.0.1:${PORT}`);

  // ---------- 7) replay + report ----------
  await rm(reportDir, { recursive: true, force: true });
  const outcomes = await replayCorpus(corpus, { baseUrl: `http://127.0.0.1:${PORT}` });
  const report = buildReport(outcomes);
  const written = writeReport(reportDir, report, outcomes);
  console.log(`[verify-e2e] wrote ${written.length} report file(s) under ${reportDir}`);

  console.log("");
  console.log(
    `aggregate correctness: ${(report.aggregate.correctness * 100).toFixed(1)}%  (${report.aggregate.framesPassed}/${report.aggregate.framesTotal})`,
  );
  console.log("");
  for (const e of report.endpoints) {
    const pct = (e.correctness * 100).toFixed(1).padStart(5);
    const sim = e.avgBodySimilarity.toFixed(2);
    console.log(
      `  ${e.route.padEnd(25)} ${pct}%   body≈${sim}   (${e.framesPassed}/${e.framesTotal})`,
    );
    for (const d of e.divergences) {
      console.log(`    ✗ ${d.traceId}: ${d.kinds.join(", ")}`);
      for (const detail of d.details) console.log(`      · ${detail}`);
    }
  }

  if (report.aggregate.correctness + 1e-9 < THRESHOLD) {
    console.error(
      `[verify-e2e] correctness ${report.aggregate.correctness.toFixed(3)} below threshold ${THRESHOLD}`,
    );
    exitCode = 1;
  } else {
    exitCode = 0;
  }
} finally {
  if (!app.killed) app.kill();
  await new Promise((r) => app.once("exit", r));
}

process.exit(exitCode);

// ---------- helpers ----------

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
