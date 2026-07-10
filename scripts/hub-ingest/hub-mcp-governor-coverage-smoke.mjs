#!/usr/bin/env node
/**
 * MCP governor coverage (G9570 / D6377).
 * Inspired by CynoEngine — every agent tool has a visible GREEN/YELLOW/RED class.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_MCP_GOVERNOR_COVERAGE_KIND = "chrysalis.hub.mcp-governor-coverage-smoke";
export const HUB_MCP_GOVERNOR_COVERAGE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runMcpGovernorCoverageSmoke(opts = {}) {
  const mod = await loadWebLlm();
  const listed = mod.listGovernedAgentTools();
  const coverageOk = mod.agentToolsGovernorCoverageOk();
  const byTier = { GREEN: 0, YELLOW: 0, RED: 0, DENY: 0 };
  for (const row of listed) byTier[row.tier] = (byTier[row.tier] ?? 0) + 1;

  const checks = {
    coverageOk: coverageOk === true,
    hasGreen: byTier.GREEN >= 1,
    hasYellow: byTier.YELLOW >= 1,
    hasRed: byTier.RED >= 1,
    allAttributed: listed.every((r) => r.attribution === mod.CYNOENGINE_ATTRIBUTION),
    toolCount: listed.length >= 10,
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: HUB_MCP_GOVERNOR_COVERAGE_KIND,
    schemaVersion: HUB_MCP_GOVERNOR_COVERAGE_SCHEMA_VERSION,
    ok,
    checks,
    byTier,
    toolCount: listed.length,
    collaborationAttribution: mod.CYNOENGINE_ATTRIBUTION,
    generatedAt: new Date().toISOString(),
  };
}

export async function runMcpGovernorCoverageSmokeWithProgress(opts = {}) {
  const progress = createSmokeProgress("mcp-governor-coverage");
  const t0 = progress.start("MCP governor coverage (G9570)");
  const report = await runMcpGovernorCoverageSmoke(opts);
  progress.end("MCP governor coverage (G9570)", report.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G9570",
    ok: report.ok === true,
    detail: report.checks,
  });
  return report;
}

async function main() {
  const report = await runMcpGovernorCoverageSmokeWithProgress();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
