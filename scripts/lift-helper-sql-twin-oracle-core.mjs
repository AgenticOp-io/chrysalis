/**
 * Shared oracle twin verify for lift-helper SQL twin fixtures (B5.3 v5 / B5.4 v2).
 */
import { execSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readCorpus } from "../packages/oracle/dist/index.js";
import { parseFile } from "../packages/parser-bridge/dist/index.js";
import { ModuleBuilder } from "../packages/webir/dist/index.js";
import {
  buildHelperLiftAliasMap,
  normalizeSqlLiteralForHelperLift,
} from "../packages/ingest/dist/index.js";
import { convertPhpStatementsToBlock } from "../packages/ingest/dist/convert.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

export const LIFT_HELPER_SQL_SAME_TWIN_ORACLE_CONFIG = {
  kind: "chrysalis.lift-helper-sql-same-twin-oracle",
  schemaVersion: 1,
  fixture: "fixtures/lift-helper-sql-same-twin",
  traceDir: "traces/lift-helper-sql-same-twin-ci",
  driveScript: "drive-lift-helper-sql-same-twin.mjs",
  libFiles: ["sql_same_alpha.php", "sql_same_beta.php"],
  betaHelper: "chrysalis_sql_same_beta",
  alphaHelper: "chrysalis_sql_same_alpha",
  sourceApp: "sql-same-twin-oracle",
};

export const LIFT_HELPER_SQL_CASE_TWIN_ORACLE_CONFIG = {
  kind: "chrysalis.lift-helper-sql-case-twin-oracle",
  schemaVersion: 1,
  fixture: "fixtures/lift-helper-sql-case-twin",
  traceDir: "traces/lift-helper-sql-case-twin-ci",
  driveScript: "drive-lift-helper-sql-case-twin.mjs",
  libFiles: ["sql_case_alpha.php", "sql_case_beta.php"],
  betaHelper: "chrysalis_sql_case_beta",
  alphaHelper: "chrysalis_sql_case_alpha",
  sourceApp: "sql-case-twin-oracle",
};

function phpAvailable() {
  try {
    execSync("php --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** @param {import("../packages/oracle/dist/index.js").Trace} trace */
function requestPath(trace) {
  const req = trace.events.find((e) => e.type === "http.request");
  return req && "path" in req ? String(req.path) : "";
}

/** @param {import("../packages/oracle/dist/index.js").Trace} trace */
function responseBody(trace) {
  const res = trace.events.find((e) => e.type === "http.response");
  return res && "body" in res ? String(res.body) : "";
}

/** @param {import("../packages/oracle/dist/index.js").Trace} trace */
function sqlQueries(trace) {
  return trace.events
    .filter((e) => e.type === "sql.query")
    .map((e) => normalizeSqlLiteralForHelperLift(String(e.sql)));
}

/**
 * @param {typeof LIFT_HELPER_SQL_SAME_TWIN_ORACLE_CONFIG} config
 */
async function semanticLiftAliasesBetaToAlpha(config) {
  const fixture = resolve(repo, config.fixture);
  const builder = new ModuleBuilder({ sourceApp: config.sourceApp, chrysalisVersion: "1.0.0" });
  const bodies = new Map();
  for (const file of config.libFiles) {
    const ast = await parseFile(resolve(fixture, "lib", file));
    for (const stmt of ast.statements) {
      if (stmt.kind !== "FunctionDecl") continue;
      bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
    }
  }
  const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
  return aliases.get(config.betaHelper) === config.alphaHelper;
}

/**
 * @param {typeof LIFT_HELPER_SQL_SAME_TWIN_ORACLE_CONFIG} config
 * @param {{ capture?: boolean }} [opts]
 */
export async function runLiftHelperSqlTwinOracleVerify(config, opts = {}) {
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

  if (opts.capture !== false) {
    const driveScript = resolve(here, config.driveScript);
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

  const traceDir = resolve(repo, config.traceDir);
  const corpus = readCorpus({ root: traceDir });
  const alpha = corpus.traces.find((t) => requestPath(t) === "/alpha");
  const beta = corpus.traces.find((t) => requestPath(t) === "/beta");
  if (!alpha || !beta) {
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

  const alphaBody = responseBody(alpha);
  const betaBody = responseBody(beta);
  const alphaSql = sqlQueries(alpha);
  const betaSql = sqlQueries(beta);
  const bodiesMatch = alphaBody === betaBody;
  const sqlMatch = JSON.stringify(alphaSql) === JSON.stringify(betaSql);
  const semanticAlias = await semanticLiftAliasesBetaToAlpha(config);

  const ok = bodiesMatch && sqlMatch && semanticAlias;
  return {
    kind: config.kind,
    schemaVersion: config.schemaVersion,
    ok,
    fixture: config.fixture,
    bodiesMatch,
    sqlMatch,
    semanticAlias,
    alphaBody,
    alphaSql,
    traceCount: corpus.traces.length,
    generatedAt: new Date().toISOString(),
  };
}
