/**
 * Structured CI assertions (JSON shape + TypeScript AST). Prefer this over
 * regex on emitted source or long inline `node -e` blocks in workflows.
 *
 * Usage:
 *   node scripts/ci-gates.mjs status-migration   # reads status --json from stdin
 *   node scripts/ci-gates.mjs tiny-n1-insight [reports/insight/tiny-n1.json]
 *   node scripts/ci-gates.mjs rewrite-pre-xss [reports/rewrite/before.json]
 *   node scripts/ci-gates.mjs tiny-n1-rewrite [repo-root]
 *   node scripts/ci-gates.mjs confidence-5nines [reports/confidence/flagship-laravel-full.json]
 *     (seed-matrix parent JSON must include matrixCrossBackendParityOk: true)
 *   node scripts/ci-gates.mjs confidence-trend [reports/confidence/history/flagship-laravel-full.history.json]
 *   node scripts/ci-gates.mjs confidence-trend-ready [reports/confidence/history/flagship-laravel-full.history.json]
 *   node scripts/ci-gates.mjs verify-dual-summary [reports/ci/verify-e2e-summary.json]
 *   node scripts/ci-gates.mjs verify-merged-summary [reports/ci/verify-e2e-merged-summary.json]
 *   node scripts/ci-gates.mjs corpus-merge-summary [path/to/corpus-merge-summary.json]
 *   node scripts/ci-gates.mjs hub-completion [reports/ci/hub-completion.json]
 * File-backed JSON gates resolve paths, print missing/invalid JSON hints via readJsonGateArtifact
 * (also tiny-n1-rewrite report JSON, migration-sidecar-floors sidecar JSON). status-migration validates stdin JSON.
 *   node scripts/ci-gates.mjs migration-sidecar-floors [reports/migration]
 *   node scripts/ci-gates.mjs emit-layout-floors [reports/migration/flagship-laravel-min-emit-stats.json]
 *   node scripts/ci-gates.mjs session-bridge-release
 *
 * Env: VERIFY_THRESHOLD (default 0.95) for status-migration.
 * Env: CHRYSALIS_IDIOMATICITY_MIN (0..1) and/or CHRYSALIS_RESIDUAL_LEGACY_MAX (0..100) for
 * migration-sidecar-floors; if neither is set, the gate skips. When set, the corresponding
 * JSON file under reports/migration must exist and satisfy the floor/ceiling.
 * Env: optional ceilings on emit-stats layout (D251); if none are set, emit-layout-floors skips.
 *   CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_FILES, CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_LINES,
 *   CHRYSALIS_EMIT_LAYOUT_MAX_HONO_LARGEST_FILE_LINES,
 *   CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_TS_FILES, CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_TS_LINES,
 *   CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_LARGEST_FILE_LINES (non-negative integers; actual must be <= max).
 * Env: session-bridge-release:
 *   CHRYSALIS_SESSION_BRIDGE_MODE   memory|file|sqlite|redis (required in strict mode)
 *   CHRYSALIS_DEPLOY_TOPOLOGY       single-host|multi-host (default: multi-host)
 *   CHRYSALIS_SESSION_RELEASE_STRICT 1|0 (default: 1)
 *   CHRYSALIS_SESSION_REDIS_URL     required when mode=redis
 *   CHRYSALIS_SESSION_SQLITE_PATH   required when mode=sqlite
 *   CHRYSALIS_SESSION_DIR           required when mode=file
 *   CHRYSALIS_ALLOW_MEMORY_SESSION_RELEASE=1 to permit mode=memory
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

/** Strip UTF-8 BOM so JSON.parse works if a tool wrote the file with BOM. */
function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/**
 * Read a JSON artifact for CI gates: resolve path, optional existence check,
 * and SyntaxError-safe parse with a consistent operator-facing prefix.
 *
 * @param {string} gatePrefix e.g. "tiny-n1-insight"
 * @param {string} path
 * @param {{ missingLabel?: string, missingHint?: string[], assumeExists?: boolean }} [options]
 */
function readJsonGateArtifact(gatePrefix, path, options = {}) {
  const { missingLabel = "file missing", missingHint = [], assumeExists = false } = options;
  const abs = resolve(path);
  if (!assumeExists && !fs.existsSync(abs)) {
    fail([`${gatePrefix}: ${missingLabel}: ${abs}`, ...missingHint].join("\n"));
  }
  try {
    return JSON.parse(stripBom(fs.readFileSync(abs, "utf8")));
  } catch (e) {
    if (e instanceof SyntaxError) {
      fail(`${gatePrefix}: invalid JSON in ${abs}: ${e.message}`);
    }
    const msg = e instanceof Error ? e.message : String(e);
    fail(`${gatePrefix}: could not read ${abs}: ${msg}`);
  }
}

function readStdinUtf8() {
  return stripBom(fs.readFileSync(0, "utf8"));
}

function assertStatusMigration() {
  const threshold = Number(process.env.VERIFY_THRESHOLD ?? "0.95");
  let s;
  try {
    s = JSON.parse(readStdinUtf8());
  } catch (e) {
    if (e instanceof SyntaxError) {
      fail(`status-migration: invalid JSON on stdin: ${e.message}`);
    }
    throw e;
  }
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
  const r = readJsonGateArtifact("tiny-n1-insight", path, {
    missingHint: ["Run: pnpm run ci:insight"],
  });
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
      fail(`tiny-n1-insight: missing recognizer hits for ${JSON.stringify(k)}: ${JSON.stringify(by)}`);
    }
  }
  const strongSec = r.opportunities.filter(
    (o) =>
      o.severity === "strong" &&
      (o.recognizer === "raw-sql-concat" || o.recognizer === "unescaped-output"),
  );
  const secKinds = new Set(strongSec.map((o) => o.recognizer));
  if (!secKinds.has("raw-sql-concat") || !secKinds.has("unescaped-output")) {
    fail(
      `tiny-n1-insight: expected >=1 STRONG finding from each security recognizer; saw: ${JSON.stringify([...secKinds])}`,
    );
  }
  console.log("tiny-n1 insight OK:", JSON.stringify(r.summary));
}

