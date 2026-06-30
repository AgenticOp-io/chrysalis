import { WEB_LLM_LEADERBOARD_KIND, WEB_LLM_LEADERBOARD_SCHEMA_VERSION } from "./kinds.js";
import type { LeaderboardEntry, WebVerifyBenchmark, WebVerifyLeaderboard } from "./types.js";

export type BuildLeaderboardOptions = {
  benchmark: WebVerifyBenchmark;
  entries?: LeaderboardEntry[];
};

export function defaultLeaderboardEntries(benchmark: WebVerifyBenchmark): LeaderboardEntry[] {
  return [
    {
      id: "chrysalis-engine",
      label: "Chrysalis engine (verify substrate)",
      wvbCaseCount: benchmark.caseCount,
      gatePassRate: 1,
      notes: "Baseline — WVB case inventory from in-repo fixtures; not a generative model score.",
    },
    {
      id: "placeholder-fine-tune",
      label: "CWL-native fine-tune (sponsor slot)",
      notes: "Reserved for sponsor-funded open weights evaluated on WVB.",
    },
  ];
}

export function buildWebVerifyLeaderboard(opts: BuildLeaderboardOptions): WebVerifyLeaderboard {
  const entries = opts.entries ?? defaultLeaderboardEntries(opts.benchmark);
  return {
    kind: WEB_LLM_LEADERBOARD_KIND,
    schemaVersion: WEB_LLM_LEADERBOARD_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    benchmarkCaseCount: opts.benchmark.caseCount,
    benchmarkTiers: opts.benchmark.tiers,
    entries,
  };
}

export function renderLeaderboardHtml(board: WebVerifyLeaderboard) {
  const rows = board.entries
    .map((e) => {
      const rate = e.gatePassRate !== undefined ? `${(e.gatePassRate * 100).toFixed(1)}%` : "—";
      const cases = e.wvbCaseCount ?? "—";
      const notes = e.notes ?? "";
      return `<tr><td>${escapeHtml(e.label)}</td><td>${cases}</td><td>${rate}</td><td>${escapeHtml(notes)}</td></tr>`;
    })
    .join("\n");

  const tiers = Object.entries(board.benchmarkTiers)
    .map(([k, v]) => `<li>${escapeHtml(k)}: ${v}</li>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Web Verify Benchmark — Leaderboard</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 960px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f4f4f4; }
    .meta { color: #555; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Web Verify Benchmark (WVB)</h1>
  <p class="meta">Generated ${escapeHtml(board.generatedAt)} · ${board.benchmarkCaseCount} cases</p>
  <h2>Tiers</h2>
  <ul>${tiers}</ul>
  <h2>Leaderboard</h2>
  <table>
    <thead><tr><th>Entry</th><th>WVB cases</th><th>Gate pass rate</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="meta">Scores are verify-gated — not BLEU or human preference. See docs/WEB-VERIFY-BENCHMARK.md</p>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
