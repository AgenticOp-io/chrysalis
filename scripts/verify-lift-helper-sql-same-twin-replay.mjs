#!/usr/bin/env node
/**
 * B5.5 v2 emit HTTP replay verify for sql-same-twin: oracle capture → ingest (inline helpers) →
 * emit Hono → in-process replayCorpus at threshold 1.0.
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { readCorpus } from "../packages/oracle/dist/index.js";
import { ingestDirectory } from "../packages/ingest/dist/index.js";
import { emit as emitHono } from "../packages/emit-hono/dist/index.js";
import { countHoles } from "../packages/webir/dist/index.js";
import {
  buildReport,
  replayCorpus,
  resolveVerifyReplayExtras,
} from "../packages/verify/dist/index.js";

export const LIFT_HELPER_SQL_SAME_TWIN_REPLAY_KIND = "chrysalis.lift-helper-sql-same-twin-replay";
export const LIFT_HELPER_SQL_SAME_TWIN_REPLAY_SCHEMA_VERSION = 1;

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const fixture = resolve(repo, "fixtures/lift-helper-sql-same-twin");
const traceDir = resolve(repo, "traces/lift-helper-sql-same-twin-ci");
const generated = resolve(repo, "generated/lift-helper-sql-same-twin-replay");
const driveScript = resolve(here, "drive-lift-helper-sql-same-twin.mjs");
const THRESHOLD = 1;

function phpAvailable() {
  try {
    execSync("php --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function loadEmittedFetch(outAbs) {
  const { tsImport } = await import("tsx/esm/api");
  process.env.CHRYSALIS_DB_PATH = join(outAbs, "blog.sqlite");
  const parentURL = pathToFileURL(join(outAbs, "package.json")).href;
  const mod = await tsImport("./src/server.ts", parentURL);
  if (typeof mod.chrysalisInProcessFetch === "function") {
    return mod.chrysalisInProcessFetch.bind(mod);
  }
  if (typeof mod.app?.fetch !== "function") {
    throw new Error(`expected Hono app.fetch from ${outAbs}`);
  }
  const honoFetch = mod.app.fetch.bind(mod.app);
  return async (url, init) => honoFetch(new Request(url, init));
}

export async function runLiftHelperSqlSameTwinReplayVerify(opts = {}) {
  const replayParsed = resolveVerifyReplayExtras({});
  if (!replayParsed.ok) {
    return {
      kind: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_KIND,
      schemaVersion: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_SCHEMA_VERSION,
      ok: false,
      reason: "replay-options-invalid",
      message: replayParsed.message,
      fixture: "fixtures/lift-helper-sql-same-twin",
      generatedAt: new Date().toISOString(),
    };
  }

  if (!phpAvailable()) {
    return {
      kind: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_KIND,
      schemaVersion: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_SCHEMA_VERSION,
      ok: true,
      skip: "no-php",
      fixture: "fixtures/lift-helper-sql-same-twin",
      generatedAt: new Date().toISOString(),
    };
  }

  if (opts.capture !== false) {
    const drive = spawnSync(process.execPath, [driveScript], { encoding: "utf8", cwd: repo });
    if ((drive.status ?? 1) !== 0) {
      return {
        kind: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_KIND,
        schemaVersion: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_SCHEMA_VERSION,
        ok: false,
        reason: "drive-failed",
        stderr: drive.stderr,
        fixture: "fixtures/lift-helper-sql-same-twin",
        generatedAt: new Date().toISOString(),
      };
    }
  }

  const corpus = readCorpus({ root: traceDir });
  if (corpus.traces.length < 2) {
    return {
      kind: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_KIND,
      schemaVersion: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_SCHEMA_VERSION,
      ok: false,
      reason: "missing-traces",
      traceCount: corpus.traces.length,
      fixture: "fixtures/lift-helper-sql-same-twin",
      generatedAt: new Date().toISOString(),
    };
  }

  const webirModule = await ingestDirectory(fixture);
  const irHoles = countHoles(webirModule);
  if (irHoles > 0) {
    return {
      kind: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_KIND,
      schemaVersion: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_SCHEMA_VERSION,
      ok: false,
      reason: "ingest-holes",
      irHoles,
      fixture: "fixtures/lift-helper-sql-same-twin",
      generatedAt: new Date().toISOString(),
    };
  }

  if (existsSync(generated)) rmSync(generated, { recursive: true, force: true });
  const emitRes = await emitHono({ module: webirModule, outDir: generated, provenanceRoot: fixture });
  if (emitRes.holes.length > 0) {
    return {
      kind: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_KIND,
      schemaVersion: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_SCHEMA_VERSION,
      ok: false,
      reason: "emit-holes",
      emitHoles: emitRes.holes.length,
      fixture: "fixtures/lift-helper-sql-same-twin",
      generatedAt: new Date().toISOString(),
    };
  }

  execSync("npm install --no-audit --no-fund --silent", { cwd: generated, stdio: "inherit" });

  const dbPath = join(generated, "blog.sqlite");
  if (existsSync(dbPath)) rmSync(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec(readFileSync(join(fixture, "schema.sql"), "utf8"));
  db.close();

  const fetchFn = await loadEmittedFetch(generated);
  const outcomes = await replayCorpus(corpus, {
    baseUrl: "http://127.0.0.1:3000",
    fetch: fetchFn,
    recordedSqlReplay: true,
    module: webirModule,
    ...replayParsed.extras,
  });
  const report = buildReport(outcomes);
  const correctness = report.aggregate.correctness;
  const ok = correctness + 1e-9 >= THRESHOLD;

  return {
    kind: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_KIND,
    schemaVersion: LIFT_HELPER_SQL_SAME_TWIN_REPLAY_SCHEMA_VERSION,
    ok,
    fixture: "fixtures/lift-helper-sql-same-twin",
    traceCount: corpus.traces.length,
    handlerCount: emitRes.handlerCount,
    irHoles,
    emitHoles: emitRes.holes.length,
    correctness,
    framesPassed: report.aggregate.framesPassed,
    framesTotal: report.aggregate.framesTotal,
    threshold: THRESHOLD,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runLiftHelperSqlSameTwinReplayVerify();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && report.skip !== "no-php") process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