function assertRewritePreXss(path) {
  const before = readJsonGateArtifact("rewrite-pre-xss", path, {
    missingHint: ["Produce reports/rewrite/before.json from the tiny-n1 rewrite CI step or pass the gate path explicitly."],
  });
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

  const r = readJsonGateArtifact("tiny-n1-rewrite", REPORT, {
    missingHint: ["Run the tiny-n1 rewrite CI job so reports/rewrite/tiny-n1.json exists."],
  });

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

function assertConfidence5Nines(path) {
  const minConfidence = Number(process.env.CONFIDENCE_5NINES ?? "0.99999");
  const r = readJsonGateArtifact("confidence-5nines", path, {
    missingHint: ["Produce reports/confidence/flagship-laravel-full.json from the flagship verify + status pipeline."],
  });
  if (Array.isArray(r.matrix) && r.matrix.length > 0 && r.matrixCrossBackendParityOk !== true) {
    fail(
      "confidence-5nines: seed matrix artifact must include matrixCrossBackendParityOk: true (rollup over variants)",
    );
  }
  const requiredRiskCells = new Set([
    "http-health-and-metadata",
    "redirect-contract",
    "session-auth-happy-path",
    "session-auth-negative-path",
    "session-idempotency",
    "session-transition-monotonicity",
    "request-shape-robustness",
    "header-contract-strictness",
    "redirect-location-invariants",
    "cookie-session-header-invariants",
    "sql-aggregates-and-cte",
    "seed-cardinality-variance",
    "determinism-under-replay",
    "dual-emitter-parity",
    "cross-backend-verify-parity",
    "overall-corpus-volume",
  ]);
  const variants = Array.isArray(r.matrix) && r.matrix.length > 0 ? r.matrix : [r];
  let checked = 0;
  for (const v of variants) {
    if (v.skipped === true) {
      continue;
    }
    if (!Array.isArray(v.backends) || v.backends.length === 0) {
      fail("confidence-5nines: missing backend summaries");
    }
    if (v.semanticChecks !== "passed") {
      fail("confidence-5nines: semantic checks not marked as passed");
    }
    if (v.metamorphicChecks !== "passed") {
      fail("confidence-5nines: metamorphic checks not marked as passed");
    }
    if (v.exitCode !== 0) {
      fail(`confidence-5nines: verify exitCode must be 0, got ${v.exitCode}`);
    }
    if (!Array.isArray(v.riskCells)) {
      fail("confidence-5nines: missing riskCells");
    }
    const seen = new Set();
    for (const cell of v.riskCells) {
      if (cell?.status !== "covered") {
        fail(`confidence-5nines: risk cell not covered (${cell?.cell ?? "unknown"})`);
      }
      if (
        !cell?.kpi ||
        typeof cell.kpi.value !== "number" ||
        typeof cell.kpi.min !== "number" ||
        typeof cell.kpi.unit !== "string"
      ) {
        fail(`confidence-5nines: missing/invalid KPI payload for risk cell ${cell?.cell ?? "unknown"}`);
      }
      if (cell.kpi.value + 1e-9 < cell.kpi.min) {
        fail(
          `confidence-5nines: KPI below minimum for ${cell.cell} (${cell.kpi.value} < ${cell.kpi.min} ${cell.kpi.unit})`,
        );
      }
      if (typeof cell?.cell === "string") {
        seen.add(cell.cell);
      }
    }
    for (const expectedCell of requiredRiskCells) {
      if (!seen.has(expectedCell)) {
        fail(`confidence-5nines: missing risk cell ${expectedCell}`);
      }
    }
    for (const b of v.backends) {
      if (b.driftDetected) {
        fail(`confidence-5nines: backend ${b.backend} has driftDetected=true`);
      }
      if (b.minCorrectness + 1e-9 < minConfidence) {
        fail(
          `confidence-5nines: backend ${b.backend} minCorrectness ${b.minCorrectness} < ${minConfidence}`,
        );
      }
    }
    checked++;
  }
  if (checked === 0) {
    console.log("confidence-5nines skipped: no runnable PHP/scaffolded variants in this environment");
    return;
  }
  console.log(
    `confidence-5nines OK: target=${minConfidence} variants_checked=${checked} variants_total=${variants.length}`,
  );
}

function confidenceTrendEntryFails(e, minConfidence) {
  if (e.exitCode !== 0) return `non-zero exitCode at ${e.timestamp}`;
  if (e.semanticChecks !== "passed") return `semantic check failed at ${e.timestamp}`;
  if (e.metamorphicChecks !== "passed") return `metamorphic check failed at ${e.timestamp}`;
  if (e.driftDetected === true) return `drift detected at ${e.timestamp}`;
  if (e.riskCovered !== true) return `risk coverage regressed at ${e.timestamp}`;
  if (e.crossBackendParityOk === false) return `cross-backend parity failed at ${e.timestamp}`;
  if (e.matrixCrossBackendParityOk === false) {
    return `matrix cross-backend parity failed at ${e.timestamp}`;
  }
  if (Number(e.minCorrectness ?? 0) + 1e-9 < minConfidence) {
    return `minCorrectness ${e.minCorrectness} < ${minConfidence} at ${e.timestamp}`;
  }
  return undefined;
}

/** Trailing consecutive passing entries (newest last), not “any failure in last N”. */
function trailingConfidenceTrendStreak(entries, minConfidence) {
  let streak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const reason = confidenceTrendEntryFails(entries[i], minConfidence);
    if (reason) break;
    streak++;
  }
  return streak;
}

function assertConfidenceTrend(path) {
  const required = Number.parseInt(process.env.CONFIDENCE_STREAK_REQUIRED ?? "30", 10);
  const minConfidence = Number(process.env.CONFIDENCE_5NINES ?? "0.99999");
  const allowWarmup = (process.env.CONFIDENCE_TREND_ALLOW_WARMUP ?? "1") === "1";
  const abs = resolve(path);
  if (!fs.existsSync(abs)) {
    if (allowWarmup) {
      console.log(`confidence-trend warmup: history file missing (${abs})`);
      return;
    }
    fail(`confidence-trend: history file missing (${abs})`);
  }
  const r = readJsonGateArtifact("confidence-trend", path, { assumeExists: true });
  if (!r || !Array.isArray(r.entries)) {
    fail("confidence-trend: invalid history payload");
  }
  const streak = trailingConfidenceTrendStreak(r.entries, minConfidence);
  if (streak < required) {
    if (allowWarmup) {
      console.log(`confidence-trend warmup: trailing streak ${streak}/${required}`);
      return;
    }
    const latest = r.entries[r.entries.length - 1];
    const latestFail =
      latest && confidenceTrendEntryFails(latest, minConfidence)
        ? confidenceTrendEntryFails(latest, minConfidence)
        : "insufficient trailing streak";
    fail(`confidence-trend: ${latestFail} (streak ${streak}/${required})`);
  }
  console.log(`confidence-trend OK: streak=${streak}/${required} minConfidence=${minConfidence}`);
}

