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
 * File-backed JSON gates resolve paths, print missing/invalid JSON hints via readJsonGateArtifact
 * (also tiny-n1-rewrite report JSON, migration-sidecar-floors sidecar JSON). status-migration validates stdin JSON.
 *   node scripts/ci-gates.mjs migration-sidecar-floors [reports/migration]
 *   node scripts/ci-gates.mjs session-bridge-release
 *
 * Env: VERIFY_THRESHOLD (default 0.95) for status-migration.
 * Env: CHRYSALIS_IDIOMATICITY_MIN (0..1) and/or CHRYSALIS_RESIDUAL_LEGACY_MAX (0..100) for
 * migration-sidecar-floors; if neither is set, the gate skips. When set, the corresponding
 * JSON file under reports/migration must exist and satisfy the floor/ceiling.
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
  const recent = r.entries.slice(-required);
  if (recent.length < required) {
    if (allowWarmup) {
      console.log(`confidence-trend warmup: have ${recent.length}/${required} entries`);
      return;
    }
    fail(`confidence-trend: insufficient history ${recent.length}/${required}`);
  }
  for (const e of recent) {
    if (e.exitCode !== 0) fail(`confidence-trend: non-zero exitCode at ${e.timestamp}`);
    if (e.semanticChecks !== "passed") fail(`confidence-trend: semantic check failed at ${e.timestamp}`);
    if (e.metamorphicChecks !== "passed") fail(`confidence-trend: metamorphic check failed at ${e.timestamp}`);
    if (e.driftDetected === true) fail(`confidence-trend: drift detected at ${e.timestamp}`);
    if (e.riskCovered !== true) fail(`confidence-trend: risk coverage regressed at ${e.timestamp}`);
    if (e.crossBackendParityOk === false) {
      fail(`confidence-trend: cross-backend parity failed at ${e.timestamp}`);
    }
    if (e.matrixCrossBackendParityOk === false) {
      fail(`confidence-trend: matrix cross-backend parity failed at ${e.timestamp}`);
    }
    if (Number(e.minCorrectness ?? 0) + 1e-9 < minConfidence) {
      fail(`confidence-trend: minCorrectness ${e.minCorrectness} < ${minConfidence} at ${e.timestamp}`);
    }
  }
  console.log(`confidence-trend OK: streak=${required} minConfidence=${minConfidence}`);
}

function assertConfidenceTrendReady(path) {
  const required = Number.parseInt(process.env.CONFIDENCE_STREAK_REQUIRED ?? "30", 10);
  const r = readJsonGateArtifact("confidence-trend-ready", path, {
    missingLabel: "history file missing",
    missingHint: ["Append history entries from flagship verify runs (see scripts/status-flagship-laravel-full.mjs)."],
  });
  if (!r || !Array.isArray(r.entries)) {
    fail("confidence-trend-ready: invalid history payload");
  }
  const count = r.entries.length;
  if (count < required) {
    fail(`confidence-trend-ready: insufficient history ${count}/${required}`);
  }
  console.log(`confidence-trend-ready: strict mode ready (${count}/${required})`);
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
  case "migration-sidecar-floors":
    assertMigrationSidecarFloors(arg0);
    break;
  case "migration-sidecar-floors-release":
    assertMigrationSidecarFloorsRelease(arg0);
    break;
  case "session-bridge-release":
    assertSessionBridgeRelease();
    break;
  default:
    console.error(
      "Usage: node scripts/ci-gates.mjs " +
        "<status-migration|tiny-n1-insight|rewrite-pre-xss|tiny-n1-rewrite|confidence-5nines|confidence-trend|confidence-trend-ready|verify-dual-summary|migration-sidecar-floors|migration-sidecar-floors-release|session-bridge-release> [path]",
    );
    process.exit(1);
}
