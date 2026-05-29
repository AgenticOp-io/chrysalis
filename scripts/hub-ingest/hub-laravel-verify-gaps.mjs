#!/usr/bin/env node
/**
 * Laravel flagship verify divergences → prioritized ingest backlog (G104).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { VERIFY_DIVERGENCE_PLAYBOOKS } from "./hub-verify-playbooks.mjs";

export const HUB_LARAVEL_VERIFY_GAPS_KIND = "chrysalis.hub.laravel-verify-gaps";
export const HUB_LARAVEL_VERIFY_GAPS_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const DEFAULT_REPORT_DIRS = [
  join(scriptRoot, "reports/verify-flagship-laravel-full"),
  join(scriptRoot, "reports/verify"),
  join(scriptRoot, "fixtures/ci/tiny-blog-verify-for-status"),
];

/**
 * @param {string} reportDir
 * @returns {string | null}
 */
export function resolveFlagshipVerifySummaryPath(reportDir) {
  const candidates = [
    join(reportDir, "hono", "summary.json"),
    join(reportDir, "fastify", "summary.json"),
    join(reportDir, "summary.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * @param {string} traceFileName e.g. `GET_chrysalis_pdo_count.json`
 */
export function routeLabelFromTraceFile(traceFileName) {
  const base = traceFileName.replace(/\.json$/i, "");
  const idx = base.indexOf("_");
  if (idx < 0) return base;
  const method = base.slice(0, idx);
  const path = `/${base.slice(idx + 1).replace(/_/g, "-")}`;
  return `${method} ${path}`;
}

/**
 * Scan per-route trace JSON under `hono/` (or report root) for `ok: false`.
 *
 * @param {string} reportDir
 * @returns {Array<{ route: string, kinds: string[], details: string[] }>}
 */
export function loadPerRouteTraceFailures(reportDir) {
  const traceDir = existsSync(join(reportDir, "hono"))
    ? join(reportDir, "hono")
    : reportDir;
  if (!existsSync(traceDir)) return [];
  /** @type {Array<{ route: string, kinds: string[], details: string[] }>} */
  const failed = [];
  for (const name of readdirSync(traceDir)) {
    if (!name.endsWith(".json") || name === "summary.json") continue;
    const raw = JSON.parse(readFileSync(join(traceDir, name), "utf8"));
    const frames = Array.isArray(raw) ? raw : [raw];
    const route = routeLabelFromTraceFile(name);
    const kinds = new Set();
    const details = [];
    let anyFail = false;
    for (const frame of frames) {
      if (frame.ok !== false) continue;
      anyFail = true;
      for (const d of frame.divergences ?? []) {
        if (d.kind) kinds.add(d.kind);
        if (d.detail) details.push(d.detail);
        if (d.message) details.push(d.message);
      }
      if (kinds.size === 0 && frame.reason) kinds.add(String(frame.reason));
    }
    if (!anyFail) continue;
    failed.push({ route, kinds: [...kinds], details });
  }
  return failed;
}

/**
 * @param {string} reportDir
 */
export function loadVerifyReportsFromDir(reportDir) {
  const summaryPath = resolveFlagshipVerifySummaryPath(reportDir);
  if (!summaryPath) {
    const traceFailed = loadPerRouteTraceFailures(reportDir);
    if (traceFailed.length === 0) {
      return { available: false, reportDir, endpoints: [], aggregate: null };
    }
    return {
      available: true,
      reportDir,
      summaryPath: null,
      aggregate: { correctness: null, framesTotal: traceFailed.length, framesPassed: 0 },
      failed: traceFailed,
      source: "per-route-traces",
    };
  }
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  /** @type {Array<{ route: string, kinds: string[], details: string[] }>} */
  const failed = [];
  for (const ep of summary.endpoints ?? []) {
    for (const d of ep.divergences ?? []) {
      failed.push({
        route: ep.route,
        kinds: d.kinds ?? [],
        details: d.details ?? [],
      });
    }
  }
  const traceFailed = loadPerRouteTraceFailures(reportDir);
  const merged = [...failed];
  const seen = new Set(failed.map((f) => f.route));
  for (const row of traceFailed) {
    if (seen.has(row.route)) continue;
    seen.add(row.route);
    merged.push(row);
  }
  return {
    available: true,
    reportDir,
    summaryPath,
    aggregate: summary.aggregate ?? null,
    failed: merged,
    source: "summary",
  };
}

/**
 * @param {object} opts
 */
export function buildLaravelVerifyGapsReport(opts = {}) {
  const reportDirs = opts.reportDirs ?? DEFAULT_REPORT_DIRS;
  let loaded = null;
  for (const dir of reportDirs) {
    const r = loadVerifyReportsFromDir(dir);
    if (r.available) {
      loaded = r;
      break;
    }
  }

  /** @type {Map<string, { kind: string, routes: Set<string>, count: number }>} */
  const byKind = new Map();
  for (const row of loaded?.failed ?? []) {
    for (const kind of row.kinds) {
      let e = byKind.get(kind);
      if (!e) {
        e = { kind, routes: new Set(), count: 0 };
        byKind.set(kind, e);
      }
      e.count += 1;
      e.routes.add(row.route);
    }
  }

  const backlog = [...byKind.values()]
    .sort((a, b) => b.count - a.count)
    .map((e) => {
      const playbook = VERIFY_DIVERGENCE_PLAYBOOKS[e.kind];
      return {
        divergenceKind: e.kind,
        failedTraceRows: e.count,
        routes: [...e.routes].sort(),
        playbook: playbook
          ? { title: playbook.title, ingestHints: playbook.ingestHints ?? [], steps: playbook.steps }
          : null,
        priority: e.count >= 3 ? "P0" : e.count >= 1 ? "P1" : "P2",
        ingestOwner: "packages/ingest",
      };
    });

  const templateRoutes = existsSync(join(scriptRoot, "flagship/laravel-full/chrysalis-templates/chrysalis.routes.json"))
    ? JSON.parse(
        readFileSync(join(scriptRoot, "flagship/laravel-full/chrysalis-templates/chrysalis.routes.json"), "utf8"),
      ).routes?.length ?? null
    : null;

  return {
    kind: HUB_LARAVEL_VERIFY_GAPS_KIND,
    schemaVersion: HUB_LARAVEL_VERIFY_GAPS_SCHEMA_VERSION,
    ok: loaded?.available === true,
    skipped: loaded ? null : "no-verify-report",
    verify: loaded
      ? {
          reportDir: loaded.reportDir,
          correctness: loaded.aggregate?.correctness ?? null,
          failedTraceRows: loaded.failed.length,
        }
      : null,
    flagship: {
      scaffold: "flagship/chrysalis-laravel-work",
      templateRouteCount: templateRoutes,
      verifyScript: "pnpm run verify:laravel-full",
    },
    backlog,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let jsonOut = null;
  let reportDir = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--report-dir" && argv[i + 1]) reportDir = resolve(argv[++i]);
  }
  return { jsonOut, reportDir };
}

async function main() {
  const { jsonOut, reportDir } = parseArgs(process.argv);
  const report = buildLaravelVerifyGapsReport({
    reportDirs: reportDir ? [reportDir] : DEFAULT_REPORT_DIRS,
  });
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && report.skipped) process.exit(0);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
