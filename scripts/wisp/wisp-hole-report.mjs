#!/usr/bin/env node
/**
 * Honest markup hole report after origin convert (D6442–D6444).
 * Never force-settles — census only.
 *
 *   node scripts/wisp/wisp-hole-report.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  countCwlMarkupHoles,
  classifyCwlHoleBuckets,
} from "../lib/cwl-hole-metrics.mjs";

export const HOLE_REPORT_KIND = "chrysalis.wisp.hole-report";
export const HOLE_REPORT_SCHEMA_VERSION = 1;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const routesPath = join(root, "fixtures/hub-wisp-management/routes.cwl");
const reportPath = join(root, "reports/wisp/hole-report.json");

/**
 * @param {string} cwl
 */
function holesByPage(cwl) {
  /** @type {Record<string, { total: number, reasons: Record<string, number> }>} */
  const byPage = {};
  const pageRe =
    /@page\s+GET\s+"([^"]+)"[\s\S]*?return\s+html\s+("(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)/g;
  for (const m of cwl.matchAll(pageRe)) {
    const path = m[1];
    let html = m[2];
    try {
      html = JSON.parse(html.startsWith("`") ? JSON.stringify(html.slice(1, -1)) : html);
    } catch {
      html = html.replace(/^["`]|["`]$/g, "").replace(/\\"/g, '"').replace(/\\n/g, "\n");
    }
    const metrics = countCwlMarkupHoles(typeof html === "string" ? html : String(html));
    if (metrics.total === 0) continue;
    byPage[path] = { total: metrics.total, reasons: metrics.reasons };
  }
  return byPage;
}

/**
 * Detail samples: hole reason → up to N detail attrs
 * @param {string} cwl
 * @param {number} [limit]
 */
function detailSamples(cwl, limit = 40) {
  const unescaped = cwl.replace(/\\"/g, '"');
  /** @type {Record<string, string[]>} */
  const samples = {};
  for (const m of unescaped.matchAll(
    /data-cwl-hole="([^"]+)"(?:\s+data-cwl-hole-detail="([^"]*)")?/g,
  )) {
    const reason = m[1];
    const detail = m[2] ?? "";
    if (!samples[reason]) samples[reason] = [];
    if (samples[reason].length < limit && detail && !samples[reason].includes(detail)) {
      samples[reason].push(detail);
    }
  }
  return samples;
}

export function writeWispHoleReport(opts = {}) {
  const routes = opts.routesPath ?? routesPath;
  const out = opts.reportPath ?? reportPath;
  if (!existsSync(routes)) {
    return { kind: HOLE_REPORT_KIND, schemaVersion: 1, ok: false, skip: "missing-routes" };
  }
  const cwl = readFileSync(routes, "utf8");
  const metrics = countCwlMarkupHoles(cwl);
  const buckets = classifyCwlHoleBuckets(metrics.reasons);
  const byPage = holesByPage(cwl);
  const topPages = Object.entries(byPage)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 40)
    .map(([path, v]) => ({ path, total: v.total, reasons: v.reasons }));

  const report = {
    kind: HOLE_REPORT_KIND,
    schemaVersion: HOLE_REPORT_SCHEMA_VERSION,
    ok: true,
    generatedAt: new Date().toISOString(),
    laws: ["D6442", "D6443", "D6444", "D6445", "D6446"],
    note: "Honest census after structural origin convert. No force-settle (holes over invention).",
    routesPath: routes.replace(/\\/g, "/"),
    total: metrics.total,
    reasons: metrics.reasons,
    buckets,
    fakeIf: metrics.fakeIf,
    fakeEach: metrics.fakeEach,
    settledIfLeft: metrics.settledIfLeft,
    pageCountWithHoles: Object.keys(byPage).length,
    topPages,
    detailSamples: detailSamples(cwl),
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  report.reportPath = out.replace(/\\/g, "/");
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = writeWispHoleReport();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}