function assertConfidenceTrendReady(path) {
  const required = Number.parseInt(process.env.CONFIDENCE_STREAK_REQUIRED ?? "30", 10);
  const minConfidence = Number(process.env.CONFIDENCE_5NINES ?? "0.99999");
  const r = readJsonGateArtifact("confidence-trend-ready", path, {
    missingLabel: "history file missing",
    missingHint: ["Append history entries from flagship verify runs (see scripts/status-flagship-laravel-full.mjs)."],
  });
  if (!r || !Array.isArray(r.entries)) {
    fail("confidence-trend-ready: invalid history payload");
  }
  const streak = trailingConfidenceTrendStreak(r.entries, minConfidence);
  if (streak < required) {
    fail(`confidence-trend-ready: trailing streak ${streak}/${required}`);
  }
  console.log(`confidence-trend-ready: strict mode ready (trailing streak ${streak}/${required})`);
}

function assertVerifyDualSummary(path) {
  const s = readJsonGateArtifact("verify-dual-summary", path, {
    missingLabel: "summary file missing",
    missingHint: [
      "Create it with a dual-summary verify script (e.g. pnpm run verify:e2e) or pass an existing path:",
      "  pnpm run ci:verify-dual-summary -- <path>",
    ],
  });
  if (s.kind !== "chrysalis.verify.summary.dual") {
    fail(`verify-dual-summary: expected kind chrysalis.verify.summary.dual, got ${JSON.stringify(s.kind)}`);
  }
  if (s.schemaVersion !== 1) {
    fail(`verify-dual-summary: expected schemaVersion 1, got ${JSON.stringify(s.schemaVersion)}`);
  }
  if (typeof s.toolVersion !== "string" || s.toolVersion.length === 0) {
    fail("verify-dual-summary: missing toolVersion");
  }
  if (typeof s.reportDir !== "string" || s.reportDir.length === 0) {
    fail("verify-dual-summary: missing reportDir");
  }
  if (typeof s.corpusRoot !== "string" || s.corpusRoot.length === 0) {
    fail("verify-dual-summary: missing corpusRoot");
  }
  if (typeof s.pass !== "boolean") {
    fail(`verify-dual-summary: pass must be boolean, got ${JSON.stringify(s.pass)}`);
  }
  if (!Array.isArray(s.backends) || s.backends.length < 1) {
    fail("verify-dual-summary: expected non-empty backends[]");
  }
  if (s.backends.length !== 2) {
    fail(`verify-dual-summary: expected exactly 2 backends (hono + fastify), got ${s.backends.length}`);
  }
  const ids = new Set(s.backends.map((b) => b?.backend));
  if (!ids.has("hono") || !ids.has("fastify")) {
    fail(`verify-dual-summary: expected hono and fastify backend ids, got ${[...ids].join(", ")}`);
  }
  for (const b of s.backends) {
    if (typeof b?.backend !== "string" || b.backend.length === 0) {
      fail("verify-dual-summary: each backend row must include backend name");
    }
    const hasCorrectness =
      typeof b.correctness === "number" ||
      typeof b.minCorrectness === "number" ||
      typeof b.aggregate?.correctness === "number";
    if (!hasCorrectness) {
      fail(`verify-dual-summary: backend ${b.backend} missing correctness field`);
    }
    if (typeof b.summaryPath !== "string" || b.summaryPath.length === 0) {
      fail(`verify-dual-summary: backend ${b.backend} missing summaryPath`);
    }
    if (!b.aggregate || typeof b.aggregate.correctness !== "number") {
      fail(`verify-dual-summary: backend ${b.backend} missing aggregate.correctness`);
    }
    if (!Array.isArray(b.endpoints)) {
      fail(`verify-dual-summary: backend ${b.backend} missing endpoints[]`);
    }
    if (typeof b.failedFrameCount !== "number" || !Number.isFinite(b.failedFrameCount)) {
      fail(`verify-dual-summary: backend ${b.backend} missing failedFrameCount`);
    }
  }
  const expectedProfile = process.env.CHRYSALIS_VERIFY_DUAL_PROFILE;
  if (expectedProfile && s.profile !== expectedProfile) {
    fail(
      `verify-dual-summary: expected profile ${JSON.stringify(expectedProfile)}, got ${JSON.stringify(s.profile)}`,
    );
  }
  console.log(
    `verify-dual-summary OK: profile=${s.profile ?? "(none)"} pass=${s.pass} backends=${s.backends.length}`,
  );
}

function assertVerifyMergedSummary(path) {
  const s = readJsonGateArtifact("verify-merged-summary", path, {
    missingLabel: "summary file missing",
    missingHint: [
      "Create it with verify-tiny-blog (partition smoke) or pass a fixture path:",
      "  pnpm run ci:verify-merged-summary -- <path>",
    ],
  });
  if (s.kind !== "chrysalis.verify.summary.merged") {
    fail(`verify-merged-summary: expected kind chrysalis.verify.summary.merged, got ${JSON.stringify(s.kind)}`);
  }
  if (s.schemaVersion !== 1) {
    fail(`verify-merged-summary: expected schemaVersion 1, got ${JSON.stringify(s.schemaVersion)}`);
  }
  if (typeof s.toolVersion !== "string" || s.toolVersion.length === 0) {
    fail("verify-merged-summary: missing toolVersion");
  }
  if (typeof s.shardCount !== "number" || !Number.isFinite(s.shardCount) || s.shardCount < 1) {
    fail(`verify-merged-summary: shardCount must be a finite number >= 1, got ${JSON.stringify(s.shardCount)}`);
  }
  if (!Array.isArray(s.inputs) || s.inputs.length < 1) {
    fail("verify-merged-summary: expected non-empty inputs[]");
  }
  for (let i = 0; i < s.inputs.length; i++) {
    const row = s.inputs[i];
    if (typeof row?.path !== "string" || row.path.length === 0) {
      fail(`verify-merged-summary: inputs[${i}] missing path`);
    }
    if (typeof row.shardIndex !== "number" || !Number.isFinite(row.shardIndex)) {
      fail(`verify-merged-summary: inputs[${i}] missing shardIndex`);
    }
    if (!row.aggregate || typeof row.aggregate.framesTotal !== "number") {
      fail(`verify-merged-summary: inputs[${i}] missing aggregate.framesTotal`);
    }
    if (typeof row.aggregate.framesPassed !== "number") {
      fail(`verify-merged-summary: inputs[${i}] missing aggregate.framesPassed`);
    }
    if (typeof row.aggregate.correctness !== "number") {
      fail(`verify-merged-summary: inputs[${i}] missing aggregate.correctness`);
    }
  }
  if (!s.merged || typeof s.merged !== "object") {
    fail("verify-merged-summary: missing merged");
  }
  const m = s.merged;
  if (!m.aggregate || typeof m.aggregate.framesTotal !== "number") {
    fail("verify-merged-summary: merged.aggregate.framesTotal missing");
  }
  if (typeof m.aggregate.framesPassed !== "number") {
    fail("verify-merged-summary: merged.aggregate.framesPassed missing");
  }
  if (typeof m.aggregate.correctness !== "number" || !Number.isFinite(m.aggregate.correctness)) {
    fail("verify-merged-summary: merged.aggregate.correctness missing or non-finite");
  }
  if (!Array.isArray(m.endpoints)) {
    fail("verify-merged-summary: merged.endpoints must be an array");
  }
  const minCorr = parseOptionalEnvNumber(process.env.CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS, "CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS");
  if (minCorr != null && m.aggregate.correctness + 1e-9 < minCorr) {
    fail(
      `verify-merged-summary: merged aggregate correctness ${m.aggregate.correctness} < CHRYSALIS_VERIFY_MERGED_MIN_CORRECTNESS ${minCorr}`,
    );
  }
  console.log(
    `verify-merged-summary OK: shardCount=${s.shardCount} inputs=${s.inputs.length} frames=${m.aggregate.framesPassed}/${m.aggregate.framesTotal}`,
  );
}

