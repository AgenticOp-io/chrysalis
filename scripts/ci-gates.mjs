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
    s.schemaVersion !== 22 &&
    s.schemaVersion !== 23 &&
    s.schemaVersion !== 24 &&
    s.schemaVersion !== 25 &&
    s.schemaVersion !== 26 &&
    s.schemaVersion !== 27 &&
    s.schemaVersion !== 28 &&
    s.schemaVersion !== 29 &&
    s.schemaVersion !== 30 &&
    s.schemaVersion !== 31 &&
    s.schemaVersion !== 32 &&
    s.schemaVersion !== 33 &&
    s.schemaVersion !== 34 &&
    s.schemaVersion !== 35 &&
    s.schemaVersion !== 36 &&
    s.schemaVersion !== 37 &&
    s.schemaVersion !== 38 &&
    s.schemaVersion !== 39 &&
    s.schemaVersion !== 40 &&
    s.schemaVersion !== 41 &&
    s.schemaVersion !== 42 &&
    s.schemaVersion !== 43 &&
    s.schemaVersion !== 44 &&
    s.schemaVersion !== 45 &&
    s.schemaVersion !== 46 &&
    s.schemaVersion !== 47 &&
    s.schemaVersion !== 48 &&
    s.schemaVersion !== 49 &&
    s.schemaVersion !== 50 &&
    s.schemaVersion !== 51 &&
    s.schemaVersion !== 52 &&
    s.schemaVersion !== 55 &&
    s.schemaVersion !== 56 &&
    s.schemaVersion !== 57 &&
    s.schemaVersion !== 58 &&
    s.schemaVersion !== 59 &&
    s.schemaVersion !== 60 &&
    s.schemaVersion !== 61 &&
    s.schemaVersion !== 62 &&
    s.schemaVersion !== 63 &&
    s.schemaVersion !== 64 &&
    s.schemaVersion !== 65 &&
    s.schemaVersion !== 66 &&
    s.schemaVersion !== 67 &&
    s.schemaVersion !== 68 &&
    s.schemaVersion !== 69 &&
    s.schemaVersion !== 70 &&
    s.schemaVersion !== 71 &&
    s.schemaVersion !== 72
  ) {
    fail(`${label}: expected schemaVersion 0–72, got ${JSON.stringify(s.schemaVersion)}`);
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
  if (s.schemaVersion >= 23) {
    if (s.phpOracleSmoke?.ingestOk !== true && s.phpOracleSmoke?.skipped == null) {
      fail(`${label}: phpOracleSmoke.ingestOk must be true for schema v23 when not skipped`);
    }
    if (!s.languageCompareApi) {
      fail(`${label}: languageCompareApi must be set for schema v23`);
    }
  }
  if (s.schemaVersion === 23) {
    if (s.pathKnowledgeV2?.schemaVersion !== 2) {
      fail(`${label}: pathKnowledgeV2.schemaVersion must be 2 for schema v23`);
    }
  }
  if (s.schemaVersion >= 24) {
    if ((s.webDatabaseCatalog?.count ?? 0) < 20) {
      fail(`${label}: webDatabaseCatalog.count must be >= 20 for schema v24`);
    }
    if (s.pathKnowledge?.schemaVersion !== 3) {
      fail(`${label}: pathKnowledge.schemaVersion must be 3 for schema v24`);
    }
    if (!s.migrationPlannerApi) {
      fail(`${label}: migrationPlannerApi must be set for schema v24`);
    }
    if (s.phpOracleSmoke?.emitFastifyOk !== true && s.phpOracleSmoke?.skipped == null) {
      fail(`${label}: phpOracleSmoke.emitFastifyOk must be true for schema v24 when not skipped`);
    }
    const pathParams = s.cwlPathParamsGold?.suiteIds ?? [];
    for (const id of ["cwl-path-params-hono", "cwl-path-params-fastify"]) {
      if (!pathParams.includes(id)) {
        fail(`${label}: cwlPathParamsGold must list ${id} for schema v24`);
      }
    }
  }
  if (s.schemaVersion >= 25) {
    const pathParams = s.cwlPathParamsGold?.suiteIds ?? [];
    if (!pathParams.includes("cwl-path-params-nextjs")) {
      fail(`${label}: cwlPathParamsGold must list cwl-path-params-nextjs for schema v25`);
    }
    const queryParams = s.cwlQueryParamsGold?.suiteIds ?? [];
    for (const id of ["cwl-query-params-hono", "cwl-query-params-fastify", "cwl-query-params-nextjs"]) {
      if (!queryParams.includes(id)) {
        fail(`${label}: cwlQueryParamsGold must list ${id} for schema v25`);
      }
    }
    if (!s.databaseDetectApi) {
      fail(`${label}: databaseDetectApi must be set for schema v25`);
    }
  }
  if (s.schemaVersion >= 26) {
    const ctx = s.cwlRequestContextGold?.suiteIds ?? [];
    for (const id of ["cwl-request-context-hono", "cwl-request-context-fastify", "cwl-request-context-nextjs"]) {
      if (!ctx.includes(id)) {
        fail(`${label}: cwlRequestContextGold must list ${id} for schema v26`);
      }
    }
    if (s.phpOracleSmoke?.wptpEmitNextjsAvailable === true && s.phpOracleSmoke?.emitNextjsOk !== true) {
      fail(`${label}: phpOracleSmoke.emitNextjsOk must be true when wptp-emit-nextjs is available`);
    }
    if (!s.knowledgeExport?.pathKnowledge || !s.knowledgeExport?.webDatabases) {
      fail(`${label}: knowledgeExport paths must be set for schema v26`);
    }
  }
  if (s.schemaVersion >= 27) {
    const body = s.cwlRequestBodyGold?.suiteIds ?? [];
    for (const id of ["cwl-request-body-hono", "cwl-request-body-fastify", "cwl-request-body-nextjs"]) {
      if (!body.includes(id)) {
        fail(`${label}: cwlRequestBodyGold must list ${id} for schema v27`);
      }
    }
    const status = s.cwlResponseStatusGold?.suiteIds ?? [];
    for (const id of ["cwl-response-status-hono", "cwl-response-status-fastify", "cwl-response-status-nextjs"]) {
      if (!status.includes(id)) {
        fail(`${label}: cwlResponseStatusGold must list ${id} for schema v27`);
      }
    }
    if ((s.capabilityMatrix?.oracleProductPairCount ?? 0) < 4) {
      fail(`${label}: capabilityMatrix.oracleProductPairCount must be >= 4 for schema v27`);
    }
    if (!s.migrationProgramsApi || !s.evidenceApi) {
      fail(`${label}: migrationProgramsApi and evidenceApi must be set for schema v27`);
    }
  }
  if (s.schemaVersion >= 28) {
    const auth = s.cwlAuthEffectsGold?.suiteIds ?? [];
    for (const id of ["cwl-auth-effects-hono", "cwl-auth-effects-fastify", "cwl-auth-effects-nextjs"]) {
      if (!auth.includes(id)) {
        fail(`${label}: cwlAuthEffectsGold must list ${id} for schema v28`);
      }
    }
    if (!s.laravelVerifyGaps?.exportScript) {
      fail(`${label}: laravelVerifyGaps.exportScript must be set for schema v28`);
    }
    if (s.phpNextjsVerify?.ok !== true && s.phpNextjsVerify?.skip !== "no-wptp-emit-nextjs") {
      fail(`${label}: phpNextjsVerify.ok must be true for schema v28 when WPTP is available`);
    }
    if (s.phpOracleSmoke?.verifyNextjsOk !== true && s.phpOracleSmoke?.wptpEmitNextjsAvailable === true) {
      fail(`${label}: phpOracleSmoke.verifyNextjsOk must be true when wptp available (schema v28)`);
    }
  }
  if (s.schemaVersion >= 29) {
    const exp = s.expressFlagshipGold?.suiteIds ?? [];
    for (const id of [
      "express-flagship-hono",
      "express-flagship-fastify",
      "express-flagship-nextjs",
      "express-flagship-cwl",
    ]) {
      if (!exp.includes(id)) {
        fail(`${label}: expressFlagshipGold must list ${id} for schema v29`);
      }
    }
    if (s.expressFlagshipGold?.ok !== true) {
      fail(`${label}: expressFlagshipGold.ok must be true for schema v29`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 132) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 132 for schema v29`);
    }
    if ((s.traceReplay?.expectedSuiteCount ?? 0) < 105) {
      fail(`${label}: traceReplay.expectedSuiteCount must be >= 105 for schema v29`);
    }
  }
  if (s.schemaVersion >= 30) {
    if (s.nodeExpressOracleVerify?.ok !== true) {
      fail(`${label}: nodeExpressOracleVerify.ok must be true for schema v30`);
    }
    if (typeof s.nodeExpressOracleVerify?.correctness !== "number") {
      fail(`${label}: nodeExpressOracleVerify.correctness must be set for schema v30`);
    }
    if ((s.capabilityMatrix?.oracleProductPairCount ?? 0) < 5) {
      fail(`${label}: capabilityMatrix.oracleProductPairCount must be >= 5 for schema v30 (Node pilot)`);
    }
  }
  if (s.schemaVersion >= 31) {
    if (s.plainPhpFlagshipGold?.ok !== true) {
      fail(`${label}: plainPhpFlagshipGold.ok must be true for schema v31`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 135) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 135 for schema v31`);
    }
    if ((s.traceReplay?.expectedSuiteCount ?? 0) < 107) {
      fail(`${label}: traceReplay.expectedSuiteCount must be >= 107 for schema v31`);
    }
    if ((s.capabilityMatrix?.oracleProductPairCount ?? 0) < 6) {
      fail(`${label}: capabilityMatrix.oracleProductPairCount must be >= 6 for schema v31 (plain PHP pilot)`);
    }
  }
  if (s.schemaVersion >= 32) {
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 138) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 138 for schema v32`);
    }
    if ((s.traceReplay?.expectedSuiteCount ?? 0) < 110) {
      fail(`${label}: traceReplay.expectedSuiteCount must be >= 110 for schema v32`);
    }
    if (!Array.isArray(s.cwlResponseContentTypeGold?.suiteIds) || s.cwlResponseContentTypeGold.suiteIds.length < 3) {
      fail(`${label}: cwlResponseContentTypeGold.suiteIds must list RFC-0008 suites for schema v32`);
    }
  }
  if (s.schemaVersion >= 33) {
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 144) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 144 for schema v33`);
    }
    if ((s.traceReplay?.expectedSuiteCount ?? 0) < 115) {
      fail(`${label}: traceReplay.expectedSuiteCount must be >= 115 for schema v33`);
    }
    if (s.symfonyFlagshipGold?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.ok must be true for schema v33`);
    }
    if ((s.capabilityMatrix?.oracleProductPairCount ?? 0) < 7) {
      fail(`${label}: capabilityMatrix.oracleProductPairCount must be >= 7 for schema v33 (Symfony pilot)`);
    }
  }
  if (s.schemaVersion >= 34) {
    if (s.symfonyFlagshipGold?.routesYamlParity?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.routesYamlParity.ok must be true for schema v34`);
    }
  }
  if (s.schemaVersion >= 35) {
    if (s.symfonyFlagshipGold?.routesAttributeParity?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.routesAttributeParity.ok must be true for schema v35`);
    }
  }
  if (s.schemaVersion >= 36) {
    if (s.symfonyFlagshipGold?.attributePrefixParity?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.attributePrefixParity.ok must be true for schema v36`);
    }
  }
  if (s.schemaVersion >= 37) {
    if (s.symfonyFlagshipGold?.attributeMethodsParity?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.attributeMethodsParity.ok must be true for schema v37`);
    }
  }
  if (s.schemaVersion >= 38) {
    if (s.symfonyFlagshipGold?.routesNameParity?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.routesNameParity.ok must be true for schema v38`);
    }
  }
  if (s.schemaVersion >= 39) {
    for (const [name, block] of [
      ["plainPhpFlagshipGold", s.plainPhpFlagshipGold],
      ["symfonyFlagshipGold", s.symfonyFlagshipGold],
    ]) {
      const cp = block?.cwlProjection;
      if (cp != null) {
        if (typeof cp.total !== "number" || typeof cp.holeFree !== "number") {
          fail(`${label}: ${name}.cwlProjection must carry numeric total/holeFree for schema v39`);
        } else if (cp.holeFree !== cp.total) {
          fail(`${label}: ${name}.cwlProjection must be hole-free (holeFree ${cp.holeFree} !== total ${cp.total}) for schema v39`);
        }
      }
    }
  }
  if (s.schemaVersion >= 40) {
    const cp = s.expressFlagshipGold?.cwlProjection;
    if (cp != null) {
      if (typeof cp.total !== "number" || typeof cp.holeFree !== "number") {
        fail(`${label}: expressFlagshipGold.cwlProjection must carry numeric total/holeFree for schema v40`);
      } else if (cp.holeFree !== cp.total) {
        fail(`${label}: expressFlagshipGold.cwlProjection must be hole-free (holeFree ${cp.holeFree} !== total ${cp.total}) for schema v40`);
      }
    }
  }
  if (s.schemaVersion >= 41) {
    for (const [name, block] of [
      ["plainPhpFlagshipGold", s.plainPhpFlagshipGold],
      ["symfonyFlagshipGold", s.symfonyFlagshipGold],
      ["expressFlagshipGold", s.expressFlagshipGold],
    ]) {
      const ep = block?.emitParity;
      if (ep != null && ep.ok !== true) {
        fail(`${label}: ${name}.emitParity.ok must be true for schema v41`);
      }
    }
    if ((s.laravelVerifyGaps?.backlogItems ?? 0) > 0 && !s.laravelVerifyGaps?.ingestNext) {
      fail(`${label}: laravelVerifyGaps.ingestNext must be set when backlogItems > 0 for schema v41`);
    }
    if (!s.laravelVerifyGaps?.actionScript) {
      fail(`${label}: laravelVerifyGaps.actionScript must be set for schema v41`);
    }
    if (s.laravelMinSmoke?.ok !== true) {
      fail(`${label}: laravelMinSmoke.ok must be true for schema v41`);
    }
  }
  if (s.schemaVersion >= 42 && s.schemaVersion < 48) {
    if (!s.laravelVerifyGapsAction?.script) {
      fail(`${label}: laravelVerifyGapsAction.script must be set for schema v42`);
    }
    if (s.hubEvidence?.schemaVersion !== 3 && s.hubEvidence?.schemaVersion !== 4) {
      fail(`${label}: hubEvidence.schemaVersion must be 3 or 4 for schema v42+`);
    }
  }
  if (s.schemaVersion >= 43 && s.schemaVersion < 48) {
    if (s.hubEvidence?.schemaVersion !== 4) {
      fail(`${label}: hubEvidence.schemaVersion must be 4 for schema v43`);
    }
    if (!s.laravelVerifyLive?.script) {
      fail(`${label}: laravelVerifyLive.script must be set for schema v43`);
    }
  }
  if (s.schemaVersion >= 44) {
    if (s.phpOracleMicro?.fixture !== "fixtures/tiny-blog") {
      fail(`${label}: phpOracleMicro.fixture must be fixtures/tiny-blog for schema v44`);
    }
    if (s.cwlResponseStatusRuntime?.ok !== true) {
      fail(`${label}: cwlResponseStatusRuntime.ok must be true for schema v44`);
    }
    if (s.projectToCwlExport?.ok !== true) {
      fail(`${label}: projectToCwlExport.ok must be true for schema v44`);
    }
    if (s.laravelVerifyLive?.ok === false && s.laravelVerifyLive?.skip !== "missing-summary") {
      fail(`${label}: laravelVerifyLive.ok must be true when live summary exists for schema v44`);
    }
    if (
      s.phpNextjsFlagshipVerify?.ok !== true &&
      s.phpNextjsFlagshipVerify?.skip !== "no-wptp-emit-nextjs"
    ) {
      fail(`${label}: phpNextjsFlagshipVerify must pass or skip with no-wptp-emit-nextjs for schema v44`);
    }
  }
  if (s.schemaVersion >= 45) {
    if (s.cwlRequestBodyRuntime?.ok !== true) {
      fail(`${label}: cwlRequestBodyRuntime.ok must be true for schema v45`);
    }
    if (s.hubEvidenceSmoke?.ok !== true) {
      fail(`${label}: hubEvidenceSmoke.ok must be true for schema v45`);
    }
    if (s.contractCwlSmoke?.ok !== true) {
      fail(`${label}: contractCwlSmoke.ok must be true for schema v45`);
    }
    if (s.nodeOracleSpike?.ok !== true) {
      fail(`${label}: nodeOracleSpike.ok must be true for schema v45`);
    }
    if (s.projectToCwlExport?.express?.holeCount !== 0 && s.projectToCwlExport?.express != null) {
      fail(`${label}: projectToCwlExport.express must be hole-free for schema v45`);
    }
    if (
      s.phpNextjsSymfonyVerify?.ok !== true &&
      s.phpNextjsSymfonyVerify?.skip !== "no-wptp-emit-nextjs"
    ) {
      fail(`${label}: phpNextjsSymfonyVerify must pass or skip with no-wptp-emit-nextjs for schema v45`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_LIVE === "1" && s.laravelVerifyLive?.ok !== true) {
      fail(`${label}: laravelVerifyLive.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_LIVE=1`);
    }
    if (s.schemaVersion < 46 && s.capabilityMatrix?.schemaVersion !== 3) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 3 for schema v45`);
    }
  }
  if (s.schemaVersion >= 46) {
    if (s.cwlRequestBodyRuntime?.projectionOk !== true) {
      fail(`${label}: cwlRequestBodyRuntime.projectionOk must be true for schema v46`);
    }
    if (s.cwlBodyRoundtrip?.ok !== true) {
      fail(`${label}: cwlBodyRoundtrip.ok must be true for schema v46`);
    }
    if (s.hubTranslateE2e?.ok !== true && s.hubTranslateE2e?.skip !== "missing-cli-dist") {
      fail(`${label}: hubTranslateE2e must pass or skip with missing-cli-dist for schema v46`);
    }
    if (s.hubEvidenceLive?.ok !== true) {
      fail(`${label}: hubEvidenceLive.ok must be true for schema v46`);
    }
    if (s.nodeOracleSpike?.schemaVersion !== 3) {
      fail(`${label}: nodeOracleSpike.schemaVersion must be 3 for schema v46`);
    }
    if (process.env.CHRYSALIS_HUB_PIPELINE_GATE_STRICT === "1") {
      const pipelinePass =
        s.hubEvidenceLive?.profiles?.plainPhp?.evidence?.pipelineGatePass ??
        s.hubEvidenceLive?.pipelineGatePass;
      if (pipelinePass !== true) {
        fail(`${label}: hubEvidenceLive pipelineGatePass must be true when CHRYSALIS_HUB_PIPELINE_GATE_STRICT=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (s.schemaVersion < 47 && s.capabilityMatrix?.schemaVersion !== 4) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 4 for schema v46`);
    }
  }
  if (s.schemaVersion >= 47) {
    if (s.cwlRequestContextRuntime?.ok !== true) {
      fail(`${label}: cwlRequestContextRuntime.ok must be true for schema v47`);
    }
    if (s.cwlResponseContentTypeRuntime?.ok !== true) {
      fail(`${label}: cwlResponseContentTypeRuntime.ok must be true for schema v47`);
    }
    if (s.cwlAuthEffectsRuntime?.ok !== true) {
      fail(`${label}: cwlAuthEffectsRuntime.ok must be true for schema v47`);
    }
    if (s.cwlRfcRoundtrip?.ok !== true) {
      fail(`${label}: cwlRfcRoundtrip.ok must be true for schema v47`);
    }
    if (s.contractRoundtrip?.ok !== true) {
      fail(`${label}: contractRoundtrip.ok must be true for schema v47`);
    }
    if (s.deliveryPipelineSmoke?.ok !== true) {
      fail(`${label}: deliveryPipelineSmoke.ok must be true for schema v47`);
    }
    if (s.verifyPlaybooksSmoke?.ok !== true) {
      fail(`${label}: verifyPlaybooksSmoke.ok must be true for schema v47`);
    }
    if (s.hubRunnerSmoke?.ok !== true) {
      fail(`${label}: hubRunnerSmoke.ok must be true for schema v47`);
    }
    if (s.projectToCwlExport?.laravelMin?.ok !== true) {
      fail(`${label}: projectToCwlExport.laravelMin must pass for schema v47`);
    }
    if (s.projectToCwlExport?.tinyBlog?.ok !== true) {
      fail(`${label}: projectToCwlExport.tinyBlog must pass for schema v47`);
    }
    if (s.schemaVersion < 48 && s.capabilityMatrix?.schemaVersion !== 5) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 5 for schema v47`);
    }
  }
  if (s.schemaVersion >= 48) {
    if (!s.laravelVerifyGapsAction?.script) {
      fail(`${label}: laravelVerifyGapsAction.script must be set for schema v48`);
    }
    if (s.migrationOsSmoke?.ok !== true) {
      fail(`${label}: migrationOsSmoke.ok must be true for schema v48`);
    }
    if (s.cwlPreviewSmoke?.ok !== true) {
      fail(`${label}: cwlPreviewSmoke.ok must be true for schema v48`);
    }
    if (s.cwlOpenapiSmoke?.ok !== true) {
      fail(`${label}: cwlOpenapiSmoke.ok must be true for schema v48`);
    }
    if (s.pathAdviceSmoke?.ok !== true) {
      fail(`${label}: pathAdviceSmoke.ok must be true for schema v48`);
    }
    if (s.detectDatabasesSmoke?.ok !== true) {
      fail(`${label}: detectDatabasesSmoke.ok must be true for schema v48`);
    }
    if (s.postTranslateArtifactsSmoke?.ok !== true) {
      fail(`${label}: postTranslateArtifactsSmoke.ok must be true for schema v48`);
    }
    if (s.cwlMiddlewareSmoke?.ok !== true) {
      fail(`${label}: cwlMiddlewareSmoke.ok must be true for schema v48`);
    }
    if (s.cwlDiffSmoke?.ok !== true) {
      fail(`${label}: cwlDiffSmoke.ok must be true for schema v48`);
    }
    if (s.cwlAllRfcRoundtrip?.ok !== true) {
      fail(`${label}: cwlAllRfcRoundtrip.ok must be true for schema v48`);
    }
    if (s.evidenceTrendSmoke?.ok !== true) {
      fail(`${label}: evidenceTrendSmoke.ok must be true for schema v48`);
    }
    if (s.verifyGapsIngestSmoke?.ok !== true) {
      fail(`${label}: verifyGapsIngestSmoke.ok must be true for schema v48`);
    }
    if (s.deliveryPipelineSmoke?.schemaVersion !== 2) {
      fail(`${label}: deliveryPipelineSmoke.schemaVersion must be 2 for schema v48`);
    }
    if (s.deliveryPipelineSmoke?.profiles?.symfony?.ok !== true) {
      fail(`${label}: deliveryPipelineSmoke symfony profile must pass for schema v48`);
    }
    if (s.schemaVersion < 49 && s.hubEvidence?.schemaVersion !== 5) {
      fail(`${label}: hubEvidence.schemaVersion must be 5 for schema v48`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS === "1" && s.migrationOsSmoke?.ok !== true) {
      fail(`${label}: migrationOsSmoke.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS=1`);
    }
    if (s.schemaVersion < 49 && s.capabilityMatrix?.schemaVersion !== 6) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 6 for schema v48`);
    }
  }
  if (s.schemaVersion >= 49 && s.schemaVersion < 50) {
    if (s.cwlPathParamsRuntime?.ok !== true) {
      fail(`${label}: cwlPathParamsRuntime.ok must be true for schema v49`);
    }
    if (s.cwlQueryParamsRuntime?.ok !== true) {
      fail(`${label}: cwlQueryParamsRuntime.ok must be true for schema v49`);
    }
    if (s.cwlMultiGoldRuntime?.ok !== true) {
      fail(`${label}: cwlMultiGoldRuntime.ok must be true for schema v49`);
    }
    if (s.cwlParamsBatch?.ok !== true) {
      fail(`${label}: cwlParamsBatch.ok must be true for schema v49`);
    }
    if (s.migrationOsStandaloneBatch?.ok !== true) {
      fail(`${label}: migrationOsStandaloneBatch.ok must be true for schema v49`);
    }
    if (s.migrationOsSymfony?.ok !== true) {
      fail(`${label}: migrationOsSymfony.ok must be true for schema v49`);
    }
    if (s.hubRunnerBatchSmoke?.ok !== true) {
      fail(`${label}: hubRunnerBatchSmoke.ok must be true for schema v49`);
    }
    if (s.deliveryPipelineRunnerSmoke?.ok !== true) {
      fail(`${label}: deliveryPipelineRunnerSmoke.ok must be true for schema v49`);
    }
    if (s.cwlAllRfcRoundtrip?.schemaVersion !== 2) {
      fail(`${label}: cwlAllRfcRoundtrip.schemaVersion must be 2 for schema v49`);
    }
    if (s.hubEvidence?.schemaVersion !== 6) {
      fail(`${label}: hubEvidence.schemaVersion must be 6 for schema v49`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS === "1" && s.cwlParamsBatch?.ok !== true) {
      fail(`${label}: cwlParamsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 7) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 7 for schema v49`);
    }
    if (s.plainPhpFlagshipGold?.inProcess !== true) {
      fail(`${label}: plainPhpFlagshipGold.inProcess must be true for schema v49`);
    }
    if (s.symfonyFlagshipGold?.inProcess !== true) {
      fail(`${label}: symfonyFlagshipGold.inProcess must be true for schema v49`);
    }
  }
  if (s.schemaVersion >= 50 && s.schemaVersion < 51) {
    if (s.expressDeliveryBatch?.ok !== true) {
      fail(`${label}: expressDeliveryBatch.ok must be true for schema v50`);
    }
    if (s.symfonyMigrationOsBatch?.ok !== true) {
      fail(`${label}: symfonyMigrationOsBatch.ok must be true for schema v50`);
    }
    if (s.cwlInterchangeBatch?.ok !== true) {
      fail(`${label}: cwlInterchangeBatch.ok must be true for schema v50`);
    }
    if (s.cwlParamsRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlParamsRoundtripBatch.ok must be true for schema v50`);
    }
    if (s.cwlMultiBatch?.ok !== true) {
      fail(`${label}: cwlMultiBatch.ok must be true for schema v50`);
    }
    if (s.evidenceLiveStandaloneBatch?.ok !== true) {
      fail(`${label}: evidenceLiveStandaloneBatch.ok must be true for schema v50`);
    }
    if (s.translateE2eStandaloneBatch?.ok !== true) {
      fail(`${label}: translateE2eStandaloneBatch.ok must be true for schema v50`);
    }
    if (s.projectToCwlExpressSmoke?.ok !== true) {
      fail(`${label}: projectToCwlExpressSmoke.ok must be true for schema v50`);
    }
    if (s.hubRunnerBatchSmoke?.schemaVersion !== 2) {
      fail(`${label}: hubRunnerBatchSmoke.schemaVersion must be 2 for schema v50`);
    }
    if (s.hubEvidence?.schemaVersion !== 7) {
      fail(`${label}: hubEvidence.schemaVersion must be 7 for schema v50`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY === "1" && s.expressDeliveryBatch?.ok !== true) {
      fail(`${label}: expressDeliveryBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 8) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 8 for schema v50`);
    }
    if (s.expressFlagshipGold?.inProcess !== true) {
      fail(`${label}: expressFlagshipGold.inProcess must be true for schema v50`);
    }
  }
  if (s.schemaVersion >= 51 && s.schemaVersion < 52) {
    if (s.laravelMinDeliveryBatch?.ok !== true) {
      fail(`${label}: laravelMinDeliveryBatch.ok must be true for schema v51`);
    }
    if (s.plainPhpDeliveryBatch?.ok !== true) {
      fail(`${label}: plainPhpDeliveryBatch.ok must be true for schema v51`);
    }
    if (s.threeOriginDeliveryBatch?.ok !== true) {
      fail(`${label}: threeOriginDeliveryBatch.ok must be true for schema v51`);
    }
    if (s.laravelDepthBatch?.ok !== true) {
      fail(`${label}: laravelDepthBatch.ok must be true for schema v51`);
    }
    if (s.cwlFullBatch?.ok !== true) {
      fail(`${label}: cwlFullBatch.ok must be true for schema v51`);
    }
    if (s.projectToCwlLaravelMinSmoke?.ok !== true) {
      fail(`${label}: projectToCwlLaravelMinSmoke.ok must be true for schema v51`);
    }
    if (s.tinyBlogOracleBatch?.ok !== true) {
      fail(`${label}: tinyBlogOracleBatch.ok must be true for schema v51`);
    }
    if (s.hubEvidence?.schemaVersion !== 8) {
      fail(`${label}: hubEvidence.schemaVersion must be 8 for schema v51`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN === "1" && s.laravelMinDeliveryBatch?.ok !== true) {
      fail(`${label}: laravelMinDeliveryBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 9) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 9 for schema v51`);
    }
  }
  if (s.schemaVersion >= 52 && s.schemaVersion < 53) {
    if (s.fourOriginDeliveryBatch?.ok !== true) {
      fail(`${label}: fourOriginDeliveryBatch.ok must be true for schema v52`);
    }
    if (s.symfonyDeliveryBatch?.ok !== true) {
      fail(`${label}: symfonyDeliveryBatch.ok must be true for schema v52`);
    }
    if (s.fullDeliveryMegaBatch?.ok !== true) {
      fail(`${label}: fullDeliveryMegaBatch.ok must be true for schema v52`);
    }
    if (s.cwlMegaBatch?.ok !== true) {
      fail(`${label}: cwlMegaBatch.ok must be true for schema v52`);
    }
    if (s.oracleStandaloneBatch?.ok !== true) {
      fail(`${label}: oracleStandaloneBatch.ok must be true for schema v52`);
    }
    if (s.laravelMinMigrationOsBatch?.ok !== true) {
      fail(`${label}: laravelMinMigrationOsBatch.ok must be true for schema v52`);
    }
    if (s.deliveryPipelineStandaloneBatch?.ok !== true) {
      fail(`${label}: deliveryPipelineStandaloneBatch.ok must be true for schema v52`);
    }
    if (s.hubEvidence?.schemaVersion !== 9) {
      fail(`${label}: hubEvidence.schemaVersion must be 9 for schema v52`);
    }
    if (s.hubRunnerBatchSmoke?.schemaVersion !== 3) {
      fail(`${label}: hubRunnerBatchSmoke.schemaVersion must be 3 for schema v52`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN === "1" && s.fourOriginDeliveryBatch?.ok !== true) {
      fail(`${label}: fourOriginDeliveryBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 10) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 10 for schema v52`);
    }
  }
  if (s.schemaVersion >= 53 && s.schemaVersion < 54) {
    if (s.allDeliveryUltraMegaBatch?.ok !== true) {
      fail(`${label}: allDeliveryUltraMegaBatch.ok must be true for schema v53`);
    }
    if (s.migrationOsMegaBatch?.ok !== true) {
      fail(`${label}: migrationOsMegaBatch.ok must be true for schema v53`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v53`);
    }
    if (s.advisoryStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: advisoryStandaloneMegaBatch.ok must be true for schema v53`);
    }
    if (s.postTranslateVerifyOriginBatch?.ok !== true) {
      fail(`${label}: postTranslateVerifyOriginBatch.ok must be true for schema v53`);
    }
    if (s.tinyBlogDepthBatch?.ok !== true) {
      fail(`${label}: tinyBlogDepthBatch.ok must be true for schema v53`);
    }
    if (s.hubEvidence?.schemaVersion !== 10) {
      fail(`${label}: hubEvidence.schemaVersion must be 10 for schema v53`);
    }
    if (s.deliveryPipelineRunnerSmoke?.schemaVersion !== 3) {
      fail(`${label}: deliveryPipelineRunnerSmoke.schemaVersion must be 3 for schema v53`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA === "1" && s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 11) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 11 for schema v53`);
    }
  }
  if (s.schemaVersion >= 54 && s.schemaVersion < 55) {
    if (s.originDepthUltraBatch?.ok !== true) {
      fail(`${label}: originDepthUltraBatch.ok must be true for schema v54`);
    }
    if (s.chimeraAssessmentMegaBatch?.ok !== true) {
      fail(`${label}: chimeraAssessmentMegaBatch.ok must be true for schema v54`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v54`);
    }
    if (s.chimeraCutoverOriginBatch?.ok !== true) {
      fail(`${label}: chimeraCutoverOriginBatch.ok must be true for schema v54`);
    }
    if (s.hubEvidence?.schemaVersion !== 11) {
      fail(`${label}: hubEvidence.schemaVersion must be 11 for schema v54`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH === "1" && s.originDepthUltraBatch?.ok !== true) {
      fail(`${label}: originDepthUltraBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 12) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 12 for schema v54`);
    }
  }
  if (s.schemaVersion >= 55 && s.schemaVersion < 56) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v55`);
    }
    if (s.cwlAllOriginsBatch?.ok !== true) {
      fail(`${label}: cwlAllOriginsBatch.ok must be true for schema v55`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v55`);
    }
    if ((s.projectToCwlAllOrigins?.originCount ?? 0) < 23) {
      fail(`${label}: projectToCwlAllOrigins.originCount must be >= 23 for schema v55`);
    }
    if (s.hubEvidence?.schemaVersion !== 12) {
      fail(`${label}: hubEvidence.schemaVersion must be 12 for schema v55`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL === "1" && s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 13) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 13 for schema v55`);
    }
  }
  if (s.schemaVersion >= 56 && s.schemaVersion < 57) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v56`);
    }
    if (s.cwlAllOriginsBatch?.ok !== true) {
      fail(`${label}: cwlAllOriginsBatch.ok must be true for schema v56`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v56`);
    }
    if ((s.projectToCwlAllOrigins?.originCount ?? 0) < 23) {
      fail(`${label}: projectToCwlAllOrigins.originCount must be >= 23 for schema v56`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL === "1" && s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL=1`);
    }
    if (s.cwlPatternLiteralCwlBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralCwlBatch.ok must be true for schema v56`);
    }
    if (s.hubTranslateCwlCoverage?.ok !== true) {
      fail(`${label}: hubTranslateCwlCoverage.ok must be true for schema v56`);
    }
    if ((s.cwlPatternLiteralCwlBatch?.suiteCount ?? 0) < 18) {
      fail(`${label}: cwlPatternLiteralCwlBatch.suiteCount must be >= 18 for schema v56`);
    }
    if (s.hubEvidence?.schemaVersion !== 13) {
      fail(`${label}: hubEvidence.schemaVersion must be 13 for schema v56`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_CWL === "1" && s.cwlPatternLiteralCwlBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralCwlBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_CWL=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL === "1" && s.hubTranslateCwlCoverage?.ok !== true) {
      fail(`${label}: hubTranslateCwlCoverage.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 14) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 14 for schema v56`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v56`);
    }
  }
  if (s.schemaVersion >= 57 && s.schemaVersion < 58) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v57`);
    }
    if (s.cwlAllOriginsBatch?.ok !== true) {
      fail(`${label}: cwlAllOriginsBatch.ok must be true for schema v57`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v57`);
    }
    if ((s.projectToCwlAllOrigins?.originCount ?? 0) < 23) {
      fail(`${label}: projectToCwlAllOrigins.originCount must be >= 23 for schema v57`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL === "1" && s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL=1`);
    }
    if (s.cwlPatternLiteralCwlBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralCwlBatch.ok must be true for schema v57`);
    }
    if (s.cwlPatternLiteralRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.ok must be true for schema v57`);
    }
    if (s.hubTranslateCwlCoverage?.ok !== true) {
      fail(`${label}: hubTranslateCwlCoverage.ok must be true for schema v57`);
    }
    if ((s.hubTranslateCwlCoverage?.originCount ?? 0) < 23) {
      fail(`${label}: hubTranslateCwlCoverage.originCount must be >= 23 for schema v57`);
    }
    if ((s.cwlPatternLiteralRoundtripBatch?.suiteCount ?? 0) < 21) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.suiteCount must be >= 21 for schema v57`);
    }
    if (s.hubEvidence?.schemaVersion !== 14) {
      fail(`${label}: hubEvidence.schemaVersion must be 14 for schema v57`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_ROUNDTRIP === "1" && s.cwlPatternLiteralRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ALL_ORIGINS === "1" && (s.hubTranslateCwlCoverage?.originCount ?? 0) < 23) {
      fail(`${label}: hubTranslateCwlCoverage.originCount must be >= 23 when CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ALL_ORIGINS=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 15) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 15 for schema v57`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v57`);
    }
  }
  if (s.schemaVersion >= 58 && s.schemaVersion < 59) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v58`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v58`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 2 for schema v58`);
    }
    if (s.cwlPatternLiteralRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.ok must be true for schema v58`);
    }
    if (s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true for schema v58`);
    }
    if (s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true for schema v58`);
    }
    if ((s.hubTranslateCwlRoundtrip?.originCount ?? 0) < 23) {
      fail(`${label}: hubTranslateCwlRoundtrip.originCount must be >= 23 for schema v58`);
    }
    if ((s.cwlFlagshipRoundtripBatch?.suiteCount ?? 0) < 3) {
      fail(`${label}: cwlFlagshipRoundtripBatch.suiteCount must be >= 3 for schema v58`);
    }
    if (s.hubEvidence?.schemaVersion !== 15) {
      fail(`${label}: hubEvidence.schemaVersion must be 15 for schema v58`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP === "1" && s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP === "1" && s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 16) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 16 for schema v58`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v58`);
    }
  }
  if (s.schemaVersion >= 59 && s.schemaVersion < 60) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v59`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v59`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 3 for schema v59`);
    }
    if (s.cwlPatternLiteralRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.ok must be true for schema v59`);
    }
    if (s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true for schema v59`);
    }
    if (s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true for schema v59`);
    }
    if (s.projectToCwlRoundtrip?.ok !== true) {
      fail(`${label}: projectToCwlRoundtrip.ok must be true for schema v59`);
    }
    if ((s.projectToCwlRoundtrip?.originCount ?? 0) < 23) {
      fail(`${label}: projectToCwlRoundtrip.originCount must be >= 23 for schema v59`);
    }
    if ((s.hubTranslateCwlRoundtrip?.originCount ?? 0) < 23) {
      fail(`${label}: hubTranslateCwlRoundtrip.originCount must be >= 23 for schema v59`);
    }
    if ((s.cwlFlagshipRoundtripBatch?.suiteCount ?? 0) < 3) {
      fail(`${label}: cwlFlagshipRoundtripBatch.suiteCount must be >= 3 for schema v59`);
    }
    if (s.hubEvidence?.schemaVersion !== 16) {
      fail(`${label}: hubEvidence.schemaVersion must be 16 for schema v59`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PROJECT_TO_CWL_ROUNDTRIP === "1" && s.projectToCwlRoundtrip?.ok !== true) {
      fail(`${label}: projectToCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PROJECT_TO_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP === "1" && s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP === "1" && s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 17) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 17 for schema v59`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v59`);
    }
  }
  if (s.schemaVersion >= 60 && s.schemaVersion < 61) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v60`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v60`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v60`);
    }
    if (s.cwlPatternLiteralRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.ok must be true for schema v60`);
    }
    if (s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true for schema v60`);
    }
    if (s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true for schema v60`);
    }
    if (s.projectToCwlRoundtrip?.ok !== true) {
      fail(`${label}: projectToCwlRoundtrip.ok must be true for schema v60`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v60`);
    }
    if ((s.projectToCwlRoundtrip?.originCount ?? 0) < 23) {
      fail(`${label}: projectToCwlRoundtrip.originCount must be >= 23 for schema v60`);
    }
    if ((s.hubTranslateCwlRoundtrip?.originCount ?? 0) < 23) {
      fail(`${label}: hubTranslateCwlRoundtrip.originCount must be >= 23 for schema v60`);
    }
    if ((s.cwlFlagshipRoundtripBatch?.suiteCount ?? 0) < 3) {
      fail(`${label}: cwlFlagshipRoundtripBatch.suiteCount must be >= 3 for schema v60`);
    }
    if (s.hubEvidence?.schemaVersion !== 17) {
      fail(`${label}: hubEvidence.schemaVersion must be 17 for schema v60`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP === "1" && s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PROJECT_TO_CWL_ROUNDTRIP === "1" && s.projectToCwlRoundtrip?.ok !== true) {
      fail(`${label}: projectToCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PROJECT_TO_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP === "1" && s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP === "1" && s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 18) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 18 for schema v60`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v60`);
    }
  }
  if (s.schemaVersion >= 61 && s.schemaVersion < 62) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v61`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v61`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v61`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v61`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v61`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 2 for schema v61`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v61`);
    }
    if (s.hubEvidence?.schemaVersion !== 18) {
      fail(`${label}: hubEvidence.schemaVersion must be 18 for schema v61`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP === "1" && s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 19) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 19 for schema v61`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v61`);
    }
  }
  if (s.schemaVersion >= 62 && s.schemaVersion < 63) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v62`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v62`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v62`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v62`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v62`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v62`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 3 for schema v62`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v62`);
    }
    if (s.hubEvidence?.schemaVersion !== 19) {
      fail(`${label}: hubEvidence.schemaVersion must be 19 for schema v62`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP === "1" && s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 20) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 20 for schema v62`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v62`);
    }
  }
  if (s.schemaVersion >= 63 && s.schemaVersion < 64) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v63`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v63`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v63`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v63`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v63`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v63`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v63`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 4 for schema v63`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v63`);
    }
    if (s.hubEvidence?.schemaVersion !== 20) {
      fail(`${label}: hubEvidence.schemaVersion must be 20 for schema v63`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 21) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 21 for schema v63`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v63`);
    }
  }
  if (s.schemaVersion >= 64 && s.schemaVersion < 65) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v64`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v64`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v64`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v64`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v64`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v64`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v64`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v64`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 4 for schema v64`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v64`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 2 for schema v64`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v64`);
    }
    if (s.hubEvidence?.schemaVersion !== 21) {
      fail(`${label}: hubEvidence.schemaVersion must be 21 for schema v64`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 22) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 22 for schema v64`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v64`);
    }
  }
  if (s.schemaVersion >= 65 && s.schemaVersion < 66) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v65`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v65`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v65`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v65`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v65`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v65`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v65`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v65`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v65`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 4 for schema v65`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v65`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 2 for schema v65`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v65`);
    }
    if (s.hubEvidence?.schemaVersion !== 22) {
      fail(`${label}: hubEvidence.schemaVersion must be 22 for schema v65`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 23) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 23 for schema v65`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v65`);
    }
  }
  if (s.schemaVersion >= 66 && s.schemaVersion < 67) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v66`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v66`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v66`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v66`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v66`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v66`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v66`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v66`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v66`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v66`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 4 for schema v66`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v66`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 2 for schema v66`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v66`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 2 for schema v66`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v66`);
    }
    if (s.hubEvidence?.schemaVersion !== 23) {
      fail(`${label}: hubEvidence.schemaVersion must be 23 for schema v66`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 24) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 24 for schema v66`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v66`);
    }
  }
  if (s.schemaVersion >= 67 && s.schemaVersion < 68) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v67`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v67`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v67`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v67`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v67`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v67`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v67`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v67`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v67`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v67`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 2 for schema v67`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v67`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 4 for schema v67`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v67`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 2 for schema v67`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v67`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 3 for schema v67`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v67`);
    }
    if (s.hubEvidence?.schemaVersion !== 24) {
      fail(`${label}: hubEvidence.schemaVersion must be 24 for schema v67`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 25) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 25 for schema v67`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v67`);
    }
  }
  if (s.schemaVersion >= 68 && s.schemaVersion < 69) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v68`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v68`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v68`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v68`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v68`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v68`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v68`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 2 for schema v68`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v68`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v68`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v68`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 2 for schema v68`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v68`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v68`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 5 for schema v68`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v68`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 3 for schema v68`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v68`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 4 for schema v68`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v68`);
    }
    if (s.hubEvidence?.schemaVersion !== 25) {
      fail(`${label}: hubEvidence.schemaVersion must be 25 for schema v68`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 26) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 26 for schema v68`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v68`);
    }
  }
  if (s.schemaVersion >= 69 && s.schemaVersion < 70) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v69`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v69`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v69`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v69`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v69`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v69`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v69`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 3 for schema v69`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v69`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v69`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v69`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 2 for schema v69`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v69`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v69`);
    }
    if ((s.gapsIngestStrictBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: gapsIngestStrictBatch.schemaVersion must be >= 2 for schema v69`);
    }
    if (s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true for schema v69`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 6) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 6 for schema v69`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v69`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 4 for schema v69`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v69`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 5 for schema v69`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v69`);
    }
    if (s.hubEvidence?.schemaVersion !== 26) {
      fail(`${label}: hubEvidence.schemaVersion must be 26 for schema v69`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1" && s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_STRICT=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 27) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 27 for schema v69`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v69`);
    }
  }
  if (s.schemaVersion >= 70 && s.schemaVersion < 71) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v70`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v70`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v70`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v70`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v70`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v70`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v70`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 4 for schema v70`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v70`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v70`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v70`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 2 for schema v70`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v70`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v70`);
    }
    if ((s.gapsIngestStrictBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: gapsIngestStrictBatch.schemaVersion must be >= 3 for schema v70`);
    }
    if (s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true for schema v70`);
    }
    if (s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true for schema v70`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 7) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 7 for schema v70`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v70`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 5 for schema v70`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v70`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 6) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 6 for schema v70`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v70`);
    }
    if (s.hubEvidence?.schemaVersion !== 27) {
      fail(`${label}: hubEvidence.schemaVersion must be 27 for schema v70`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE === "1" && s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1" && s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_STRICT=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 28) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 28 for schema v70`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v70`);
    }
  }
  if (s.schemaVersion >= 71 && s.schemaVersion < 72) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v71`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v71`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v71`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v71`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v71`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v71`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v71`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 5 for schema v71`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v71`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v71`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v71`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 3 for schema v71`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v71`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v71`);
    }
    if ((s.gapsIngestStrictBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: gapsIngestStrictBatch.schemaVersion must be >= 4 for schema v71`);
    }
    if (s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true for schema v71`);
    }
    if (s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true for schema v71`);
    }
    if (s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true for schema v71`);
    }
    if (s.flagshipVerifyReplay?.ok !== true) {
      fail(`${label}: flagshipVerifyReplay.ok must be true for schema v71`);
    }
    if (s.irHelperLifting?.ok !== true) {
      fail(`${label}: irHelperLifting.ok must be true for schema v71`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 8) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 8 for schema v71`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v71`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 6) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 6 for schema v71`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v71`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 7) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 7 for schema v71`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v71`);
    }
    if (s.hubEvidence?.schemaVersion !== 28) {
      fail(`${label}: hubEvidence.schemaVersion must be 28 for schema v71`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY === "1" && s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE === "1" && s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1" && s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_STRICT=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 29) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 29 for schema v71`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v71`);
    }
  }
  if (s.schemaVersion >= 72) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v72`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v72`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v72`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v72`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v72`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v72`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v72`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 6) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 6 for schema v72`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v72`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v72`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v72`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 4 for schema v72`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v72`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v72`);
    }
    if ((s.gapsIngestStrictBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: gapsIngestStrictBatch.schemaVersion must be >= 5 for schema v72`);
    }
    if (s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true for schema v72`);
    }
    if (s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true for schema v72`);
    }
    if (s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true for schema v72`);
    }
    if (s.laravelAuthProbeVerifyHttp?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyHttp.ok must be true for schema v72`);
    }
    if (s.flagshipVerifyReplay?.ok !== true) {
      fail(`${label}: flagshipVerifyReplay.ok must be true for schema v72`);
    }
    if (s.flagshipVerifyHttp?.ok !== true) {
      fail(`${label}: flagshipVerifyHttp.ok must be true for schema v72`);
    }
    if (s.irHelperLifting?.ok !== true) {
      fail(`${label}: irHelperLifting.ok must be true for schema v72`);
    }
    if (s.irHelperLiftingSemantic?.ok !== true) {
      fail(`${label}: irHelperLiftingSemantic.ok must be true for schema v72`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 9) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 9 for schema v72`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v72`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 7) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 7 for schema v72`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v72`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 8) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 8 for schema v72`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v72`);
    }
    if (s.hubEvidence?.schemaVersion !== 29) {
      fail(`${label}: hubEvidence.schemaVersion must be 29 for schema v72`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP === "1" && s.laravelAuthProbeVerifyHttp?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyHttp.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY === "1" && s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1" && s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_STRICT=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 30) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 30 for schema v72`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v72`);
    }
  }
  const g = s.routeGrades;
  if (!g || typeof g.gold !== "number" || typeof g.silver !== "number" || typeof g.open !== "number") {
    fail(`${label}: missing routeGrades counts`);
  }
  console.log(`${label} OK: gold=${g.gold} silver=${g.silver} open=${g.open} matrixPassed=${s.matrixSmoke?.passed}`);
}

/** @param {string} path */
function assertHubPathKnowledge(path) {
  const label = "hub-path-knowledge";
  const s = readJsonGateArtifact(label, path, {
    missingLabel: "report file missing",
    missingHint: ["Run: pnpm run hub:path-knowledge"],
  });
  if (s.kind !== "chrysalis.translation-hub.path-knowledge") {
    fail(`${label}: kind must be chrysalis.translation-hub.path-knowledge`);
  }
  if (s.schemaVersion !== 3) {
    fail(`${label}: schemaVersion must be 3`);
  }
  if ((s.pairCount ?? 0) < 575) {
    fail(`${label}: pairCount must be >= 575`);
  }
  if ((s.webDatabaseCatalog?.count ?? 0) < 20) {
    fail(`${label}: webDatabaseCatalog.count must be >= 20`);
  }
  console.log(`${label} OK: pairs=${s.pairCount} databases=${s.webDatabaseCatalog?.count ?? 0}`);
}

/** @param {string} path */
function assertHubWebDatabases(path) {
  const label = "hub-web-databases";
  const s = readJsonGateArtifact(label, path, {
    missingLabel: "report file missing",
    missingHint: ["Run: pnpm run hub:web-databases"],
  });
  if (s.kind !== "chrysalis.hub.web-databases") {
    fail(`${label}: kind must be chrysalis.hub.web-databases`);
  }
  if ((s.count ?? 0) < 20) {
    fail(`${label}: count must be >= 20`);
  }
  if ((s.tier1Count ?? 0) < 10) {
    fail(`${label}: tier1Count must be >= 10`);
  }
  console.log(`${label} OK: count=${s.count} tier1=${s.tier1Count}`);
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
  case "hub-path-knowledge":
    assertHubPathKnowledge(arg0 ?? "reports/ci/hub-path-knowledge.json");
    break;
  case "hub-web-databases":
    assertHubWebDatabases(arg0 ?? "reports/ci/hub-web-databases.json");
    break;
  default:
    console.error(
      "Usage: node scripts/ci-gates.mjs " +
        "<status-migration|tiny-n1-insight|rewrite-pre-xss|tiny-n1-rewrite|confidence-5nines|confidence-trend|confidence-trend-ready|verify-dual-summary|verify-merged-summary|corpus-merge-summary|hub-completion|hub-path-knowledge|hub-web-databases|migration-sidecar-floors|migration-sidecar-floors-release|emit-layout-floors|session-bridge-release> [path]",
    );
    process.exit(1);
}
