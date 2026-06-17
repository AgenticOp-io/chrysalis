/**
 * Shared emit HTTP replay verify for lift-helper SQL twin fixtures (B5.5 v2/v3).
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
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

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

export const LIFT_HELPER_SQL_SAME_TWIN_REPLAY_CONFIG = {
  kind: "chrysalis.lift-helper-sql-same-twin-replay",
  schemaVersion: 1,
  fixture: "fixtures/lift-helper-sql-same-twin",
  traceDir: "traces/lift-helper-sql-same-twin-ci",
  driveScript: "drive-lift-helper-sql-same-twin.mjs",
  generatedDir: "generated/lift-helper-sql-same-twin-replay",
};

export const LIFT_HELPER_SQL_CASE_TWIN_REPLAY_CONFIG = {
  kind: "chrysalis.lift-helper-sql-case-twin-replay",
  schemaVersion: 1,
  fixture: "fixtures/lift-helper-sql-case-twin",
  traceDir: "traces/lift-helper-sql-case-twin-ci",
  driveScript: "drive-lift-helper-sql-case-twin.mjs",
  generatedDir: "generated/lift-helper-sql-case-twin-replay",
};

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

/**
 * @param {typeof LIFT_HELPER_SQL_SAME_TWIN_REPLAY_CONFIG} config
 * @param {{ capture?: boolean }} [opts]
 */
export async function runLiftHelperSqlTwinReplayVerify(config, opts = {}) {
  const replayParsed = resolveVerifyReplayExtras({});
  if (!replayParsed.ok) {
    return {
      kind: config.kind,
      schemaVersion: config.schemaVersion,
      ok: false,
      reason: "replay-options-invalid",
      message: replayParsed.message,
      fixture: config.fixture,
      generatedAt: new Date().toISOString(),
    };
  }

  if (!phpAvailable()) {
    return {
      kind: config.kind,
      schemaVersion: config.schemaVersion,
      ok: true,
      skip: "no-php",
      fixture: config.fixture,
      generatedAt: new Date().toISOString(),
    };
  }

  const fixture = resolve(repo, config.fixture);
  const traceDir = resolve(repo, config.traceDir);
  const generated = resolve(repo, config.generatedDir);
  const driveScript = resolve(here, config.driveScript);

  if (opts.capture !== false) {
    const drive = spawnSync(process.execPath, [driveScript], { encoding: "utf8", cwd: repo });
    if ((drive.status ?? 1) !== 0) {
      return {
        kind: config.kind,
        schemaVersion: config.schemaVersion,
        ok: false,
        reason: "drive-failed",
        stderr: drive.stderr,
        fixture: config.fixture,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  const corpus = readCorpus({ root: traceDir });
  if (corpus.traces.length < 2) {
    return {
      kind: config.kind,
      schemaVersion: config.schemaVersion,
      ok: false,
      reason: "missing-traces",
      traceCount: corpus.traces.length,
      fixture: config.fixture,
      generatedAt: new Date().toISOString(),
    };
  }

  const webirModule = await ingestDirectory(fixture);
  const irHoles = countHoles(webirModule);
  if (irHoles > 0) {
    return {
      kind: config.kind,
      schemaVersion: config.schemaVersion,
      ok: false,
      reason: "ingest-holes",
      irHoles,
      fixture: config.fixture,
      generatedAt: new Date().toISOString(),
    };
  }

  if (existsSync(generated)) rmSync(generated, { recursive: true, force: true });
  const emitRes = await emitHono({ module: webirModule, outDir: generated, provenanceRoot: fixture });
  if (emitRes.holes.length > 0) {
    return {
      kind: config.kind,
      schemaVersion: config.schemaVersion,
      ok: false,
      reason: "emit-holes",
      emitHoles: emitRes.holes.length,
      fixture: config.fixture,
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
    kind: config.kind,
    schemaVersion: config.schemaVersion,
    ok,
    fixture: config.fixture,
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