function assertNonNegativeInt(label, name, v) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || Math.floor(v) !== v) {
    fail(`${label}: expected non-negative integer ${name}, got ${JSON.stringify(v)}`);
  }
}

function assertCorpusMergeSummary(path) {
  const label = "corpus-merge-summary";
  const s = readJsonGateArtifact(label, path, {
    missingLabel: "summary file missing",
    missingHint: [
      "Create it with chrysalis corpus-merge … --json-out <file> or pass a fixture path:",
      "  pnpm run ci:corpus-merge-summary -- <path>",
    ],
  });
  if (s.kind !== "chrysalis.corpus-merge.summary") {
    fail(`${label}: expected kind chrysalis.corpus-merge.summary, got ${JSON.stringify(s.kind)}`);
  }
  if (s.schemaVersion !== 1) {
    fail(`${label}: expected schemaVersion 1, got ${JSON.stringify(s.schemaVersion)}`);
  }
  if (typeof s.toolVersion !== "string" || s.toolVersion.length === 0) {
    fail(`${label}: missing toolVersion`);
  }
  if (typeof s.generatedAt !== "string" || s.generatedAt.length === 0) {
    fail(`${label}: missing generatedAt`);
  }
  const o = s.options;
  if (!o || typeof o !== "object") {
    fail(`${label}: missing options object`);
  }
  if (typeof o.outDir !== "string" || o.outDir.length === 0) {
    fail(`${label}: options.outDir must be a non-empty string`);
  }
  if (o.onDuplicate !== "error" && o.onDuplicate !== "skip") {
    fail(`${label}: options.onDuplicate must be error or skip, got ${JSON.stringify(o.onDuplicate)}`);
  }
  if (o.dedupeTraceId !== "off" && o.dedupeTraceId !== "skip") {
    fail(`${label}: options.dedupeTraceId must be off or skip, got ${JSON.stringify(o.dedupeTraceId)}`);
  }
  if (typeof o.dryRun !== "boolean") {
    fail(`${label}: options.dryRun must be a boolean, got ${JSON.stringify(o.dryRun)}`);
  }
  if (o.sampleModulo !== undefined) {
    const m = o.sampleModulo;
    if (typeof m !== "number" || !Number.isFinite(m) || m < 1 || Math.floor(m) !== m) {
      fail(`${label}: options.sampleModulo must be a finite integer >= 1, got ${JSON.stringify(m)}`);
    }
  }
  if (o.sampleRemainder !== undefined) {
    const r = o.sampleRemainder;
    if (typeof r !== "number" || !Number.isFinite(r) || r < 0 || Math.floor(r) !== r) {
      fail(`${label}: options.sampleRemainder must be a non-negative finite integer, got ${JSON.stringify(r)}`);
    }
    const m = o.sampleModulo;
    if (typeof m !== "number" || !Number.isFinite(m) || m < 1) {
      fail(`${label}: options.sampleRemainder requires a valid options.sampleModulo`);
    }
    if (r >= m) {
      fail(`${label}: options.sampleRemainder must satisfy 0 <= r < sampleModulo (got ${r}, ${m})`);
    }
  }
  if (!Array.isArray(s.sources) || s.sources.length < 1) {
    fail(`${label}: expected non-empty sources[]`);
  }
  for (let i = 0; i < s.sources.length; i++) {
    if (typeof s.sources[i] !== "string" || s.sources[i].length === 0) {
      fail(`${label}: sources[${i}] must be a non-empty string`);
    }
  }
  const c = s.counts;
  if (!c || typeof c !== "object") {
    fail(`${label}: missing counts object`);
  }
  assertNonNegativeInt(label, "counts.copiedFiles", c.copiedFiles);
  assertNonNegativeInt(label, "counts.skippedDuplicates", c.skippedDuplicates);
  assertNonNegativeInt(label, "counts.skippedTraceIdDuplicates", c.skippedTraceIdDuplicates);
  assertNonNegativeInt(label, "counts.skippedBySampling", c.skippedBySampling);
  console.log(
    `${label} OK: sources=${s.sources.length} copied=${c.copiedFiles} skippedDup=${c.skippedDuplicates} skippedTraceId=${c.skippedTraceIdDuplicates} skippedSample=${c.skippedBySampling}`,
  );
}

