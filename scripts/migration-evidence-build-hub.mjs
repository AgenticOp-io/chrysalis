#!/usr/bin/env node
/** Static Migration Evidence POC hub — links Site-Port, VMF, and web-LLM programs. */
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

function linkIfExists(label, relPath, className = "button secondary") {
  return existsSync(relPath)
    ? `<a class="${className}" href="${relPath}">${escapeHtml(label)}</a>`
    : `<span class="pending">${escapeHtml(label)} (pending)</span>`;
}

/**
 * @param {object} [opts]
 */
export async function runMigrationEvidenceBuildHub(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const outDir = opts.outDir ?? join(repoRoot, "reports/migration-evidence/poc");
  mkdirSync(outDir, { recursive: true });

  const lastDemo = opts.demoState ?? readJson(join(outDir, "last-demo.json"));
  const federationDemo = readJson(join(repoRoot, "reports/federation/poc/last-demo.json"));
  const webLlmRun = readJson(join(repoRoot, "reports/web-llm/poc/last-run.json"));
  const benchmark = mod.buildWebVerifyBenchmark({ repoRoot });
  const index = readJson(join(repoRoot, "fixtures/site-port-federation/open-legacy-index.v1.json"));
  const registry = readJson(join(repoRoot, "reports/federation/registry.v1.json"));
  const nightly = readJson(join(repoRoot, "reports/open-legacy-index/nightly/latest.json"));
  const shorthandBundle = readJson(join(repoRoot, "reports/web-llm/shorthand/intelligence-shorthands.v1.json"));
  const demoUrl = mod.resolveWispDemoBaseUrl(repoRoot);

  const programRows = [
    {
      id: "site-port",
      title: "Site → CWL → LLM",
      gate: "G8400/G8410",
      ok: lastDemo?.sitePort?.ok ?? lastDemo?.vmf?.ok ?? federationDemo?.ok ?? null,
      hub: "../federation/poc/index.html",
    },
    {
      id: "vmf",
      title: "Verified Migration Federation",
      gate: "G8470",
      ok: lastDemo?.vmf?.ok ?? federationDemo?.ok ?? null,
      hub: "../federation/poc/index.html",
    },
    {
      id: "web-llm",
      title: "Open web-LLM agent POC",
      gate: "G8300",
      ok: lastDemo?.webLlm?.ok ?? webLlmRun?.ok ?? null,
      hub: "../web-llm/poc/index.html",
    },
    {
      id: "intelligence-shorthand",
      title: "Intelligence Shorthand (CPU)",
      gate: "G8560",
      ok:
        (shorthandBundle?.summary?.count ?? 0) >= 1 &&
        existsSync(join(outDir, "../web-llm/shorthand/poc/index.html"))
          ? true
          : shorthandBundle
            ? false
            : null,
      hub: "../web-llm/shorthand/poc/index.html",
    },
  ];

  const rows = programRows
    .map((p) => {
      const badge =
        p.ok === true ? "pass" : p.ok === false ? "fail" : "pending";
      const hubPath = join(outDir, p.hub);
      const hubLink = existsSync(hubPath)
        ? `<a href="${p.hub}">open hub</a>`
        : `<span class="pending">pending</span>`;
      return `<tr><td>${escapeHtml(p.title)}</td><td><code>${escapeHtml(p.gate)}</code></td><td class="${badge}">${badge}</td><td>${hubLink}</td></tr>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Chrysalis Migration Evidence POC</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1024px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.7rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .stat { border: 1px solid #ccc; border-radius: 8px; padding: 1rem; }
    .stat strong { display: block; font-size: 1.35rem; }
    a.button { display: inline-block; margin: 0.25rem 0.5rem 0.25rem 0; padding: 0.5rem 1rem; background: #1a4; color: #fff; text-decoration: none; border-radius: 6px; }
    a.button.secondary { background: #456; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; }
    .pass { color: #080; font-weight: 600; }
    .fail { color: #a00; font-weight: 600; }
    .pending { color: #888; }
    pre { background: #f6f8fa; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    footer { margin-top: 2rem; color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Migration Evidence POC</h1>
  <p>Hub as migration OS: verify-gated evidence from <strong>port-site</strong>, <strong>federation</strong>, and <strong>web-LLM agent</strong> programs. Models propose; WebIR + oracle + verify dispose.</p>

  <div class="stats">
    <div class="stat"><strong>${index?.entries?.length ?? 0}</strong>Open Legacy Index</div>
    <div class="stat"><strong>${registry?.submissions?.length ?? 0}</strong>VMF shard submissions</div>
    <div class="stat"><strong>${benchmark.caseCount}</strong>WVB cases</div>
    <div class="stat"><strong>${webLlmRun?.passCount ?? "—"}</strong>Agent scenarios passed</div>
    <div class="stat"><strong>${shorthandBundle?.summary?.count ?? "—"}</strong>IS shorthands</div>
    <div class="stat"><strong>${shorthandBundle?.summary?.compressionVs7BTotal ? `${shorthandBundle.summary.compressionVs7BTotal.toLocaleString()}×` : "—"}</strong>vs 14 GB 7B</div>
    <div class="stat"><strong class="${nightly?.ok === true ? "pass" : "pending"}">${nightly?.ok === true ? "pass" : "—"}</strong>Nightly matrix</div>
  </div>

  <p>
    ${linkIfExists("VMF POC hub", join(outDir, "../federation/poc/index.html"), "button")}
    ${linkIfExists("Web-LLM POC hub", join(outDir, "../web-llm/poc/index.html"), "button secondary")}
    ${linkIfExists("Verify League", join(outDir, "../federation/league/index.html"), "button secondary")}
    ${linkIfExists("Intelligence Shorthand", join(outDir, "../web-llm/shorthand/poc/index.html"), "button secondary")}
    ${linkIfExists("Nightly report", join(outDir, "../open-legacy-index/nightly/latest.json"), "button secondary")}
    ${demoUrl ? `<a class="button secondary" href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener">WISP live demo</a>` : ""}
  </p>

  <h2>Programs</h2>
  <table>
    <thead><tr><th>Program</th><th>Gate</th><th>Status</th><th>Hub</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>One-command demo</h2>
  <pre>pnpm run migration-evidence:demo
pnpm run federation:serve
pnpm run hub:migration-evidence-poc-close-smoke</pre>

  <footer>Generated ${new Date().toISOString()} · last demo ok: ${lastDemo?.ok ?? "—"}</footer>
</body>
</html>`;

  const indexPath = join(outDir, "index.html");
  writeFileSync(indexPath, html, "utf8");

  return {
    ok: true,
    indexPath,
    openLegacyCount: index?.entries?.length ?? 0,
    submissionCount: registry?.submissions?.length ?? 0,
    wvbCaseCount: benchmark.caseCount,
    webLlmPassCount: webLlmRun?.passCount ?? null,
    programsGreen: programRows.filter((p) => p.ok === true).length,
    programCount: programRows.length,
  };
}

async function main() {
  const r = await runMigrationEvidenceBuildHub();
  console.log(JSON.stringify(r, null, 2));
}

if (process.argv[1]?.includes("migration-evidence-build-hub")) main();
