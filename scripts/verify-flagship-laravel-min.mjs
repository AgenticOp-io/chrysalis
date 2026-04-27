#!/usr/bin/env node
/**
 * Milestone 4: Oracle capture + dual emit (Hono + Fastify) + in-process verify
 * for `flagship/laravel-min` (GET routes + **`GET /hello`** default / empty / two
 * named queries / encoded multi-word **`name`**, two `POST /echo`
 * bodies, `GET /jump` (302 `Location: /health`), `GET /session/visit` x2,
 * `GET /session/me`, `GET /login` + `POST /login` (bad CSRF 403, then bcrypt + CSRF) + `GET /session/me`,
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
import { createHash } from "node:crypto";
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
assertLaravelMinCorpusSemantics(corpus);

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
const backendSummaries = [];
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
  backendSummaries.push({
    backend: b.id,
    stableFingerprint: stableReportFingerprint(report),
    correctness: report.aggregate.correctness,
  });

  if (report.aggregate.correctness + 1e-9 < THRESHOLD) {
    console.error(
      `[verify-flagship] ${b.id}: correctness ${report.aggregate.correctness.toFixed(3)} below threshold ${THRESHOLD}`,
    );
    exitCode = 1;
  }
}

const crossBackendParity = assertCrossBackendReportParity(backendSummaries);
if (!crossBackendParity.ok) {
  console.error(
    `[verify-flagship] cross-backend verify parity FAILED: ${JSON.stringify(crossBackendParity, null, 2)}`,
  );
  exitCode = 1;
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
  const echoEmpty = await fetch(`${base}/echo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({}).toString(),
    redirect: "manual",
  });
  if (echoEmpty.ok || echoEmpty.status !== 400) {
    console.warn(`[verify-flagship] POST /echo (empty) expected 400, got ${echoEmpty.status}`);
  }
  const echoJson = await fetch(`${base}/echo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ msg: "json-body" }),
    redirect: "manual",
  });
  if (echoJson.ok || echoJson.status !== 400) {
    console.warn(`[verify-flagship] POST /echo (json) expected 400, got ${echoJson.status}`);
  }
  const echoWrongMethod = await fetch(`${base}/echo`);
  if (echoWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] GET /echo expected 404, got ${echoWrongMethod.status}`);
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
  const loginBadCsrf = await fetch(`${base}/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrf: "intruder",
      username: "flagship",
      password: "secret",
    }).toString(),
    redirect: "manual",
  });
  if (loginBadCsrf.status !== 403) {
    console.warn(`[verify-flagship] POST /login (bad csrf) expected 403, got ${loginBadCsrf.status}`);
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

function assertLaravelMinCorpusSemantics(corpus) {
  const byRoute = groupByRoute(corpus);

  for (const body of [
    "hello:guest\n",
    "hello:\n",
    "hello:flagship-corpus\n",
    "hello:chrysalis\n",
    "hello:x y\n",
  ]) {
    assertRouteContainsBody(byRoute, "GET /hello", body);
  }

  assertRouteBody(byRoute, "GET /health", "ok\n");
  assertRouteBody(byRoute, "GET /api/health", '{"ok":true,"app":"laravel-min"}');
  assertRouteStatus(byRoute, "GET /jump", 302);
  assertRouteHeaderContains(byRoute, "GET /jump", "location", "/health");
  assertRouteBody(
    byRoute,
    "GET /",
    '<h1>laravel-min</h1><p>Chrysalis flagship skeleton</p>',
  );
  assertRouteHeaderContains(byRoute, "GET /", "content-type", "text/html");
  assertRouteBody(byRoute, "GET /items", "1:alpha\n2:beta\n");
  assertRouteHeaderContains(byRoute, "GET /items", "content-type", "text/plain");
  assertRouteBody(byRoute, "GET /count", "2\n");
  assertRouteHeaderContains(byRoute, "GET /count", "content-type", "text/plain");
  assertRouteContainsBody(byRoute, "GET /session/visit", "visits:1\n");
  assertRouteContainsBody(byRoute, "GET /session/visit", "visits:2\n");
  assertRouteHeaderContains(byRoute, "GET /login", "content-type", "text/html");
  assertRouteContainsBody(byRoute, "GET /login", "<title>Login</title>");
  assertRouteContainsBody(byRoute, "GET /login", 'name="csrf"');
  assertRouteBody(byRoute, "GET /robots.txt", "User-agent: *\nDisallow:\n");
  assertRouteBody(byRoute, "GET /humans.txt", "Chrysalis flagship pilot\nProject: laravel-min\n");
  assertRouteBody(
    byRoute,
    "GET /.well-known/security.txt",
    "Contact: mailto:chrysalis-security@example.invalid\nAcknowledgments: Chrysalis flagship pilot (fixture only).\n",
  );
  assertRouteBody(
    byRoute,
    "GET /sitemap.xml",
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://chrysalis-pilot.example.invalid/</loc></url></urlset>',
  );
  assertRouteBody(
    byRoute,
    "GET /css/pilot.css",
    "/* chrysalis flagship laravel-min pilot */\n:root { color: #111; }\n",
  );
  assertRouteBody(
    byRoute,
    "GET /manifest.webmanifest",
    '{"name":"Chrysalis laravel-min pilot","short_name":"pilot","start_url":"/","display":"standalone"}',
  );
  assertRouteHeaderContains(byRoute, "GET /robots.txt", "content-type", "text/plain");
  assertRouteHeaderContains(byRoute, "GET /humans.txt", "content-type", "text/plain");
  assertRouteHeaderContains(byRoute, "GET /.well-known/security.txt", "content-type", "text/plain");
  assertRouteHeaderContains(byRoute, "GET /sitemap.xml", "content-type", "application/xml");
  assertRouteHeaderContains(byRoute, "GET /css/pilot.css", "content-type", "text/css");
  assertRouteHeaderContains(byRoute, "GET /manifest.webmanifest", "content-type", "application/manifest+json");
  assertRouteContainsBody(byRoute, "POST /echo", "echo:flagship-verify\n");
  assertRouteContainsBody(byRoute, "POST /echo", "echo:second-post\n");
  assertRouteContainsBody(byRoute, "POST /echo", "msg required\n");
  assertRouteStatus(byRoute, "GET /echo", 404);
  assertRouteBody(byRoute, "GET /echo", "Not Found");
  assertRouteContainsBody(byRoute, "GET /session/me", "user:anon\n");
  assertRouteContainsBody(byRoute, "GET /session/me", "user:1\n");
  assertRouteContainsStatus(byRoute, "POST /login", 302);
  assertRouteContainsStatus(byRoute, "POST /login", 403);
  assertRouteContainsBody(byRoute, "POST /login", "csrf rejected\n");
  assertRouteStatus(byRoute, "POST /logout", 302);
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

