#!/usr/bin/env node
/**
 * IS live operator evidence (G9600 / D6378) — aggregate hub-convert trajectories.
 * Product path: real jobs copy into reports/web-llm/operator-evidence/<domain>/.
 */
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWebLlmAggregateLiveAnalytics } from "../web-llm-aggregate-live-analytics.mjs";

export const HUB_IS_LIVE_OPERATOR_EVIDENCE_KIND = "chrysalis.hub.is-live-operator-evidence-smoke";
export const HUB_IS_LIVE_OPERATOR_EVIDENCE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/**
 * @param {object} [opts]
 */
export async function runIsLiveOperatorEvidenceSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();

  const workDir = join(repoRoot, "reports/web-llm/operator-evidence/plainPhp-demo");
  mkdirSync(workDir, { recursive: true });
  const sourcePath = join(workDir, "latest.trajectory.jsonl");
  if (existsSync(sourcePath)) unlinkSync(sourcePath);

  const sessionId = mod.createTrajectorySessionId("hub-convert-demo");
  mod.appendTrajectoryRecord({
    filePath: sourcePath,
    sessionId,
    step: 1,
    role: "system",
    toolName: "hub_convert_is_routing",
    gate: { name: "is-routing", ok: true },
    domainId: "plainPhp",
    isCacheOutcome: "hit",
    skipLlm: true,
    sourceDigest: "demo-digest",
  });
  mod.appendTrajectoryRecord({
    filePath: sourcePath,
    sessionId,
    step: 2,
    role: "tool",
    toolName: "hub_convert_verify_gate",
    gate: { name: "verify-gate", ok: true },
    domainId: "plainPhp",
    verifyCostMs: 88,
    sourceDigest: "demo-digest",
  });

  const snap = mod.snapshotOperatorTrajectoryForEvidence(repoRoot, sourcePath, {
    domainId: "plainPhp",
  });
  const discovered = mod.discoverOperatorTrajectoryPaths(repoRoot);
  const aggregate = await runWebLlmAggregateLiveAnalytics({ repoRoot });
  const summary = aggregate.summary;

  const checks = {
    snapshotWritten: snap != null && existsSync(snap),
    discoveredIncludesSnapshot: discovered.some((p) => p.includes("operator-evidence")),
    aggregateOk: aggregate.ok === true,
    jobCountPositive: (summary?.jobCount ?? 0) >= 1,
    scopeLiveOrAggregate:
      summary?.scope === "live-job" || summary?.scope === "operator-aggregate",
    analyticsFile: existsSync(join(repoRoot, "reports/web-llm/shorthand/is-live-analytics.v1.json")),
    shorthandHubExists: existsSync(join(repoRoot, "reports/web-llm/shorthand/poc/index.html")),
    excludesSyntheticSmoke: !(summary?.notes ?? []).some((n) =>
      n.includes("_is-live-analytics-smoke"),
    ),
    kindOk: summary?.kind === mod.IS_LIVE_ANALYTICS_KIND,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_IS_LIVE_OPERATOR_EVIDENCE_KIND,
    schemaVersion: HUB_IS_LIVE_OPERATOR_EVIDENCE_SCHEMA_VERSION,
    ok,
    checks,
    discoveredCount: discovered.length,
    aggregate,
    snapshotPath: snap,
  };
}

async function main() {
  const result = await runIsLiveOperatorEvidenceSmoke();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-is-live-operator-evidence-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