function assertHubCompletion(path) {
  const label = "hub-completion";
  const s = readJsonGateArtifact(label, path, {
    missingLabel: "report file missing",
    missingHint: ["Run: pnpm run ci:hub-completion"],
  });
  if (s.kind !== "chrysalis.hub.completion") {
    fail(`${label}: expected kind chrysalis.hub.completion, got ${JSON.stringify(s.kind)}`);
  }
  if (
    s.schemaVersion !== 0 &&
    s.schemaVersion !== 1 &&
    s.schemaVersion !== 2 &&
    s.schemaVersion !== 3 &&
    s.schemaVersion !== 4 &&
    s.schemaVersion !== 5 &&
    s.schemaVersion !== 6 &&
    s.schemaVersion !== 7 &&
    s.schemaVersion !== 8 &&
    s.schemaVersion !== 9 &&
    s.schemaVersion !== 10 &&
    s.schemaVersion !== 11 &&
    s.schemaVersion !== 12 &&
    s.schemaVersion !== 13 &&
    s.schemaVersion !== 14 &&
    s.schemaVersion !== 15 &&
    s.schemaVersion !== 16 &&
    s.schemaVersion !== 17 &&
    s.schemaVersion !== 18 &&
    s.schemaVersion !== 19 &&
    s.schemaVersion !== 20 &&
    s.schemaVersion !== 22
  ) {
    fail(`${label}: expected schemaVersion 0–22, got ${JSON.stringify(s.schemaVersion)}`);
  }
  if (s.ok !== true) {
    fail(`${label}: ok must be true (matrix failed=${s.matrixSmoke?.failed}, gold=${s.goldVerify?.ok})`);
  }
  if ((s.matrixSmoke?.failed ?? 1) !== 0) {
    fail(`${label}: matrixSmoke.failed must be 0, got ${JSON.stringify(s.matrixSmoke?.failed)}`);
  }
  if (s.goldVerify?.ok !== true) {
    fail(`${label}: goldVerify.ok must be true`);
  }
  if (s.schemaVersion >= 6) {
    const gExp = s.goldVerify?.expectedSuiteCount;
    const gCnt = s.goldVerify?.suiteCount;
    if (typeof gExp === "number" && typeof gCnt === "number" && gExp !== gCnt) {
      fail(`${label}: goldVerify.suiteCount ${gCnt} != expectedSuiteCount ${gExp}`);
    }
    const tExp = s.traceReplay?.expectedSuiteCount;
    const tCnt = s.traceReplay?.suiteCount;
    if (typeof tExp === "number" && typeof tCnt === "number" && tExp !== tCnt) {
      fail(`${label}: traceReplay.suiteCount ${tCnt} != expectedSuiteCount ${tExp}`);
    }
  }
  if (s.schemaVersion >= 1 && s.traceReplay?.ok !== true) {
    fail(`${label}: traceReplay.ok must be true (correctness=${s.traceReplay?.correctness})`);
  }
  if (s.schemaVersion >= 2 && s.nativeEmitSmoke?.ok !== true) {
    fail(`${label}: nativeEmitSmoke.ok must be true (failed=${s.nativeEmitSmoke?.failed})`);
  }
  if (s.schemaVersion >= 3 && s.crossLanguageSynthesis?.ok !== true) {
    fail(
      `${label}: crossLanguageSynthesis.ok must be true (pairCount=${s.crossLanguageSynthesis?.pairCount})`,
    );
  }
  if (s.schemaVersion >= 7 && s.goldCoverage?.ok !== true) {
    fail(`${label}: goldCoverage.ok must be true (gaps=${s.goldCoverage?.coverageGaps})`);
  }
  if (s.schemaVersion >= 8) {
    if (typeof s.goldCoverage?.oracleTier !== "number") {
      fail(`${label}: goldCoverage.oracleTier required for schema v8`);
    }
    if (typeof s.goldCoverage?.structuralTier !== "number") {
      fail(`${label}: goldCoverage.structuralTier required for schema v8`);
    }
  }
  if (s.schemaVersion >= 9) {
    const native = s.nativeStructuralGold;
    if (!native?.targets?.length || !native?.suiteIds?.length) {
      fail(`${label}: nativeStructuralGold.targets and suiteIds required for schema v9`);
    }
  }
  if (s.schemaVersion >= 10) {
    if (s.middlewareTraceReplay?.jsonPostProbe !== true) {
      fail(`${label}: middlewareTraceReplay.jsonPostProbe must be true for schema v10`);
    }
  }
  if (s.schemaVersion >= 11) {
    const mw = s.middlewareTraceReplay?.suites ?? [];
    if (!mw.includes("python-middleware-hono") || !mw.includes("python-middleware-fastify")) {
      fail(`${label}: middlewareTraceReplay must list python middleware suites for schema v11`);
    }
    const xf = s.crossFrameworkStructuralGold?.suiteIds ?? [];
    if (!xf.includes("ruby-literal-hono") || !xf.includes("ruby-literal-fastify")) {
      fail(`${label}: crossFrameworkStructuralGold must list ruby hono/fastify for schema v11`);
    }
  }
  if (s.schemaVersion >= 12) {
    const xf = s.crossFrameworkStructuralGold?.suiteIds ?? [];
    if (!xf.includes("java-literal-hono") || !xf.includes("java-literal-fastify")) {
      fail(`${label}: crossFrameworkStructuralGold must list java hono/fastify for schema v12`);
    }
  }
  if (s.schemaVersion >= 13) {
    const xf = s.crossFrameworkStructuralGold?.suiteIds ?? [];
    for (const id of [
      "go-literal-hono",
      "go-literal-fastify",
      "csharp-literal-hono",
      "csharp-literal-fastify",
    ]) {
      if (!xf.includes(id)) {
        fail(`${label}: crossFrameworkStructuralGold must list ${id} for schema v13`);
      }
    }
    const cwl = s.middlewareCwlGold?.suiteIds ?? [];
    if (!cwl.includes("python-middleware-cwl")) {
      fail(`${label}: middlewareCwlGold must list python-middleware-cwl for schema v13`);
    }
  }
  if (s.schemaVersion >= 14) {
    const cwl = s.crossFrameworkCwlGold?.suiteIds ?? [];
    for (const id of ["java-literal-cwl", "go-literal-cwl", "csharp-literal-cwl", "ruby-literal-cwl"]) {
      if (!cwl.includes(id)) {
        fail(`${label}: crossFrameworkCwlGold must list ${id} for schema v14`);
      }
    }
  }
  if (s.schemaVersion >= 15) {
    const kss = s.kssFrameworkGold?.suiteIds ?? [];
    for (const id of [
      "kotlin-literal-hono",
      "kotlin-literal-fastify",
      "kotlin-literal-cwl",
      "scala-literal-hono",
      "scala-literal-fastify",
      "scala-literal-cwl",
      "swift-literal-hono",
      "swift-literal-fastify",
      "swift-literal-cwl",
    ]) {
      if (!kss.includes(id)) {
        fail(`${label}: kssFrameworkGold must list ${id} for schema v15`);
      }
    }
  }
  if (s.schemaVersion >= 16) {
    const xf = s.crossFrameworkStructuralGold?.suiteIds ?? [];
    if (!xf.includes("rust-literal-hono") || !xf.includes("rust-literal-fastify")) {
      fail(`${label}: crossFrameworkStructuralGold must list rust hono/fastify for schema v16`);
    }
    const cwl = s.crossFrameworkCwlGold?.suiteIds ?? [];
    if (!cwl.includes("rust-literal-cwl")) {
      fail(`${label}: crossFrameworkCwlGold must list rust-literal-cwl for schema v16`);
    }
  }
  if (s.schemaVersion >= 17) {
    const next = s.typescriptFamilyNextjsGold?.suiteIds ?? [];
    for (const id of ["js-literal-nextjs", "ts-literal-nextjs"]) {
      if (!next.includes(id)) {
        fail(`${label}: typescriptFamilyNextjsGold must list ${id} for schema v17`);
      }
    }
  }
  if (s.schemaVersion >= 18) {
    const next = s.typescriptFamilyNextjsGold?.suiteIds ?? [];
    for (const id of ["js-structured-nextjs", "ts-structured-nextjs"]) {
      if (!next.includes(id)) {
        fail(`${label}: typescriptFamilyNextjsGold must list ${id} for schema v18`);
      }
    }
    const njs = s.nextjsTraceReplay?.suites ?? [];
    if (!njs.includes("js-literal-nextjs") || !njs.includes("ts-structured-nextjs")) {
      fail(`${label}: nextjsTraceReplay must list literal and structured nextjs suites for schema v18`);
    }
    const wptp = s.wptpContractGold?.suiteIds ?? [];
    if (!wptp.includes("contract-first-hono") || !wptp.includes("contract-first-nextjs")) {
      fail(`${label}: wptpContractGold must list contract-first hono and nextjs for schema v18`);
    }
    if (s.multiLaneSmoke?.ok !== true) {
      fail(`${label}: multiLaneSmoke.ok must be true for schema v18`);
    }
  }
  if (s.schemaVersion >= 19) {
    const mw = s.middlewareNextjsGold?.suiteIds ?? [];
    if (!mw.includes("js-middleware-nextjs") || !mw.includes("python-middleware-nextjs")) {
      fail(`${label}: middlewareNextjsGold must list js and python middleware nextjs for schema v19`);
    }
    if (!(s.cwlNextjsGold?.suiteIds ?? []).includes("cwl-gold-nextjs")) {
      fail(`${label}: cwlNextjsGold must list cwl-gold-nextjs for schema v19`);
    }
    const py = s.pythonNextjsGold?.suiteIds ?? [];
    if (!py.includes("python-literal-nextjs")) {
      fail(`${label}: pythonNextjsGold must list python-literal-nextjs for schema v19`);
    }
    const wptpTr = s.wptpContractGold?.traceReplaySuiteIds ?? [];
    if (!wptpTr.includes("contract-first-nextjs")) {
      fail(`${label}: wptpContractGold.traceReplaySuiteIds must list contract-first-nextjs for schema v19`);
    }
  }
  if (s.schemaVersion >= 20) {
    const xf = s.crossFrameworkNextjsGold?.suiteIds ?? [];
    for (const id of [
      "ruby-literal-nextjs",
      "java-literal-nextjs",
      "go-literal-nextjs",
      "csharp-literal-nextjs",
      "kotlin-literal-nextjs",
      "scala-literal-nextjs",
      "swift-literal-nextjs",
      "rust-literal-nextjs",
    ]) {
      if (!xf.includes(id)) {
        fail(`${label}: crossFrameworkNextjsGold must list ${id} for schema v20`);
      }
    }
    if (s.multiLaneSmoke?.parserBridgeVendor !== true) {
      fail(`${label}: multiLaneSmoke.parserBridgeVendor must be true for schema v20`);
    }
  }
  if (s.schemaVersion >= 21) {
    const asset = s.assetVueNextjsGold?.suiteIds ?? [];
    for (const id of ["sql-literal-nextjs", "html-literal-nextjs", "json-literal-nextjs", "vue-literal-nextjs"]) {
      if (!asset.includes(id)) {
        fail(`${label}: assetVueNextjsGold must list ${id} for schema v21`);
      }
    }
    if (s.multiLaneSmoke?.migrationDebtOk !== true) {
      fail(`${label}: multiLaneSmoke.migrationDebtOk must be true for schema v21`);
    }
  }
  if (s.schemaVersion >= 22) {
    const ext = s.assetExtendedNextjsGold?.suiteIds ?? [];
    for (const id of [
      "css-literal-nextjs",
      "scss-literal-nextjs",
      "markdown-literal-nextjs",
      "yaml-literal-nextjs",
      "c-literal-nextjs",
      "cpp-literal-nextjs",
    ]) {
      if (!ext.includes(id)) {
        fail(`${label}: assetExtendedNextjsGold must list ${id} for schema v22`);
      }
    }
    if (s.phpOracleSmoke?.ok !== true && s.phpOracleSmoke?.skipped == null) {
      fail(`${label}: phpOracleSmoke.ok must be true (or skipped) for schema v22`);
    }
  }
  const g = s.routeGrades;
  if (!g || typeof g.gold !== "number" || typeof g.silver !== "number" || typeof g.open !== "number") {
    fail(`${label}: missing routeGrades counts`);
  }
  console.log(`${label} OK: gold=${g.gold} silver=${g.silver} open=${g.open} matrixPassed=${s.matrixSmoke?.passed}`);
}

