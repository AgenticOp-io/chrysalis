/**
 * Structured CI assertions (JSON shape + TypeScript AST). Prefer this over
 * regex on emitted source or long inline `node -e` blocks in workflows.
 *
 * Usage:
 *   node scripts/ci-gates.mjs status-migration   # reads status --json from stdin
 *   node scripts/ci-gates.mjs tiny-n1-insight [reports/insight/tiny-n1.json]
 *   node scripts/ci-gates.mjs rewrite-pre-xss [reports/rewrite/before.json]
 *   node scripts/ci-gates.mjs tiny-n1-rewrite [repo-root]
 *
 * Env: VERIFY_THRESHOLD (default 0.95) for status-migration.
 */
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

/** Strip UTF-8 BOM so JSON.parse works if a tool wrote the file with BOM. */
function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function readJsonFile(path) {
  return JSON.parse(stripBom(fs.readFileSync(path, "utf8")));
}

function readStdinUtf8() {
  return stripBom(fs.readFileSync(0, "utf8"));
}

function assertStatusMigration() {
  const threshold = Number(process.env.VERIFY_THRESHOLD ?? "0.95");
  const s = JSON.parse(readStdinUtf8());
  if (!s.migration) fail("status-migration: missing migration");
  if (s.migration.coverage == null || s.migration.coverage.pct < 1 - 1e-9) {
    fail("status-migration: expected full IR coverage");
  }
  if (
    s.migration.correctness == null ||
    s.migration.correctness + 1e-9 < threshold
  ) {
    fail(`status-migration: expected verify correctness >= ${threshold}`);
  }
  if (!s.oracleFootprint) fail("status-migration: missing oracleFootprint");
  if (s.oracleFootprint.routeCount < 1) {
    fail("status-migration: expected oracle footprint routes");
  }
  if (
    !Array.isArray(s.oracleFootprint.routes) ||
    s.oracleFootprint.routes.length !== s.oracleFootprint.routeCount
  ) {
    fail("status-migration: oracleFootprint.routes must match routeCount");
  }
}

function assertTinyN1Insight(path) {
  const r = readJsonFile(path);
  const by = r.summary?.byRecognizer;
  const need = [
    "raw-sql-concat",
    "unescaped-output",
    "n-plus-one-queries",
    "scattered-validation",
    "string-dispatch",
  ];
  for (const k of need) {
    if (!(by[k] > 0)) {
      console.error("tiny-n1-insight: missing recognizer hits:", k, by);
      process.exit(1);
    }
  }
  const strongSec = r.opportunities.filter(
    (o) =>
      o.severity === "strong" &&
      (o.recognizer === "raw-sql-concat" || o.recognizer === "unescaped-output"),
  );
  const secKinds = new Set(strongSec.map((o) => o.recognizer));
  if (!secKinds.has("raw-sql-concat") || !secKinds.has("unescaped-output")) {
    console.error(
      "tiny-n1-insight: expected >=1 STRONG finding from each security recognizer; saw:",
      [...secKinds],
    );
    process.exit(1);
  }
  console.log("tiny-n1 insight OK:", JSON.stringify(r.summary));
}

function assertRewritePreXss(path) {
  const before = readJsonFile(path);
  const xssCount = before.opportunities.filter(
    (o) => o.recognizer === "unescaped-output",
  ).length;
  if (xssCount === 0) {
    fail("rewrite-pre-xss: expected XSS finding pre-rewrite, saw 0");
  }
  console.log("pre-rewrite XSS findings:", xssCount);
}

