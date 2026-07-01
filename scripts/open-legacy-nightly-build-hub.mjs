#!/usr/bin/env node
/** Static HTML hub for Open Legacy Index nightly verify matrix (G8510). */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {object} [opts]
 */
export function runOpenLegacyNightlyBuildHub(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const outDir = opts.outDir ?? join(repoRoot, "reports/open-legacy-index/nightly");
  mkdirSync(outDir, { recursive: true });

  const reportPath = join(outDir, "latest.json");
  if (!existsSync(reportPath)) {
    return { ok: false, skip: "missing-latest-json", outDir };
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const results = report.matrix?.results ?? [];
  const rows = results
    .map((r) => {
      const badge = r.ok === true ? "pass" : "fail";
      return `<tr><td><code>${escapeHtml(r.id)}</code></td><td class="${badge}">${badge}</td><td>${r.routeCount ?? "—"}</td><td>${r.correctness ?? "—"}</td><td>${escapeHtml(r.verifyMode ?? r.skip ?? "—")}</td></tr>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Open Legacy Index — Nightly Verify Matrix</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.6rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin: 1.25rem 0; }
    .stat { border: 1px solid #ccc; border-radius: 8px; padding: 0.85rem; }
    .stat strong { display: block; font-size: 1.25rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; }
    .pass { color: #080; font-weight: 600; }
    .fail { color: #a00; font-weight: 600; }
    a { color: #06c; }
    footer { margin-top: 2rem; color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Open Legacy Index — Nightly Verify Matrix</h1>
  <p>Verify-gated port-site replay across all Open Legacy Index fixtures. Gate <strong>G8510</strong>.</p>

  <div class="stats">
    <div class="stat"><strong>${report.indexEntryCount ?? results.length}</strong>Index entries</div>
    <div class="stat"><strong class="${report.ok === true ? "pass" : "fail"}">${report.ok === true ? "pass" : "fail"}</strong>Matrix</div>
    <div class="stat"><strong class="${report.publish?.ok === true ? "pass" : "fail"}">${report.publish?.ok === true ? "pass" : "—"}</strong>Federation publish</div>
    <div class="stat"><strong>${results.filter((r) => r.ok).length}/${results.length}</strong>Fixtures green</div>
  </div>

  <p><a href="latest.json">latest.json</a> · <a href="../../migration-evidence/poc/index.html">Migration Evidence hub</a></p>

  <h2>Fixture results</h2>
  <table>
    <thead><tr><th>Fixture</th><th>Status</th><th>Routes</th><th>Correctness</th><th>Mode</th></tr></thead>
    <tbody>${rows || "<tr><td colspan=\"5\">No matrix results</td></tr>"}</tbody>
  </table>

  <footer>Generated ${escapeHtml(report.generatedAt ?? new Date().toISOString())}</footer>
</body>
</html>`;

  const indexPath = join(outDir, "index.html");
  writeFileSync(indexPath, html, "utf8");

  return {
    ok: true,
    indexPath,
    matrixOk: report.ok === true,
    fixtureCount: results.length,
    greenCount: results.filter((r) => r.ok).length,
  };
}

async function main() {
  const r = runOpenLegacyNightlyBuildHub();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("open-legacy-nightly-build-hub")) main();