function parseOptionalEnvNumber(raw, label) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) {
    fail(`${label}: expected a finite number, got ${JSON.stringify(raw)}`);
  }
  return n;
}

/** @param {string | undefined} raw @param {string} label */
function parseOptionalEnvNonNegativeInt(raw, label) {
  const n = parseOptionalEnvNumber(raw, label);
  if (n == null) return null;
  if (!Number.isInteger(n) || n < 0) {
    fail(`${label}: expected a non-negative integer, got ${JSON.stringify(raw)}`);
  }
  return n;
}

const EMIT_LAYOUT_FLOOR_ENV_KEYS = [
  "CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_FILES",
  "CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_LINES",
  "CHRYSALIS_EMIT_LAYOUT_MAX_HONO_LARGEST_FILE_LINES",
  "CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_TS_FILES",
  "CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_TS_LINES",
  "CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_LARGEST_FILE_LINES",
];

function anyEmitLayoutFloorEnvSet() {
  for (const k of EMIT_LAYOUT_FLOOR_ENV_KEYS) {
    const v = process.env[k];
    if (v != null && String(v).trim() !== "") return true;
  }
  return false;
}

/**
 * @param {string} gatePrefix
 * @param {string} emitterKey
 * @param {{ holes?: unknown; layout?: unknown } | undefined} emitter
 * @param {{ maxTsFiles: number | null; maxTsLines: number | null; maxLargestLines: number | null }} caps
 */
