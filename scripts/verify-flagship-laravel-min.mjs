#!/usr/bin/env node
/**
 * Milestone 4: Oracle capture + dual emit (Hono + Fastify) + in-process verify
 * for `flagship/laravel-min` (GET routes + **`GET /hello`** default / empty / two
 * named queries / encoded multi-word **`name`**, two `POST /echo`
 * bodies, `GET /jump` (302 `Location: /health`), `GET /session/visit` x2,
 * `GET /session/me`, `GET /login` + `POST /login` (bcrypt + CSRF) + `GET /session/me`,
 * `POST /logout` + `GET /session/me` again, `GET /api/health` x2, `GET /robots.txt`,
 * `GET /humans.txt`, `GET /.well-known/security.txt`, `GET /sitemap.xml`,
 * `GET /css/pilot.css`, and `GET /manifest.webmanifest` in the base GET fan-out + widened capture loop).
 *
 * PHP's document root is `public/` (Laravel-shaped); ingest manifest lives at
 * project root (`chrysalis.routes.json`).
 *
 * Requires PHP on PATH. Exits 0 with a skip notice if PHP is missing (same as
 * verify-tiny-blog.mjs).
 *
 * Writes **`reports/migration/flagship-laravel-min-emit-stats.json`** for
 * **`pnpm run status:laravel-min`** → **`scripts/flagship-migration-metrics.mjs`**.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
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

initLaravelMinSqliteDb(fixture);

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
  await driveLaravelMinCorpus(obsPort);
} finally {
  await observer.stop();
}

const corpus = readCorpus({ root: traceDir });
console.log(`[verify-flagship] corpus: ${corpus.traces.length} traces`);
assertLaravelMinCapturedHelloBodies(corpus);

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

const routesManifestPath = join(fixture, "chrysalis.routes.json");
let manifestRoutes = 0;
try {
  const rawRoutes = readFileSync(routesManifestPath, "utf8");
  const parsedRoutes = JSON.parse(rawRoutes);
  manifestRoutes = Array.isArray(parsedRoutes.routes) ? parsedRoutes.routes.length : 0;
} catch {
  console.warn(`[verify-flagship] could not read manifest routes from ${routesManifestPath}`);
}
const migrationReportsDir = resolve(repo, "reports/migration");
mkdirSync(migrationReportsDir, { recursive: true });
const emitStatsPayload = {
  schema: "chrysalis/flagship-laravel-min-emit-stats/1",
  manifestRoutes,
  hono: { holes: resH.holes.length, handlerCount: resH.handlerCount },
  fastify: { holes: resF.holes.length, handlerCount: resF.handlerCount },
};
writeFileSync(
  join(migrationReportsDir, "flagship-laravel-min-emit-stats.json"),
  `${JSON.stringify(emitStatsPayload, null, 2)}\n`,
);
console.log("[verify-flagship] wrote reports/migration/flagship-laravel-min-emit-stats.json");

for (const dir of [generatedHono, generatedFastify]) {
  const label = dir === generatedHono ? "hono" : "fastify";
  console.log(`[verify-flagship] npm install (${label})...`);
  execSync("npm install --no-audit --no-fund --silent", {
    cwd: dir,
    stdio: "inherit",
  });
  const dbPath = join(dir, "blog.sqlite");
  if (existsSync(dbPath)) rmSync(dbPath);
  const schemaSql = readFileSync(join(fixture, "schema.sql"), "utf8");
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

/** Bcrypt-hash `secret` for user `flagship` (matches `login_post.php` + driver). */
function applyFlagshipUserPassword(dbPath) {
  const hash = execSync('php -r "echo password_hash(\'secret\', PASSWORD_BCRYPT);"', {
    encoding: "utf8",
  }).trim();
  const db = new DatabaseSync(dbPath);
  db.prepare("UPDATE users SET password = ? WHERE username = ?").run(hash, "flagship");
  db.close();
}

function initLaravelMinSqliteDb(fixtureRoot) {
  const dataDir = join(fixtureRoot, "data");
  const dbPath = join(dataDir, "app.sqlite");
  mkdirSync(dataDir, { recursive: true });
  if (existsSync(dbPath)) rmSync(dbPath);
  const sql = readFileSync(join(fixtureRoot, "schema.sql"), "utf8");
  const db = new DatabaseSync(dbPath);
  db.exec(sql);
  db.close();
  applyFlagshipUserPassword(dbPath);
  console.log(`[verify-flagship] fixture DB ready at ${dbPath}`);
}

