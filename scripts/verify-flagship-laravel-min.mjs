#!/usr/bin/env node
/**
 * Milestone 4: Oracle capture + dual emit (Hono + Fastify) + in-process verify
 * for `flagship/laravel-min` (GET routes + **`GET /hello`** default / empty / two
 * named queries / encoded multi-word **`name`**, two `POST /echo`
 * bodies, `GET /jump` (302 `Location: /health`), `GET /session/visit` x2,
 * `GET /session/me`, **`GET /gate-probe`** + **`GET /gate-probe?m=deny`** (Gate facade stub),
 * `GET /login` + `POST /login` (bad CSRF 403, bad password 401, empty 400, then bcrypt + CSRF) + `GET /session/me`,
 * `POST /logout` + `GET /session/me` again, wrong-method **`GET /echo`** / **`GET /logout`** /
 * **`POST /session/me`** / **`POST /session/visit`** / **`POST /count`** / **`POST /items`** /
 * **`POST /health`** / **`POST /api/health`** / **`POST /jump`** / **`POST /hello`** /
 * **`POST /`** / **`POST /robots.txt`** / **`POST /humans.txt`** /
 * **`POST /.well-known/security.txt`** / **`POST /sitemap.xml`** /
 * **`POST /css/pilot.css`** / **`POST /manifest.webmanifest`** / **`PUT /login`** (404),
 * `GET /api/health` x2, `GET /robots.txt`,
 * `GET /humans.txt`, `GET /.well-known/security.txt`, `GET /sitemap.xml`,
 * `GET /css/pilot.css`, and `GET /manifest.webmanifest` in the base GET fan-out + widened capture loop).
 *
 * PHP's document root is `public/` (Laravel-shaped); ingest manifest lives at
 * project root (`chrysalis.routes.json`).
 *
 * Requires PHP on PATH. Exits 0 with a skip notice if PHP is missing (same as
 * verify-tiny-blog.mjs).
 *
 * Replay tuning (env-only, same as `chrysalis verify`): `CHRYSALIS_VERIFY_REPLAY_CONCURRENCY`,
 * `CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN=1`, `CHRYSALIS_VERIFY_TIMEOUT_MS`,
 * `CHRYSALIS_VERIFY_WORKER_THREADS=1` (D204 / D206).
 *
 * Writes **`reports/migration/flagship-laravel-min-emit-stats.json`** for
 * **`pnpm run status:laravel-min`** → **`scripts/flagship-migration-metrics.mjs`**
 * (includes **`ingest.holes` / `ingest.authHoles`** for residual sidecars, D188).
 *
 * **Milestone 6A:** after each backend replay, enforces the same **`VERIFY_THRESHOLD`**
 * on the auth-boundary route subset defined in **`milestone-6a-auth-verify-gate.mjs`**
 * (`GET/POST /login`, `POST /logout`, `GET /session/me`, **`GET /gate-probe`**) and fails if any required
 * route is missing from the corpus.
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
import { summarizeEmittedTypeScriptLayout } from "../packages/emit-shared/dist/index.js";
import {
  countAuthTaggedHoles as countWebirAuthTaggedHoles,
  countHoles as countWebirHoles,
} from "../packages/webir/dist/index.js";
import { countAuthTaggedHoles } from "./flagship-migration-metrics.mjs";
import {
  LARAVEL_MIN_AUTH_BOUNDARY_ROUTES,
  authBoundaryReplayRollup,
} from "./milestone-6a-auth-verify-gate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const fixture = resolve(repo, "flagship/laravel-min");
const docroot = resolve(fixture, "public");
const traceDir = resolve(repo, "traces/flagship-laravel-min");
const generatedHono = resolve(repo, "generated/flagship-laravel-min");
const generatedFastify = resolve(repo, "generated/flagship-laravel-min-fastify");
const reportRoot = resolve(repo, "reports/verify-flagship-laravel-min");
const ciReportDir = resolve(repo, "reports/ci");
const ciSummaryPath = resolve(ciReportDir, "verify-flagship-laravel-min-summary.json");
const preludePath = resolve(repo, "packages/oracle-php/src/bootstrap.php");
const THRESHOLD = Number.parseFloat(process.env.VERIFY_THRESHOLD ?? "0.95");

const replayParsed = resolveVerifyReplayExtras({});
if (!replayParsed.ok) {
  console.error(replayParsed.message);
  process.exit(2);
}
if (replayParsed.logHint) {
  console.log(`[verify-flagship] replay options: ${replayParsed.logHint}`);
}

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
const resH = await emitHono({ module: webirModule, outDir: generatedHono, provenanceRoot: fixture });
console.log(
  `[verify-flagship] emit-hono handlers=${resH.handlerCount} emit-holes=${resH.holes.length}`,
);

console.log("[verify-flagship] emitting Fastify...");
if (existsSync(generatedFastify)) rmSync(generatedFastify, { recursive: true, force: true });
const resF = await emitFastify({ module: webirModule, outDir: generatedFastify, provenanceRoot: fixture });
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
  ingest: {
    holes: countWebirHoles(webirModule),
    authHoles: countWebirAuthTaggedHoles(webirModule),
  },
  hono: {
    holes: resH.holes.length,
    authHoles: countAuthTaggedHoles(resH.holes),
    handlerCount: resH.handlerCount,
    layout: summarizeEmittedTypeScriptLayout(generatedHono),
  },
  fastify: {
    holes: resF.holes.length,
    authHoles: countAuthTaggedHoles(resF.holes),
    handlerCount: resF.handlerCount,
    layout: summarizeEmittedTypeScriptLayout(generatedFastify),
  },
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
    // Default redaction hashes `sql.row.password` in SELECT tapes; replaying
    // those rows makes `passwordVerify` see `sha256:…` instead of a bcrypt
    // hash (login always fails). Let SELECTs hit the emitted SQLite DB here.
    recordedSqlReplay: true,
    module: webirModule,
    ...replayParsed.extras,
  });
  const report = buildReport(outcomes);
  const outDir = join(reportRoot, b.id);
  const written = writeReport(outDir, report, outcomes);
  console.log(`[verify-flagship] wrote ${written.length} report file(s) under ${outDir}`);
  console.log(
    `[verify-flagship] ${b.id} aggregate: ${(report.aggregate.correctness * 100).toFixed(1)}%  (${report.aggregate.framesPassed}/${report.aggregate.framesTotal})`,
  );

  const authRollup = authBoundaryReplayRollup(report, LARAVEL_MIN_AUTH_BOUNDARY_ROUTES);
  if (authRollup.missingRoutes.length > 0) {
    console.error(
      `[verify-flagship] Milestone 6A auth corpus incomplete [${b.id}]: missing routes ${authRollup.missingRoutes.join(", ")}`,
    );
    exitCode = 1;
  } else if (authRollup.framesTotal > 0 && authRollup.correctness + 1e-9 < THRESHOLD) {
    console.error(
      `[verify-flagship] Milestone 6A auth-route correctness ${authRollup.correctness.toFixed(3)} below threshold ${THRESHOLD} (${authRollup.framesPassed}/${authRollup.framesTotal} frames) [${b.id}]`,
    );
    exitCode = 1;
  } else if (authRollup.framesTotal > 0) {
    console.log(
      `[verify-flagship] Milestone 6A auth-route gate OK: ${(authRollup.correctness * 100).toFixed(1)}% (${authRollup.framesPassed}/${authRollup.framesTotal}) [${b.id}]`,
    );
  }

  backendSummaries.push({
    backend: b.id,
    summaryPath: join(outDir, "summary.json"),
    aggregate: report.aggregate,
    failedFrameCount: report.aggregate.framesTotal - report.aggregate.framesPassed,
    endpoints: report.endpoints,
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

mkdirSync(ciReportDir, { recursive: true });
writeFileSync(
  ciSummaryPath,
  `${JSON.stringify(
    {
      kind: "chrysalis.verify.summary.dual",
      schemaVersion: 1,
      toolVersion: repoToolVersion(repo),
      profile: "flagship-laravel-min",
      corpusRoot: traceDir,
      threshold: THRESHOLD,
      reportDir: reportRoot,
      generatedAt: new Date().toISOString(),
      pass: exitCode === 0,
      crossBackendParity,
      backends: backendSummaries,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
console.log(`[verify-flagship] wrote machine summary: ${ciSummaryPath}`);

if (exitCode === 0) {
  console.log("\n[verify-flagship] dual-backend gate OK (laravel-min).");
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
  /** @type {Map<string, string>} */
  const cookieJar = new Map();
  function absorbResponseCookies(res) {
    const lines =
      typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    if (lines.length === 0) {
      const single = res.headers.get("set-cookie");
      if (single) lines.push(single);
    }
    for (const line of lines) {
      const part = line.split(";")[0]?.trim() ?? "";
      const eq = part.indexOf("=");
      if (eq > 0) cookieJar.set(part.slice(0, eq), part.slice(eq + 1));
    }
  }
  /** @param {RequestInit | undefined} init */
  function withJarCookies(init) {
    if (cookieJar.size === 0) return init;
    const headers = new Headers(init?.headers);
    const tail = [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    const prev = headers.get("cookie");
    headers.set("cookie", prev ? `${prev}; ${tail}` : tail);
    return { ...init, headers };
  }
  async function sf(url, init) {
    const res = await fetch(url, withJarCookies(init));
    absorbResponseCookies(res);
    return res;
  }
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
    const r = await sf(`${base}${p}`);
    if (!r.ok) {
      console.warn(`[verify-flagship] GET ${p} returned ${r.status}`);
    }
  }

  const helloDefault = await sf(`${base}/hello`);
  if (!helloDefault.ok) {
    console.warn(`[verify-flagship] GET /hello (default) returned ${helloDefault.status}`);
  }
  const helloEmpty = await sf(`${base}/hello?name=`);
  if (!helloEmpty.ok) {
    console.warn(`[verify-flagship] GET /hello?name= returned ${helloEmpty.status}`);
  }
  const helloA = await sf(`${base}/hello?name=flagship-corpus`);
  if (!helloA.ok) {
    console.warn(`[verify-flagship] GET /hello returned ${helloA.status}`);
  }
  const helloB = await sf(`${base}/hello?name=chrysalis`);
  if (!helloB.ok) {
    console.warn(`[verify-flagship] GET /hello returned ${helloB.status}`);
  }
  const helloEncoded = await sf(`${base}/hello?name=${encodeURIComponent("x y")}`);
  if (!helloEncoded.ok) {
    console.warn(`[verify-flagship] GET /hello (encoded name) returned ${helloEncoded.status}`);
  }

  const apiHealth = await sf(`${base}/api/health`);
  if (!apiHealth.ok) {
    console.warn(`[verify-flagship] GET /api/health returned ${apiHealth.status}`);
  }

  const jump = await sf(`${base}/jump`, { redirect: "manual" });
  if (jump.status < 300 || jump.status >= 400) {
    console.warn(`[verify-flagship] GET /jump expected 3xx, got ${jump.status}`);
  }

  const echoRes = await sf(`${base}/echo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ msg: "flagship-verify" }).toString(),
    redirect: "manual",
  });
  if (!echoRes.ok) {
    console.warn(`[verify-flagship] POST /echo returned ${echoRes.status}`);
  }

  const echo2 = await sf(`${base}/echo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ msg: "second-post" }).toString(),
    redirect: "manual",
  });
  if (!echo2.ok) {
    console.warn(`[verify-flagship] POST /echo (second) returned ${echo2.status}`);
  }
  const echoEmpty = await sf(`${base}/echo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({}).toString(),
    redirect: "manual",
  });
  if (echoEmpty.ok || echoEmpty.status !== 400) {
    console.warn(`[verify-flagship] POST /echo (empty) expected 400, got ${echoEmpty.status}`);
  }
  const echoJson = await sf(`${base}/echo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ msg: "json-body" }),
    redirect: "manual",
  });
  if (echoJson.ok || echoJson.status !== 400) {
    console.warn(`[verify-flagship] POST /echo (json) expected 400, got ${echoJson.status}`);
  }
  const echoWrongMethod = await sf(`${base}/echo`);
  if (echoWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] GET /echo expected 404, got ${echoWrongMethod.status}`);
  }
  const logoutWrongMethod = await sf(`${base}/logout`);
  if (logoutWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] GET /logout expected 404, got ${logoutWrongMethod.status}`);
  }
  const meWrongMethod = await sf(`${base}/session/me`, { method: "POST" });
  if (meWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /session/me expected 404, got ${meWrongMethod.status}`);
  }
  const visitWrongMethod = await sf(`${base}/session/visit`, { method: "POST" });
  if (visitWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /session/visit expected 404, got ${visitWrongMethod.status}`);
  }
  const countWrongMethod = await sf(`${base}/count`, { method: "POST" });
  if (countWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /count expected 404, got ${countWrongMethod.status}`);
  }
  const itemsWrongMethod = await sf(`${base}/items`, { method: "POST" });
  if (itemsWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /items expected 404, got ${itemsWrongMethod.status}`);
  }
  const healthWrongMethod = await sf(`${base}/health`, { method: "POST" });
  if (healthWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /health expected 404, got ${healthWrongMethod.status}`);
  }
  const apiHealthWrongMethod = await sf(`${base}/api/health`, { method: "POST" });
  if (apiHealthWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /api/health expected 404, got ${apiHealthWrongMethod.status}`);
  }
  const jumpWrongMethod = await sf(`${base}/jump`, { method: "POST" });
  if (jumpWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /jump expected 404, got ${jumpWrongMethod.status}`);
  }
  const helloWrongMethod = await sf(`${base}/hello`, { method: "POST" });
  if (helloWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /hello expected 404, got ${helloWrongMethod.status}`);
  }
  const homeWrongMethod = await sf(`${base}/`, { method: "POST" });
  if (homeWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST / expected 404, got ${homeWrongMethod.status}`);
  }
  const robotsWrongMethod = await sf(`${base}/robots.txt`, { method: "POST" });
  if (robotsWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /robots.txt expected 404, got ${robotsWrongMethod.status}`);
  }
  const humansWrongMethod = await sf(`${base}/humans.txt`, { method: "POST" });
  if (humansWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /humans.txt expected 404, got ${humansWrongMethod.status}`);
  }
  const securityWrongMethod = await sf(`${base}/.well-known/security.txt`, { method: "POST" });
  if (securityWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /.well-known/security.txt expected 404, got ${securityWrongMethod.status}`);
  }
  const sitemapWrongMethod = await sf(`${base}/sitemap.xml`, { method: "POST" });
  if (sitemapWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /sitemap.xml expected 404, got ${sitemapWrongMethod.status}`);
  }
  const cssWrongMethod = await sf(`${base}/css/pilot.css`, { method: "POST" });
  if (cssWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /css/pilot.css expected 404, got ${cssWrongMethod.status}`);
  }
  const manifestWrongMethod = await sf(`${base}/manifest.webmanifest`, { method: "POST" });
  if (manifestWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] POST /manifest.webmanifest expected 404, got ${manifestWrongMethod.status}`);
  }
  const loginPutWrongMethod = await sf(`${base}/login`, { method: "PUT" });
  if (loginPutWrongMethod.status !== 404) {
    console.warn(`[verify-flagship] PUT /login expected 404, got ${loginPutWrongMethod.status}`);
  }

  for (let i = 0; i < 2; i++) {
    const sv = await sf(`${base}/session/visit`);
    if (!sv.ok) {
      console.warn(`[verify-flagship] GET /session/visit returned ${sv.status}`);
    }
  }

  const me0 = await sf(`${base}/session/me`);
  if (!me0.ok) {
    console.warn(`[verify-flagship] GET /session/me returned ${me0.status}`);
  }

  const gateAllow = await sf(`${base}/gate-probe`);
  if (!gateAllow.ok) {
    console.warn(`[verify-flagship] GET /gate-probe returned ${gateAllow.status}`);
  }
  const gateDeny = await sf(`${base}/gate-probe?m=deny`);
  if (!gateDeny.ok) {
    console.warn(`[verify-flagship] GET /gate-probe?m=deny returned ${gateDeny.status}`);
  }

  const loginForm = await sf(`${base}/login`);
  if (!loginForm.ok) {
    console.warn(`[verify-flagship] GET /login returned ${loginForm.status}`);
  }
  const loginBadCsrf = await sf(`${base}/login`, {
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
  const loginBadPassword = await sf(`${base}/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrf: "flagship_csrf_static",
      username: "flagship",
      password: "wrong-password",
    }).toString(),
    redirect: "manual",
  });
  if (loginBadPassword.status !== 401) {
    console.warn(`[verify-flagship] POST /login (bad password) expected 401, got ${loginBadPassword.status}`);
  }
  const loginEmptyCreds = await sf(`${base}/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrf: "flagship_csrf_static" }).toString(),
    redirect: "manual",
  });
  if (loginEmptyCreds.status !== 400) {
    console.warn(`[verify-flagship] POST /login (empty creds) expected 400, got ${loginEmptyCreds.status}`);
  }
  const loginPost = await sf(`${base}/login`, {
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
  const me1 = await sf(`${base}/session/me`);
  if (!me1.ok) {
    console.warn(`[verify-flagship] GET /session/me (after login) returned ${me1.status}`);
  }

  const logoutRes = await sf(`${base}/logout`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "",
    redirect: "manual",
  });
  if (logoutRes.status < 300 || logoutRes.status >= 400) {
    console.warn(`[verify-flagship] POST /logout expected 3xx, got ${logoutRes.status}`);
  }
  const me2 = await sf(`${base}/session/me`);
  if (!me2.ok) {
    console.warn(`[verify-flagship] GET /session/me (after logout) returned ${me2.status}`);
  }

  const apiTail = await sf(`${base}/api/health`);
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
  assertRouteStatus(byRoute, "GET /logout", 404);
  assertRouteBody(byRoute, "GET /logout", "Not Found");
  assertRouteStatus(byRoute, "POST /session/me", 404);
  assertRouteBody(byRoute, "POST /session/me", "Not Found");
  assertRouteStatus(byRoute, "POST /session/visit", 404);
  assertRouteBody(byRoute, "POST /session/visit", "Not Found");
  assertRouteStatus(byRoute, "POST /count", 404);
  assertRouteBody(byRoute, "POST /count", "Not Found");
  assertRouteStatus(byRoute, "POST /items", 404);
  assertRouteBody(byRoute, "POST /items", "Not Found");
  assertRouteStatus(byRoute, "POST /health", 404);
  assertRouteBody(byRoute, "POST /health", "Not Found");
  assertRouteStatus(byRoute, "POST /api/health", 404);
  assertRouteBody(byRoute, "POST /api/health", "Not Found");
  assertRouteStatus(byRoute, "POST /jump", 404);
  assertRouteBody(byRoute, "POST /jump", "Not Found");
  assertRouteStatus(byRoute, "POST /hello", 404);
  assertRouteBody(byRoute, "POST /hello", "Not Found");
  assertRouteStatus(byRoute, "POST /", 404);
  assertRouteBody(byRoute, "POST /", "Not Found");
  assertRouteStatus(byRoute, "POST /robots.txt", 404);
  assertRouteBody(byRoute, "POST /robots.txt", "Not Found");
  assertRouteStatus(byRoute, "POST /humans.txt", 404);
  assertRouteBody(byRoute, "POST /humans.txt", "Not Found");
  assertRouteStatus(byRoute, "POST /.well-known/security.txt", 404);
  assertRouteBody(byRoute, "POST /.well-known/security.txt", "Not Found");
  assertRouteStatus(byRoute, "POST /sitemap.xml", 404);
  assertRouteBody(byRoute, "POST /sitemap.xml", "Not Found");
  assertRouteStatus(byRoute, "POST /css/pilot.css", 404);
  assertRouteBody(byRoute, "POST /css/pilot.css", "Not Found");
  assertRouteStatus(byRoute, "POST /manifest.webmanifest", 404);
  assertRouteBody(byRoute, "POST /manifest.webmanifest", "Not Found");
  assertRouteStatus(byRoute, "PUT /login", 404);
  assertRouteBody(byRoute, "PUT /login", "Not Found");
  assertRouteContainsBody(byRoute, "GET /session/me", "user:anon\n");
  assertRouteContainsBody(byRoute, "GET /session/me", "user:1\n");
  assertRouteContainsBody(byRoute, "GET /gate-probe", "allow:1\n");
  assertRouteContainsBody(byRoute, "GET /gate-probe", "deny:1\n");
  assertRouteContainsStatus(byRoute, "POST /login", 302);
  assertRouteContainsStatus(byRoute, "POST /login", 403);
  assertRouteContainsStatus(byRoute, "POST /login", 401);
  assertRouteContainsStatus(byRoute, "POST /login", 400);
  assertRouteContainsBody(byRoute, "POST /login", "csrf rejected\n");
  assertRouteContainsBody(byRoute, "POST /login", "invalid credentials\n");
  assertRouteContainsBody(byRoute, "POST /login", "credentials required\n");
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
    return (
      response &&
      response.type === "http.response" &&
      typeof response.body === "string" &&
      response.body.includes(expectedBody)
    );
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
  const endpoints = report.endpoints.map((e) => ({
    route: e.route,
    framesTotal: e.framesTotal,
    framesPassed: e.framesPassed,
    correctness: e.correctness,
    divergences: e.divergences,
  }));
  const stable = {
    aggregate: report.aggregate,
    endpoints,
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
