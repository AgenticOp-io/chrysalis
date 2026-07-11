#!/usr/bin/env node
/** Live IS hit-rate operator dashboard (G9650 / D6385; G9760 live provenance). */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRate(r) {
  if (r == null || Number.isNaN(r)) return "—";
  return `${(r * 100).toFixed(1)}%`;
}

/** @param {object} [opts] */
export async function runWebLlmBuildLiveAnalyticsHub(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const analyticsPath =
    opts.analyticsPath ?? join(repoRoot, "reports/web-llm/shorthand/is-live-analytics.v1.json");
  const outDir = opts.outDir ?? join(repoRoot, "reports/web-llm/operator-evidence/poc");
  mkdirSync(outDir, { recursive: true });

  const analytics = existsSync(analyticsPath)
    ? mod.loadIsLiveAnalytics(analyticsPath)
    : null;
  const domainCount = mod.countOperatorEvidenceDomains(repoRoot);
  const salienceV2Ready = mod.salienceV2ProductionReady(domainCount);
  const productMetricsReady = mod.productHitRateSampleReady(analytics?.jobCount ?? 0);
  const liveVerifiedJobCount = analytics?.liveVerifiedJobCount ?? 0;
  const seedJobCount = analytics?.seedJobCount ?? 0;
  const productLiveReady = mod.productHitRateLiveReady?.(liveVerifiedJobCount) ?? liveVerifiedJobCount >= 50;
  const minJobs = mod.PRODUCT_HIT_RATE_MIN_JOBS;
  const minLiveJobs = mod.PRODUCT_HIT_RATE_LIVE_MIN_JOBS ?? 50;
  const minDomains = mod.SALIENCE_V2_MIN_OPERATOR_DOMAINS;

  const jobRows = (analytics?.jobs ?? [])
    .slice(0, 24)
    .map(
      (j) =>
        `<tr><td><code>${escapeHtml(j.domainId)}</code></td><td>${escapeHtml(j.outcome)}</td><td>${escapeHtml(j.evidenceSource ?? "—")}</td><td>${j.verifyCostMs ?? "—"}</td><td>${j.skipLlm === true ? "yes" : "no"}</td></tr>`,
    )
    .join("\n");

  const readiness = `<ul>
    <li>Salience v2 production: <strong>${salienceV2Ready ? "ON" : "OFF"}</strong> (${domainCount}/${minDomains} operator-evidence domains)</li>
    <li>Product sample floor: <strong>${productMetricsReady ? "READY" : "INSUFFICIENT SAMPLE"}</strong> (${analytics?.jobCount ?? 0}/${minJobs} jobs — may include seed)</li>
    <li>Live hit-rate claim: <strong>${productLiveReady ? "READY" : "SEED / INSUFFICIENT LIVE"}</strong> (${liveVerifiedJobCount}/${minLiveJobs} hub-convert-verify; ${seedJobCount} seed)</li>
    <li>Analytics scope: <code>${escapeHtml(analytics?.scope ?? "none")}</code></li>
  </ul>`;

  const stats =
    analytics && analytics.kind === mod.IS_LIVE_ANALYTICS_KIND
      ? `<div class="stats">
    <div class="stat"><strong>${formatRate(analytics.hitRate)}</strong>hit rate</div>
    <div class="stat"><strong>${formatRate(analytics.nearMissRate)}</strong>near-miss</div>
    <div class="stat"><strong>${formatRate(analytics.missRate)}</strong>miss</div>
    <div class="stat"><strong>${analytics.verifyCostMsP50 ?? "—"}</strong>verify p50 ms</div>
    <div class="stat"><strong>${analytics.jobCount ?? 0}</strong>jobs</div>
    <div class="stat"><strong>${liveVerifiedJobCount}</strong>live verify</div>
    <div class="stat"><strong>${seedJobCount}</strong>seed</div>
  </div>`
      : `<p class="note">No live analytics artifact. Run <code>pnpm run web-llm:aggregate-live-analytics</code> or seed operator evidence.</p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Chrysalis IS Live Analytics</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .stat { border: 1px solid #ccc; border-radius: 8px; padding: 1rem; }
    .stat strong { display: block; font-size: 1.25rem; }
    .note { color: #444; }
    .badge-on { color: #063; font-weight: bold; }
    .badge-off { color: #a40; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.4rem; border-bottom: 1px solid #ddd; }
    a.button { display: inline-block; margin: 0.5rem 0.5rem 0 0; padding: 0.5rem 1rem; background: #156; color: #fff; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>IS Live Analytics</h1>
  <p>Operator hit / near-miss / miss + verify cost. Seeded jobs do not claim live hit-rate READY. Oracle still disposes — this dashboard is evidence only.</p>
  ${readiness}
  ${stats}
  <h2>Recent jobs</h2>
  <table><thead><tr><th>Domain</th><th>Outcome</th><th>Evidence</th><th>Verify ms</th><th>Skip LLM</th></tr></thead>
  <tbody>${jobRows || "<tr><td colspan=\"5\">No jobs</td></tr>"}</tbody></table>
  <p>
    <a class="button" href="/reports/web-llm/shorthand/poc/">Intelligence Shorthand hub</a>
    <a class="button" href="/reports/migration-evidence/poc/">Migration Evidence</a>
  </p>
</body>
</html>`;

  const indexPath = join(outDir, "index.html");
  writeFileSync(indexPath, html, "utf8");

  return {
    kind: "chrysalis.web-llm.live-analytics-hub",
    schemaVersion: 2,
    ok: existsSync(indexPath),
    indexPath,
    domainCount,
    salienceV2Ready,
    productMetricsReady,
    productLiveReady,
    jobCount: analytics?.jobCount ?? 0,
    seedJobCount,
    liveVerifiedJobCount,
  };
}

async function main() {
  const result = await runWebLlmBuildLiveAnalyticsHub();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

if (process.argv[1]?.includes("web-llm-build-live-analytics-hub")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
