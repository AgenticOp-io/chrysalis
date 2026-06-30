#!/usr/bin/env node
/** Static POC hub page linking WVB, leaderboard, WISP demo, and last agent run. */
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

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function runWebLlmBuildPocHub(opts = {}) {
  const mod = await loadWebLlm();
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const outDir = opts.outDir ?? join(repoRoot, "reports/web-llm/poc");
  mkdirSync(outDir, { recursive: true });

  const catalog = mod.loadPocScenarioCatalog(repoRoot);
  const lastRun = readJson(join(outDir, "last-run.json"));
  const benchmark = mod.buildWebVerifyBenchmark({ repoRoot });
  const summary = mod.summarizeWebVerifyBenchmark(benchmark);
  const boardPath = join(repoRoot, "reports/web-llm/leaderboard/index.html");
  const datasetDir = join(repoRoot, "reports/web-llm/dataset");
  const demoUrl = mod.resolveWispDemoBaseUrl(repoRoot) ?? catalog.demoUrl ?? "#";

  const scenarioRows = (lastRun?.scenarios ?? []).map((s) => {
    const badge = s.ok === true ? "pass" : "fail";
    return `<tr><td>${escapeHtml(s.title ?? s.id)}</td><td><code>${escapeHtml(s.id)}</code></td><td class="${badge}">${badge}</td></tr>`;
  });

  const liveScenario = lastRun?.scenarios?.find((s) => s.id === "wisp-gce-live-anchors");
  const liveStep = liveScenario?.stepResults?.find((s) => s.step === "check:wisp-gce-live-anchors");
  const sessionsPath = join(outDir, "sessions.jsonl");
  let trajectoryCount = 0;
  if (existsSync(sessionsPath)) {
    trajectoryCount = readFileSync(sessionsPath, "utf8").trim().split("\n").filter(Boolean).length;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Chrysalis Web-LLM POC</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.6rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .stat { border: 1px solid #ccc; border-radius: 8px; padding: 1rem; }
    .stat strong { display: block; font-size: 1.4rem; }
    a.button { display: inline-block; margin: 0.25rem 0.5rem 0.25rem 0; padding: 0.5rem 1rem; background: #1a4; color: #fff; text-decoration: none; border-radius: 6px; }
    a.button.secondary { background: #456; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; }
    .pass { color: #080; font-weight: 600; }
    .fail { color: #c00; font-weight: 600; }
    .skip { color: #886; font-weight: 600; }
    .pending { color: #888; }
    .demo-creds { background: #f6f8fa; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    footer { margin-top: 2rem; color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Chrysalis Web-LLM POC</h1>
  <p>Models propose; WebIR + oracle + verify dispose. Benchmark, verify-gated agent trajectories, and the WISP CWL showcase on GCE.</p>

  <div class="stats">
    <div class="stat"><strong>${benchmark.caseCount}</strong>WVB cases</div>
    <div class="stat"><strong>${lastRun?.passCount ?? "—"}</strong>scenarios passed</div>
    <div class="stat"><strong>${Object.keys(summary.tiers ?? {}).length}</strong>WVB tiers</div>
    <div class="stat"><strong>${trajectoryCount || "—"}</strong>trajectory records</div>
  </div>

  <div class="demo-creds">
    <strong>WISP live demo</strong> — <a href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener">${escapeHtml(demoUrl)}</a><br />
    Login: <code>demo@wisptools.io</code> / <code>WisptoolsDemo2026!</code>
    ${liveStep?.skip ? `<br />Live probe: <span class="skip">${escapeHtml(liveStep.skip)}</span> (set <code>CHRYSALIS_WISP_POC_LIVE=1</code> for strict)` : ""}
  </div>

  <p>
    <a class="button" href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener">Open WISP demo</a>
    ${existsSync(boardPath) ? `<a class="button secondary" href="../leaderboard/index.html">WVB leaderboard</a>` : ""}
  </p>

  <h2>Agent scenarios</h2>
  <table>
    <thead><tr><th>Scenario</th><th>ID</th><th>Status</th></tr></thead>
    <tbody>${scenarioRows.length ? scenarioRows.join("\n") : `<tr><td colspan="3" class="pending">Run <code>pnpm run web-llm:demo</code></td></tr>`}</tbody>
  </table>

  <h2>One-command demo</h2>
  <pre>pnpm run web-llm:demo
CHRYSALIS_WISP_POC_LIVE=1 pnpm run hub:wisp-poc-live-smoke</pre>

  <footer>Generated ${new Date().toISOString()} · ${escapeHtml(catalog.agenda ?? "website-management")}</footer>
</body>
</html>`;

  const indexPath = join(outDir, "index.html");
  writeFileSync(indexPath, html, "utf8");
  return {
    ok: true,
    indexPath,
    caseCount: benchmark.caseCount,
    lastRunOk: lastRun?.ok ?? null,
    demoUrl,
    trajectoryCount,
    leaderboardLinked: existsSync(boardPath),
    datasetDir: existsSync(datasetDir) ? datasetDir : null,
    liveScenarioOk: liveScenario?.ok ?? null,
  };
}

async function main() {
  const r = await runWebLlmBuildPocHub();
  console.log(JSON.stringify(r, null, 2));
}

if (process.argv[1]?.includes("web-llm-build-poc-hub")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