async function driveLaravelMinCorpus(port) {
  const base = `http://127.0.0.1:${port}`;
  const paths = [
    "/",
    "/health",
    "/items",
    "/count",
    "/items",
    "/count",
    "/health",
    "/",
    "/items",
    "/count",
    "/robots.txt",
    "/humans.txt",
    "/.well-known/security.txt",
    "/sitemap.xml",
    "/css/pilot.css",
    "/manifest.webmanifest",
  ];
  for (const p of paths) {
    const r = await fetch(`${base}${p}`);
    if (!r.ok) {
      console.warn(`[verify-flagship] GET ${p} returned ${r.status}`);
    }
  }

  const helloDefault = await fetch(`${base}/hello`);
  if (!helloDefault.ok) {
    console.warn(`[verify-flagship] GET /hello (default) returned ${helloDefault.status}`);
  }
  const helloEmpty = await fetch(`${base}/hello?name=`);
  if (!helloEmpty.ok) {
    console.warn(`[verify-flagship] GET /hello?name= returned ${helloEmpty.status}`);
  }
  const helloA = await fetch(`${base}/hello?name=flagship-corpus`);
  if (!helloA.ok) {
    console.warn(`[verify-flagship] GET /hello returned ${helloA.status}`);
  }
  const helloB = await fetch(`${base}/hello?name=chrysalis`);
  if (!helloB.ok) {
    console.warn(`[verify-flagship] GET /hello returned ${helloB.status}`);
  }
  const helloEncoded = await fetch(`${base}/hello?name=${encodeURIComponent("x y")}`);
  if (!helloEncoded.ok) {
    console.warn(`[verify-flagship] GET /hello (encoded name) returned ${helloEncoded.status}`);
  }

  const apiHealth = await fetch(`${base}/api/health`);
  if (!apiHealth.ok) {
    console.warn(`[verify-flagship] GET /api/health returned ${apiHealth.status}`);
  }

  const jump = await fetch(`${base}/jump`, { redirect: "manual" });
  if (jump.status < 300 || jump.status >= 400) {
    console.warn(`[verify-flagship] GET /jump expected 3xx, got ${jump.status}`);
  }

  const echoRes = await fetch(`${base}/echo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ msg: "flagship-verify" }).toString(),
    redirect: "manual",
  });
  if (!echoRes.ok) {
    console.warn(`[verify-flagship] POST /echo returned ${echoRes.status}`);
  }

  const echo2 = await fetch(`${base}/echo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ msg: "second-post" }).toString(),
    redirect: "manual",
  });
  if (!echo2.ok) {
    console.warn(`[verify-flagship] POST /echo (second) returned ${echo2.status}`);
  }

  for (let i = 0; i < 2; i++) {
    const sv = await fetch(`${base}/session/visit`);
    if (!sv.ok) {
      console.warn(`[verify-flagship] GET /session/visit returned ${sv.status}`);
    }
  }

  const me0 = await fetch(`${base}/session/me`);
  if (!me0.ok) {
    console.warn(`[verify-flagship] GET /session/me returned ${me0.status}`);
  }

  const loginForm = await fetch(`${base}/login`);
  if (!loginForm.ok) {
    console.warn(`[verify-flagship] GET /login returned ${loginForm.status}`);
  }
  const loginPost = await fetch(`${base}/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrf: "flagship_csrf_static",
      username: "flagship",
      password: "secret",
    }).toString(),
    redirect: "manual",
  });
  if (loginPost.status < 300 || loginPost.status >= 400) {
    console.warn(`[verify-flagship] POST /login expected 3xx, got ${loginPost.status}`);
  }
  const me1 = await fetch(`${base}/session/me`);
  if (!me1.ok) {
    console.warn(`[verify-flagship] GET /session/me (after login) returned ${me1.status}`);
  }

  const logoutRes = await fetch(`${base}/logout`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "",
    redirect: "manual",
  });
  if (logoutRes.status < 300 || logoutRes.status >= 400) {
    console.warn(`[verify-flagship] POST /logout expected 3xx, got ${logoutRes.status}`);
  }
  const me2 = await fetch(`${base}/session/me`);
  if (!me2.ok) {
    console.warn(`[verify-flagship] GET /session/me (after logout) returned ${me2.status}`);
  }

  const apiTail = await fetch(`${base}/api/health`);
  if (!apiTail.ok) {
    console.warn(`[verify-flagship] GET /api/health (tail) returned ${apiTail.status}`);
  }
}

/** Asserts oracle capture covered each distinct `hello_show` plaintext body (grouped `GET /hello`). */
function assertLaravelMinCapturedHelloBodies(corpus) {
  const byRoute = groupByRoute(corpus);
  const routeSig = "GET /hello";
  for (const body of [
    "hello:guest\n",
    "hello:\n",
    "hello:flagship-corpus\n",
    "hello:chrysalis\n",
    "hello:x y\n",
  ]) {
    assertRouteContainsBody(byRoute, routeSig, body);
  }
}

/**
 * @param {ReturnType<typeof groupByRoute>} byRoute
 * @param {string} routeSig
 * @param {string} expectedBody
 */
function assertRouteContainsBody(byRoute, routeSig, expectedBody) {
  const traces = byRoute.get(routeSig) ?? [];
  if (traces.length === 0) {
    throw new Error(`[verify-flagship] missing traces for ${routeSig}`);
  }
  const hasBody = traces.some((trace) => {
    const response = trace.events.find((e) => e.type === "http.response");
    return response && response.type === "http.response" && response.body === expectedBody;
  });
  if (!hasBody) {
    throw new Error(`[verify-flagship] ${routeSig} missing expected body ${JSON.stringify(expectedBody)}`);
  }
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
