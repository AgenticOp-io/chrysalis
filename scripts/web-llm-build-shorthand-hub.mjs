#!/usr/bin/env node
/** Static Intelligence Shorthand hub — CPU-only storage tier dashboard. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

/**
 * @param {object} [opts]
 */
export async function runWebLlmBuildShorthandHub(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const bundlePath =
    opts.bundlePath ?? join(repoRoot, "reports/web-llm/shorthand/intelligence-shorthands.v1.json");
  const outDir = opts.outDir ?? join(repoRoot, "reports/web-llm/shorthand/poc");
  mkdirSync(outDir, { recursive: true });

  if (!existsSync(bundlePath)) {
    return { ok: false, skip: "bundle-missing", bundlePath };
  }

  const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
  const summary = bundle.summary ?? {};
  const shorthands = bundle.shorthands ?? [];
  const byTier = summary.byTier ?? {};

  const tierRows = Object.entries(byTier)
    .filter(([, n]) => n > 0)
    .map(
      ([tier, count]) =>
        `<tr><td><code>${escapeHtml(tier)}</code></td><td>${count}</td></tr>`,
    )
    .join("\n");

  const sampleRows = shorthands
    .slice(0, 12)
    .map(
      (s) =>
        `<tr><td><code>${escapeHtml(s.id)}</code></td><td>${escapeHtml(s.tier)}</td><td>${escapeHtml(s.domainId)}</td><td>${formatBytes(s.storageBytesEstimate)}</td><td>${s.compressionFactorVs7BWeights.toLocaleString()}×</td></tr>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Chrysalis Intelligence Shorthand</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1024px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.7rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .stat { border: 1px solid #ccc; border-radius: 8px; padding: 1rem; }
    .stat strong { display: block; font-size: 1.35rem; }
    a.button { display: inline-block; margin: 0.25rem 0.5rem 0.25rem 0; padding: 0.5rem 1rem; background: #1a4; color: #fff; text-decoration: none; border-radius: 6px; }
    a.button.secondary { background: #456; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; font-size: 0.95rem; }
    th, td { text-align: left; padding: 0.45rem; border-bottom: 1px solid #ddd; }
    pre { background: #f6f8fa; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    footer { margin-top: 2rem; color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Intelligence Shorthand (IS)</h1>
  <p>Verify-gated domain intelligence stored <strong>outside</strong> neural weights. T5 oracle → T4 CWL → T3 skill capsules. <strong>Zero GPU</strong> for tiers T3–T5.</p>

  <div class="stats">
    <div class="stat"><strong>${summary.count ?? 0}</strong>shorthands</div>
    <div class="stat"><strong>${formatBytes(summary.totalBytes ?? 0)}</strong>total storage</div>
    <div class="stat"><strong>${(summary.compressionVs7BTotal ?? 0).toLocaleString()}×</strong>vs 14 GB 7B</div>
    <div class="stat"><strong>${summary.domainCount ?? 0}</strong>domains</div>
  </div>

  <p>
    <a class="button secondary" href="../intelligence-shorthands.v1.json">JSON bundle</a>
    <a class="button secondary" href="../../federation/shorthand/intelligence-shorthands.v1.json">VMF copy</a>
    <a class="button secondary" href="../../migration-evidence/poc/index.html">Migration Evidence</a>
  </p>

  <h2>Tiers (count)</h2>
  <table><thead><tr><th>Tier</th><th>Count</th></tr></thead><tbody>${tierRows || "<tr><td colspan=2>none</td></tr>"}</tbody></table>

  <h2>Samples</h2>
  <table><thead><tr><th>Id</th><th>Tier</th><th>Domain</th><th>Bytes</th><th>vs 7B</th></tr></thead><tbody>${sampleRows || "<tr><td colspan=5>none</td></tr>"}</tbody></table>

  <h2>Export (CPU only)</h2>
  <pre>pnpm run web-llm:export-shorthand
pnpm run web-llm:build-shorthand-hub
pnpm run hub:intelligence-shorthand-close-smoke</pre>

  <footer>Generated ${new Date().toISOString()} · GPU not required for IS-T3–T5</footer>
</body>
</html>`;

  const indexPath = join(outDir, "index.html");
  writeFileSync(indexPath, html, "utf8");
  return {
    ok: true,
    indexPath,
    count: summary.count ?? 0,
    totalBytes: summary.totalBytes ?? 0,
    compressionVs7BTotal: summary.compressionVs7BTotal ?? 0,
  };
}

async function main() {
  const r = await runWebLlmBuildShorthandHub();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("web-llm-build-shorthand-hub")) main();
