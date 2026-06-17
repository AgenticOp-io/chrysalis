#!/usr/bin/env node
/**
 * B5.3 v5 oracle twin verify: capture /alpha + /beta, assert identical bodies + SQL,
 * then confirm semantic helper-lift aliases the lib twins.
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

export const LIFT_HELPER_SQL_SAME_TWIN_ORACLE_KIND = "chrysalis.lift-helper-sql-same-twin-oracle";
export const LIFT_HELPER_SQL_SAME_TWIN_ORACLE_SCHEMA_VERSION = 1;

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const fixture = resolve(repo, "fixtures/lift-helper-sql-same-twin");
const traceDir = resolve(repo, "traces/lift-helper-sql-same-twin-ci");
const driveScript = resolve(here, "drive-lift-helper-sql-same-twin.mjs");

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

async function semanticLiftAliasesBetaToAlpha() {
  const builder = new ModuleBuilder({ sourceApp: "sql-same-twin-oracle", chrysalisVersion: "1.0.0" });
  const bodies = new Map();
  for (const file of ["sql_same_alpha.php", "sql_same_beta.php"]) {
    const ast = await parseFile(resolve(fixture, "lib", file));
    for (const stmt of ast.statements) {
      if (stmt.kind !== "FunctionDecl") continue;
      bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
    }
  }
  const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
  return aliases.get("chrysalis_sql_same_beta") === "chrysalis_sql_same_alpha";
}

export async function runLiftHelperSqlSameTwinOracleVerify(opts = {}) {
  if (!phpAvailable()) {
    return {
      kind: LIFT_HELPER_SQL_SAME_TWIN_ORACLE_KIND,
      schemaVersion: LIFT_HELPER_SQL_SAME_TWIN_ORACLE_SCHEMA_VERSION,
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
        kind: LIFT_HELPER_SQL_SAME_TWIN_ORACLE_KIND,
        schemaVersion: LIFT_HELPER_SQL_SAME_TWIN_ORACLE_SCHEMA_VERSION,
        ok: false,
        reason: "drive-failed",
        stderr: drive.stderr,
        fixture: "fixtures/lift-helper-sql-same-twin",
        generatedAt: new Date().toISOString(),
      };
    }
  }

  const corpus = readCorpus({ root: traceDir });
  const alpha = corpus.traces.find((t) => requestPath(t) === "/alpha");
  const beta = corpus.traces.find((t) => requestPath(t) === "/beta");
  if (!alpha || !beta) {
    return {
      kind: LIFT_HELPER_SQL_SAME_TWIN_ORACLE_KIND,
      schemaVersion: LIFT_HELPER_SQL_SAME_TWIN_ORACLE_SCHEMA_VERSION,
      ok: false,
      reason: "missing-traces",
      traceCount: corpus.traces.length,
      fixture: "fixtures/lift-helper-sql-same-twin",
      generatedAt: new Date().toISOString(),
    };
  }

  const alphaBody = responseBody(alpha);
  const betaBody = responseBody(beta);
  const alphaSql = sqlQueries(alpha);
  const betaSql = sqlQueries(beta);
  const bodiesMatch = alphaBody === betaBody;
  const sqlMatch = JSON.stringify(alphaSql) === JSON.stringify(betaSql);
  const semanticAlias = await semanticLiftAliasesBetaToAlpha();

  const ok = bodiesMatch && sqlMatch && semanticAlias;
  return {
    kind: LIFT_HELPER_SQL_SAME_TWIN_ORACLE_KIND,
    schemaVersion: LIFT_HELPER_SQL_SAME_TWIN_ORACLE_SCHEMA_VERSION,
    ok,
    fixture: "fixtures/lift-helper-sql-same-twin",
    bodiesMatch,
    sqlMatch,
    semanticAlias,
    alphaBody,
    alphaSql,
    traceCount: corpus.traces.length,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runLiftHelperSqlSameTwinOracleVerify();
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