function assertEmitLayoutEmitterWithinCaps(gatePrefix, emitterKey, emitter, caps) {
  const { maxTsFiles, maxTsLines, maxLargestLines } = caps;
  if (maxTsFiles == null && maxTsLines == null && maxLargestLines == null) return;
  const layout = emitter && typeof emitter === "object" ? emitter.layout : null;
  if (!layout || typeof layout !== "object") {
    fail(
      `${gatePrefix}: missing ${emitterKey}.layout (set when CHRYSALIS_EMIT_LAYOUT_MAX_${emitterKey.toUpperCase()}_* is set)`,
    );
  }
  const files = layout.tsFileCount;
  const lines = layout.tsLineCount;
  const largest = layout.largestFileLineCount;
  if (typeof files !== "number" || !Number.isInteger(files) || files < 0) {
    fail(`${gatePrefix}: ${emitterKey}.layout.tsFileCount must be a non-negative integer`);
  }
  if (typeof lines !== "number" || !Number.isInteger(lines) || lines < 0) {
    fail(`${gatePrefix}: ${emitterKey}.layout.tsLineCount must be a non-negative integer`);
  }
  if (typeof largest !== "number" || !Number.isInteger(largest) || largest < 0) {
    fail(`${gatePrefix}: ${emitterKey}.layout.largestFileLineCount must be a non-negative integer`);
  }
  if (maxTsFiles != null && files > maxTsFiles) {
    fail(
      `${gatePrefix}: ${emitterKey}.layout.tsFileCount ${files} > CHRYSALIS_EMIT_LAYOUT_MAX_${emitterKey.toUpperCase()}_TS_FILES ${maxTsFiles}`,
    );
  }
  if (maxTsLines != null && lines > maxTsLines) {
    fail(
      `${gatePrefix}: ${emitterKey}.layout.tsLineCount ${lines} > CHRYSALIS_EMIT_LAYOUT_MAX_${emitterKey.toUpperCase()}_TS_LINES ${maxTsLines}`,
    );
  }
  if (maxLargestLines != null && largest > maxLargestLines) {
    fail(
      `${gatePrefix}: ${emitterKey}.layout.largestFileLineCount ${largest} > CHRYSALIS_EMIT_LAYOUT_MAX_${emitterKey.toUpperCase()}_LARGEST_FILE_LINES ${maxLargestLines}`,
    );
  }
}

function assertEmitLayoutFloors(pathArg) {
  if (!anyEmitLayoutFloorEnvSet()) {
    console.log(
      "emit-layout-floors skipped: set one or more CHRYSALIS_EMIT_LAYOUT_MAX_HONO_* / CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_*",
    );
    return;
  }
  const statsPath = resolve(pathArg ?? "reports/migration/flagship-laravel-min-emit-stats.json");
  const stats = readJsonGateArtifact("emit-layout-floors", statsPath, {
    missingLabel: "emit-stats file missing",
    missingHint: [
      "Run verify flagship or pass path to reports/migration/flagship-laravel-*-emit-stats.json",
    ],
  });
  const maxHonoFiles = parseOptionalEnvNonNegativeInt(
    process.env.CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_FILES,
    "CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_FILES",
  );
  const maxHonoLines = parseOptionalEnvNonNegativeInt(
    process.env.CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_LINES,
    "CHRYSALIS_EMIT_LAYOUT_MAX_HONO_TS_LINES",
  );
  const maxHonoLargest = parseOptionalEnvNonNegativeInt(
    process.env.CHRYSALIS_EMIT_LAYOUT_MAX_HONO_LARGEST_FILE_LINES,
    "CHRYSALIS_EMIT_LAYOUT_MAX_HONO_LARGEST_FILE_LINES",
  );
  const maxFastFiles = parseOptionalEnvNonNegativeInt(
    process.env.CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_TS_FILES,
    "CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_TS_FILES",
  );
  const maxFastLines = parseOptionalEnvNonNegativeInt(
    process.env.CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_TS_LINES,
    "CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_TS_LINES",
  );
  const maxFastLargest = parseOptionalEnvNonNegativeInt(
    process.env.CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_LARGEST_FILE_LINES,
    "CHRYSALIS_EMIT_LAYOUT_MAX_FASTIFY_LARGEST_FILE_LINES",
  );
  assertEmitLayoutEmitterWithinCaps("emit-layout-floors", "hono", stats.hono, {
    maxTsFiles: maxHonoFiles,
    maxTsLines: maxHonoLines,
    maxLargestLines: maxHonoLargest,
  });
  assertEmitLayoutEmitterWithinCaps("emit-layout-floors", "fastify", stats.fastify, {
    maxTsFiles: maxFastFiles,
    maxTsLines: maxFastLines,
    maxLargestLines: maxFastLargest,
  });
  console.log(`emit-layout-floors OK: path=${statsPath}`);
}

function assertMigrationSidecarFloors(dirArg) {
  const idioMin = parseOptionalEnvNumber(process.env.CHRYSALIS_IDIOMATICITY_MIN, "CHRYSALIS_IDIOMATICITY_MIN");
  const resMax = parseOptionalEnvNumber(process.env.CHRYSALIS_RESIDUAL_LEGACY_MAX, "CHRYSALIS_RESIDUAL_LEGACY_MAX");
  if (idioMin == null && resMax == null) {
    console.log(
      "migration-sidecar-floors skipped: set CHRYSALIS_IDIOMATICITY_MIN and/or CHRYSALIS_RESIDUAL_LEGACY_MAX",
    );
    return;
  }
  const migrationDir = resolve(dirArg ?? "reports/migration");
  if (idioMin != null) {
    if (idioMin < 0 || idioMin > 1) {
      fail("migration-sidecar-floors: CHRYSALIS_IDIOMATICITY_MIN must be between 0 and 1 inclusive");
    }
    const p = resolve(migrationDir, "idiomaticity.json");
    if (!fs.existsSync(p)) {
      fail(`migration-sidecar-floors: ${p} missing (CHRYSALIS_IDIOMATICITY_MIN is set)`);
    }
    const j = readJsonGateArtifact("migration-sidecar-floors", p, { assumeExists: true });
    if (typeof j.pct !== "number" || j.pct < 0 || j.pct > 1) {
      fail("migration-sidecar-floors: idiomaticity.json missing numeric pct in [0,1]");
    }
    if (j.pct + 1e-9 < idioMin) {
      fail(`migration-sidecar-floors: idiomaticity pct ${j.pct} < CHRYSALIS_IDIOMATICITY_MIN ${idioMin}`);
    }
  }
  if (resMax != null) {
    if (resMax < 0 || resMax > 100) {
      fail("migration-sidecar-floors: CHRYSALIS_RESIDUAL_LEGACY_MAX must be between 0 and 100 inclusive");
    }
    const p = resolve(migrationDir, "residual-legacy.json");
    if (!fs.existsSync(p)) {
      fail(`migration-sidecar-floors: ${p} missing (CHRYSALIS_RESIDUAL_LEGACY_MAX is set)`);
    }
    const j = readJsonGateArtifact("migration-sidecar-floors", p, { assumeExists: true });
    if (typeof j.legacyRequestPct !== "number" || j.legacyRequestPct < 0 || j.legacyRequestPct > 100) {
      fail("migration-sidecar-floors: residual-legacy.json missing numeric legacyRequestPct in [0,100]");
    }
    if (j.legacyRequestPct > resMax + 1e-9) {
      fail(
        `migration-sidecar-floors: legacyRequestPct ${j.legacyRequestPct} > CHRYSALIS_RESIDUAL_LEGACY_MAX ${resMax}`,
      );
    }
  }
  console.log(
    `migration-sidecar-floors OK: dir=${migrationDir} idiomaticity_min=${idioMin ?? "(unset)"} residual_max=${resMax ?? "(unset)"}`,
  );
}

