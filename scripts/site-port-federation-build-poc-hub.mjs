#!/usr/bin/env node
/** Static VMF POC hub — port, federation, corpus, league, WVB in one page. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadOpenLegacyIndex, loadRegistry, resolveFederationPaths } from "./site-port-federation-lib.mjs";

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

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * @param {object} [opts]
 */
export async function runFederationBuildPocHub(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const mod = await loadWebLlm();
  const paths = resolveFederationPaths(repoRoot);
  const outDir = opts.outDir ?? join(paths.base, "poc");
  mkdirSync(outDir, { recursive: true });

  const index = loadOpenLegacyIndex(repoRoot);
  const registry = loadRegistry(repoRoot);
  const lastDemo = readJson(join(outDir, "last-demo.json"));
  const corpus = readJson(join(paths.corpusDir, "training-shards.v1.json"));
  const wvbFed = readJson(join(paths.base, "wvb/chrysalis.web-verify-benchmark.federation.v1.json"));
  const benchmark = mod.buildWebVerifyBenchmark({ repoRoot });
  const webLlmHub = join(repoRoot, "reports/web-llm/poc/index.html");

  const indexRows = (index.entries ?? [])
    .map((e) => {
      const submitted = (registry?.submissions ?? []).some((s) => s.fixtureId === e.id);
      const badge = submitted ? "pass" : "pending";
      return `<tr><td>${escapeHtml(e.title)}</td><td><code>${escapeHtml(e.id)}</code></td><td>${e.minRoutes}</td><td class="${badge}">${badge}</td></tr>`;
    })
    .join("\n");

  const submissionRows = (registry?.submissions ?? [])
    .map(
      (s) =>
        `<tr><td><code>${escapeHtml(s.id)}</code></td><td>${escapeHtml(s.fixtureId)}</td><td>${escapeHtml(s.contributor)}</td><td>${s.verifyCorrectness}</td></tr>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Chrysalis Site-Port + VMF POC</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 980px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.6rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .stat { border: 1px solid #ccc; border-radius: 8px; padding: 1rem; }
    .stat strong { display: block; font-size: 1.3rem; }
    a.button { display: inline-block; margin: 0.25rem 0.5rem 0.25rem 0; padding: 0.5rem 1rem; background: #1a4; color: #fff; text-decoration: none; border-radius: 6px; }
    a.button.secondary { background: #456; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; }
    .pass { color: #080; font-weight: 600; }
    .pending { color: #888; }
    pre { background: #f6f8fa; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    footer { margin-top: 2rem; color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Site → CWL → LLM + Verified Migration Federation</h1>
  <p>Models propose; WebIR + oracle + verify dispose. Contributors port open fixtures locally and publish <strong>verify-gated shards only</strong> — never raw source.</p>

  <div class="stats">
    <div class="stat"><strong>${index.entries?.length ?? 0}</strong>Open Legacy Index</div>
    <div class="stat"><strong>${registry?.submissions?.length ?? 0}</strong>Shard submissions</div>
    <div class="stat"><strong>${corpus?.shardCount ?? 0}</strong>Federated corpus shards</div>
    <div class="stat"><strong>${wvbFed?.caseCount ?? benchmark.caseCount}</strong>WVB cases</div>
  </div>

  <p>
    ${existsSync(join(paths.leagueDir, "index.html")) ? `<a class="button" href="../league/index.html">Verify League</a>` : ""}
    ${existsSync(join(paths.corpusDir, "training-shards.v1.jsonl")) ? `<a class="button secondary" href="../corpus/training-shards.v1.jsonl">Federated corpus</a>` : ""}
    ${existsSync(webLlmHub) ? `<a class="button secondary" href="../../web-llm/poc/index.html">Web-LLM POC hub</a>` : ""}
    ${existsSync(join(repoRoot, "reports/migration-evidence/poc/index.html")) ? `<a class="button secondary" href="../../migration-evidence/poc/index.html">Migration Evidence hub</a>` : ""}
  </p>

  <h2>Open Legacy Index</h2>
  <table>
    <thead><tr><th>Title</th><th>ID</th><th>Min routes</th><th>Submitted</th></tr></thead>
    <tbody>${indexRows || `<tr><td colspan="4" class="pending">Run federation:demo</td></tr>`}</tbody>
  </table>

  <h2>Shard submissions</h2>
  <table>
    <thead><tr><th>ID</th><th>Fixture</th><th>Contributor</th><th>Verify</th></tr></thead>
    <tbody>${submissionRows || `<tr><td colspan="4" class="pending">No submissions yet</td></tr>`}</tbody>
  </table>

  <h2>One-command demo</h2>
  <pre>pnpm run federation:demo
pnpm run hub:site-port-federation-poc-close-smoke</pre>

  <footer>Generated ${new Date().toISOString()} · last demo ok: ${lastDemo?.ok ?? "—"}</footer>
</body>
</html>`;

  const indexPath = join(outDir, "index.html");
  writeFileSync(indexPath, html, "utf8");

  return {
    ok: true,
    indexPath,
    openLegacyCount: index.entries?.length ?? 0,
    submissionCount: registry?.submissions?.length ?? 0,
    corpusShardCount: corpus?.shardCount ?? 0,
    wvbCaseCount: wvbFed?.caseCount ?? benchmark.caseCount,
    leagueLinked: existsSync(join(paths.leagueDir, "index.html")),
  };
}

async function main() {
  const r = await runFederationBuildPocHub();
  console.log(JSON.stringify(r, null, 2));
}

if (process.argv[1]?.includes("site-port-federation-build-poc-hub")) main();