function assertRouteBody(byRoute, routeSig, expectedBody) {
  const traces = byRoute.get(routeSig) ?? [];
  if (traces.length === 0) {
    throw new Error(`[verify-flagship] missing traces for ${routeSig}`);
  }
  for (const trace of traces) {
    const response = trace.events.find((e) => e.type === "http.response");
    if (!response || response.type !== "http.response") {
      throw new Error(`[verify-flagship] missing http.response event for ${routeSig}`);
    }
    if (response.body !== expectedBody) {
      throw new Error(
        `[verify-flagship] ${routeSig} body mismatch; expected ${expectedBody}, got ${response.body}`,
      );
    }
  }
}

function assertRouteStatus(byRoute, routeSig, expectedStatus) {
  const traces = byRoute.get(routeSig) ?? [];
  if (traces.length === 0) {
    throw new Error(`[verify-flagship] missing traces for ${routeSig}`);
  }
  for (const trace of traces) {
    const response = trace.events.find((e) => e.type === "http.response");
    if (!response || response.type !== "http.response") {
      throw new Error(`[verify-flagship] missing http.response event for ${routeSig}`);
    }
    if (response.status !== expectedStatus) {
      throw new Error(
        `[verify-flagship] ${routeSig} expected status ${expectedStatus}, got ${response.status}`,
      );
    }
  }
}

/**
 * @param {ReturnType<typeof groupByRoute>} byRoute
 * @param {string} routeSig
 * @param {number} expectedStatus
 */
function assertRouteContainsStatus(byRoute, routeSig, expectedStatus) {
  const traces = byRoute.get(routeSig) ?? [];
  if (traces.length === 0) {
    throw new Error(`[verify-flagship] missing traces for ${routeSig}`);
  }
  const has = traces.some((trace) => {
    const response = trace.events.find((e) => e.type === "http.response");
    return response && response.type === "http.response" && response.status === expectedStatus;
  });
  if (!has) {
    throw new Error(`[verify-flagship] ${routeSig} missing a trace with status ${expectedStatus}`);
  }
}

function assertRouteHeaderContains(byRoute, routeSig, headerName, expectedFragment) {
  const traces = byRoute.get(routeSig) ?? [];
  if (traces.length === 0) {
    throw new Error(`[verify-flagship] missing traces for ${routeSig}`);
  }
  for (const trace of traces) {
    const response = trace.events.find((e) => e.type === "http.response");
    if (!response || response.type !== "http.response") {
      throw new Error(`[verify-flagship] missing http.response event for ${routeSig}`);
    }
    const key = Object.keys(response.headers ?? {}).find((k) => k.toLowerCase() === headerName.toLowerCase());
    const value = key ? String(response.headers[key] ?? "") : "";
    if (!value.toLowerCase().includes(expectedFragment.toLowerCase())) {
      throw new Error(
        `[verify-flagship] ${routeSig} expected header ${headerName} to include ${expectedFragment}, got ${value}`,
      );
    }
  }
}

function stableReportFingerprint(report) {
  const stable = {
    aggregate: report.aggregate,
    endpoints: report.endpoints,
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

function assertCrossBackendReportParity(summaries) {
  if (summaries.length < 2) {
    return { ok: true, skipped: true, reason: "fewer than two backend summaries" };
  }
  const ref = summaries[0].stableFingerprint;
  const mismatches = summaries.filter((s) => s.stableFingerprint !== ref);
  if (mismatches.length > 0) {
    return {
      ok: false,
      refFingerprint: ref,
      mismatchedBackends: mismatches.map((s) => s.backend),
      fingerprints: Object.fromEntries(summaries.map((s) => [s.backend, s.stableFingerprint])),
    };
  }
  return {
    ok: true,
    refFingerprint: ref,
    fingerprints: Object.fromEntries(summaries.map((s) => [s.backend, s.stableFingerprint])),
  };
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