function assertMigrationSidecarFloorsRelease(dirArg) {
  const releaseIdioMin = parseOptionalEnvNumber(
    process.env.CHRYSALIS_RELEASE_IDIOMATICITY_MIN,
    "CHRYSALIS_RELEASE_IDIOMATICITY_MIN",
  );
  const releaseResMax = parseOptionalEnvNumber(
    process.env.CHRYSALIS_RELEASE_RESIDUAL_LEGACY_MAX,
    "CHRYSALIS_RELEASE_RESIDUAL_LEGACY_MAX",
  );
  if (releaseIdioMin != null && (releaseIdioMin < 0 || releaseIdioMin > 1)) {
    fail("migration-sidecar-floors-release: CHRYSALIS_RELEASE_IDIOMATICITY_MIN must be between 0 and 1 inclusive");
  }
  if (releaseResMax != null && (releaseResMax < 0 || releaseResMax > 100)) {
    fail(
      "migration-sidecar-floors-release: CHRYSALIS_RELEASE_RESIDUAL_LEGACY_MAX must be between 0 and 100 inclusive",
    );
  }
  const prevIdio = process.env.CHRYSALIS_IDIOMATICITY_MIN;
  const prevRes = process.env.CHRYSALIS_RESIDUAL_LEGACY_MAX;
  process.env.CHRYSALIS_IDIOMATICITY_MIN = String(
    parseOptionalEnvNumber(prevIdio, "CHRYSALIS_IDIOMATICITY_MIN") ?? releaseIdioMin ?? 0.01,
  );
  process.env.CHRYSALIS_RESIDUAL_LEGACY_MAX = String(
    parseOptionalEnvNumber(prevRes, "CHRYSALIS_RESIDUAL_LEGACY_MAX") ?? releaseResMax ?? 50,
  );
  assertMigrationSidecarFloors(dirArg);
}

function requireNonEmptyEnv(name, context) {
  const v = process.env[name];
  if (v == null || String(v).trim() === "") {
    fail(`${context}: ${name} must be set`);
  }
}

function assertSessionBridgeRelease() {
  const strict = (process.env.CHRYSALIS_SESSION_RELEASE_STRICT ?? "1") === "1";
  const topology = (process.env.CHRYSALIS_DEPLOY_TOPOLOGY ?? "multi-host").trim();
  if (topology !== "single-host" && topology !== "multi-host") {
    fail(
      "session-bridge-release: CHRYSALIS_DEPLOY_TOPOLOGY must be single-host or multi-host",
    );
  }
  const modeRaw = process.env.CHRYSALIS_SESSION_BRIDGE_MODE;
  const mode = modeRaw == null ? "" : String(modeRaw).trim();
  if (mode === "") {
    if (strict) {
      fail("session-bridge-release: CHRYSALIS_SESSION_BRIDGE_MODE must be set in strict mode");
    }
    console.log("session-bridge-release skipped: bridge mode unset (strict disabled)");
    return;
  }
  const allowed = new Set(["memory", "file", "sqlite", "redis"]);
  if (!allowed.has(mode)) {
    fail("session-bridge-release: CHRYSALIS_SESSION_BRIDGE_MODE must be one of memory|file|sqlite|redis");
  }

  if (topology === "multi-host" && mode !== "redis") {
    fail("session-bridge-release: multi-host topology requires CHRYSALIS_SESSION_BRIDGE_MODE=redis");
  }

  if (mode === "redis") {
    requireNonEmptyEnv("CHRYSALIS_SESSION_REDIS_URL", "session-bridge-release");
  } else if (mode === "sqlite") {
    requireNonEmptyEnv("CHRYSALIS_SESSION_SQLITE_PATH", "session-bridge-release");
  } else if (mode === "file") {
    requireNonEmptyEnv("CHRYSALIS_SESSION_DIR", "session-bridge-release");
  } else if ((process.env.CHRYSALIS_ALLOW_MEMORY_SESSION_RELEASE ?? "0") !== "1") {
    fail(
      "session-bridge-release: memory mode blocked for release unless CHRYSALIS_ALLOW_MEMORY_SESSION_RELEASE=1",
    );
  }
  console.log(`session-bridge-release OK: topology=${topology} mode=${mode}`);
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
  case "confidence-5nines":
    assertConfidence5Nines(arg0 ?? "reports/confidence/flagship-laravel-full.json");
    break;
  case "confidence-trend":
    assertConfidenceTrend(arg0 ?? "reports/confidence/history/flagship-laravel-full.history.json");
    break;
  case "confidence-trend-ready":
    assertConfidenceTrendReady(arg0 ?? "reports/confidence/history/flagship-laravel-full.history.json");
    break;
  case "verify-dual-summary":
    assertVerifyDualSummary(arg0 ?? "reports/ci/verify-e2e-summary.json");
    break;
  case "verify-merged-summary":
    assertVerifyMergedSummary(arg0 ?? "reports/ci/verify-e2e-merged-summary.json");
    break;
  case "corpus-merge-summary":
    assertCorpusMergeSummary(arg0 ?? "reports/ci/corpus-merge-summary.json");
    break;
  case "migration-sidecar-floors":
    assertMigrationSidecarFloors(arg0);
    break;
  case "migration-sidecar-floors-release":
    assertMigrationSidecarFloorsRelease(arg0);
    break;
  case "emit-layout-floors":
    assertEmitLayoutFloors(arg0);
    break;
  case "session-bridge-release":
    assertSessionBridgeRelease();
    break;
  case "hub-completion":
    assertHubCompletion(arg0 ?? "reports/ci/hub-completion.json");
    break;
  default:
    console.error(
      "Usage: node scripts/ci-gates.mjs " +
        "<status-migration|tiny-n1-insight|rewrite-pre-xss|tiny-n1-rewrite|confidence-5nines|confidence-trend|confidence-trend-ready|verify-dual-summary|verify-merged-summary|corpus-merge-summary|hub-completion|migration-sidecar-floors|migration-sidecar-floors-release|emit-layout-floors|session-bridge-release> [path]",
    );
    process.exit(1);
}
