/**
 * Shared verify divergence → ingest backlog helpers (G147).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { VERIFY_DIVERGENCE_PLAYBOOKS } from "./hub-verify-playbooks.mjs";

/**
 * @param {string} reportDir
 * @returns {string | null}
 */
export function resolveVerifySummaryPath(reportDir) {
  const candidates = [
    join(reportDir, "hono", "summary.json"),
    join(reportDir, "fastify", "summary.json"),
    join(reportDir, "nextjs", "summary.json"),
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
 * @param {string} reportDir
 * @returns {Array<{ route: string, kinds: string[], details: string[] }>}
 */
export function loadPerRouteTraceFailures(reportDir) {
  const traceDir = existsSync(join(reportDir, "hono"))
    ? join(reportDir, "hono")
    : existsSync(join(reportDir, "fastify"))
      ? join(reportDir, "fastify")
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
  const summaryPath = resolveVerifySummaryPath(reportDir);
  if (!summaryPath) {
    const traceFailed = loadPerRouteTraceFailures(reportDir);
    if (traceFailed.length === 0) {
      return { available: false, reportDir, endpoints: [], aggregate: null, failed: [] };
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
 * @param {Array<{ route: string, kinds: string[], details: string[] }>} failed
 */
export function buildVerifyGapsBacklog(failed) {
  /** @type {Map<string, { kind: string, routes: Set<string>, count: number }>} */
  const byKind = new Map();
  for (const row of failed) {
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
  return [...byKind.values()]
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
}

/**
 * @param {string[]} reportDirs
 */
export function loadFirstAvailableVerifyReport(reportDirs) {
  for (const dir of reportDirs) {
    const r = loadVerifyReportsFromDir(dir);
    if (r.available) return r;
  }
  return null;
}

/**
 * Merge verify failures from every available report dir (repo-wide laravel backlog).
 * @param {string[]} reportDirs
 */
export function loadMergedVerifyReports(reportDirs) {
  /** @type {Array<{ route: string, kinds: string[], details: string[] }>} */
  const failed = [];
  /** @type {ReturnType<typeof loadVerifyReportsFromDir> | null} */
  let primary = null;
  const seen = new Set();
  for (const dir of reportDirs) {
    const r = loadVerifyReportsFromDir(dir);
    if (!r.available) continue;
    if (!primary || r.failed.length > 0) primary = r;
    for (const row of r.failed) {
      const key = `${row.route}::${row.kinds.join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      failed.push(row);
    }
  }
  if (!primary) return null;
  return {
    ...primary,
    failed,
    source: failed.length > 0 ? "merged" : primary.source,
  };
}