function assertTinyN1Rewrite(root) {
  const ts = require("typescript");
  const DB_CALLEES = new Set(["queryAll", "queryOne", "execSql"]);

  function unwrapParen(n) {
    let x = n;
    while (ts.isParenthesizedExpression(x)) x = x.expression;
    return x;
  }

  function callCalleeName(expr) {
    if (ts.isIdentifier(expr)) return expr.text;
    if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)) {
      return expr.name.text;
    }
    return undefined;
  }

  function parseSource(path) {
    const text = fs.readFileSync(path, "utf8");
    return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  }

  function hasEscapeHtmlCall(sf) {
    let ok = false;
    function visit(n) {
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        n.expression.text === "escapeHtml"
      ) {
        ok = true;
        return;
      }
      ts.forEachChild(n, visit);
    }
    visit(sf);
    return ok;
  }

  function assertLookupSql(sf, pathLabel) {
    let foundParameterizedSelect = false;

    function visit(n) {
      if (!ts.isCallExpression(n)) {
        ts.forEachChild(n, visit);
        return;
      }

      const callee = callCalleeName(n.expression);
      if (callee && DB_CALLEES.has(callee)) {
        const raw = n.arguments[0];
        if (!raw) {
          fail(`${pathLabel}: ${callee}() missing first argument`);
        }
        const arg0 = unwrapParen(raw);

        if (ts.isBinaryExpression(arg0) && arg0.operatorToken.kind === ts.SyntaxKind.PlusToken) {
          fail(
            `${pathLabel}: ${callee} first argument is string concat (+); expected a single SQL literal.\n` +
              sf.text.slice(arg0.pos, arg0.end),
          );
        }

        if (ts.isTemplateExpression(arg0)) {
          fail(
            `${pathLabel}: ${callee} uses template literal for SQL; expected a plain string literal.`,
          );
        }

        if (ts.isStringLiteral(arg0) || ts.isNoSubstitutionTemplateLiteral(arg0)) {
          const t = arg0.text;
          if (t.includes("SELECT") && t.includes("?")) {
            foundParameterizedSelect = true;
          }
        }
      }

      ts.forEachChild(n, visit);
    }

    visit(sf);

    if (!foundParameterizedSelect) {
      fail(
        `${pathLabel}: expected a queryAll/queryOne/execSql call whose SQL string contains SELECT and a ? placeholder.`,
      );
    }
  }

  const REPORT = `${root}/reports/rewrite/tiny-n1.json`;
  const SEARCH = `${root}/generated/tiny-n1/src/handlers/search.ts`;
  const LOOKUP = `${root}/generated/tiny-n1/src/handlers/lookup.ts`;

  const r = readJsonFile(REPORT);

  const sanitize = r.applied.filter((a) => a.pass === "sanitize-output");
  const paramz = r.applied.filter((a) => a.pass === "parameterize-sql");
  if (sanitize.length === 0) {
    fail("expected >=1 sanitize-output application, got none");
  }
  if (paramz.length === 0) {
    fail("expected >=1 parameterize-sql application, got none");
  }

  const searchSf = parseSource(SEARCH);
  if (!hasEscapeHtmlCall(searchSf)) {
    fail(`emitted search.ts has no escapeHtml() call:\n${searchSf.text}`);
  }

  const lookupSf = parseSource(LOOKUP);
  assertLookupSql(lookupSf, "emitted lookup.ts");

  if (!r.postVerify) {
    fail("rewrite report is missing postVerify section");
  }
  if (r.postVerify.ok !== true) {
    fail("post-verify gate FAILED: " + JSON.stringify(r.postVerify.failures, null, 2));
  }

  console.log("tiny-n1 rewrite OK:", JSON.stringify(r.summary));
  console.log("post-verify OK: recognizers=" + r.postVerify.recognizersRun.join(","));

  if (!r.behaviorVerify) {
    fail("rewrite report is missing behaviorVerify section");
  }
  if (r.behaviorVerify.ok !== true) {
    fail("behavior-verify gate FAILED: " + JSON.stringify(r.behaviorVerify.divergences, null, 2));
  }
  if (r.behaviorVerify.probesRun < 1) {
    fail("behavior-verify ran zero probes — probe synthesis is broken");
  }

  console.log(
    "behavior-verify OK: probes=" +
      r.behaviorVerify.probesRun +
      " routes=" +
      r.behaviorVerify.routesCovered +
      " abstained=" +
      r.behaviorVerify.abstained,
  );
}

const [, , cmd, arg0] = process.argv;

switch (cmd) {
  case "status-migration":
    assertStatusMigration();
    break;
  case "tiny-n1-insight":
    assertTinyN1Insight(arg0 ?? "reports/insight/tiny-n1.json");
    break;
  case "rewrite-pre-xss":
    assertRewritePreXss(arg0 ?? "reports/rewrite/before.json");
    break;
  case "tiny-n1-rewrite":
    assertTinyN1Rewrite(arg0 ?? ".");
    break;
  default:
    console.error(
      "Usage: node scripts/ci-gates.mjs " +
        "<status-migration|tiny-n1-insight|rewrite-pre-xss|tiny-n1-rewrite> [path]",
    );
    process.exit(1);
}
