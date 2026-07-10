#!/usr/bin/env node
/**
 * IS live analytics close (G9510 / D6372) — hit / near-miss / miss + verifyCostMs.
 * Synthetic live-job trajectory (not fixture skip-LLM rate). CPU only.
 */
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openLegacyIndexEntries } from "../site-port-federation-lib.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_IS_LIVE_ANALYTICS_CLOSE_KIND = "chrysalis.hub.is-live-analytics-close-smoke";
export const HUB_IS_LIVE_ANALYTICS_CLOSE_SCHEMA_VERSION = 1;

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
export async function runIsLiveAnalyticsCloseSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const catalog = openLegacyIndexEntries(repoRoot).map((e) => ({
    id: e.id,
    origin: e.origin,
    minRoutes: e.minRoutes,
    tags: e.tags,
    fixtureRel: e.fixtureRel,
  }));

  const workDir = join(repoRoot, "generated/_is-live-analytics-smoke");
  mkdirSync(workDir, { recursive: true });
  const trajectoryPath = join(workDir, "live-job.trajectory.jsonl");
  if (existsSync(trajectoryPath)) unlinkSync(trajectoryPath);

  // Build a minimal in-memory corpus: tinyBlog exact + leave wordpressProbe for near-miss/miss.
  const tiny = mod.buildOracleRefShorthandFromPortReport("tinyBlog", {
    ok: true,
    verify: { ok: true, correctness: 1, mode: "probe-replay" },
  });
  const plain = mod.buildPolicyGraphShorthandFromPortReport("plainPhp", {
    ok: true,
    cwl: { ok: true, cwlPath: "fixtures/hub-flagship-plain-php/routes.cwl", routeCount: 10 },
    verify: { ok: true, correctness: 1 },
  });
  const shorthands = [tiny, plain].filter(Boolean);

  const hitResolved = mod.resolveShorthandForTask({
    domainId: "tinyBlog",
    shorthands,
    domainCatalog: catalog,
  });
  const nearMissResolved = mod.resolveShorthandForTask({
    domainId: "laravelMin",
    shorthands,
    domainCatalog: catalog,
  });
  // expressJs has no same-origin donor with overlapping band in our tiny corpus → miss
  // (only php donors). Use a synthetic domain with no catalog match.
  const missResolved = mod.resolveShorthandForTask({
    domainId: "unknownSiteX",
    shorthands,
    domainCatalog: catalog,
    taskFingerprint: { domainId: "unknownSiteX", origin: "ruby", minRoutes: 3, tags: ["rails"] },
  });

  const sessionHit = mod.createTrajectorySessionId("is-live-hit");
  const sessionNear = mod.createTrajectorySessionId("is-live-near");
  const sessionMiss = mod.createTrajectorySessionId("is-live-miss");

  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId: sessionHit,
    step: 1,
    role: "system",
    toolName: "hub_convert_is_routing",
    gate: { name: "is-routing", ok: true },
    domainId: "tinyBlog",
    isTier: hitResolved.tier,
    isRetrievalHit: hitResolved.retrievalHit,
    skipLlm: hitResolved.skipLlm,
    isCacheOutcome: hitResolved.cacheOutcome,
  });
  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId: sessionHit,
    step: 2,
    role: "tool",
    toolName: "hub_convert_verify_gate",
    gate: { name: "verify-gate", ok: true },
    domainId: "tinyBlog",
    verifyCostMs: 42,
  });

  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId: sessionNear,
    step: 1,
    role: "system",
    toolName: "hub_convert_is_routing",
    gate: { name: "is-routing", ok: true },
    domainId: "laravelMin",
    isTier: nearMissResolved.tier,
    isRetrievalHit: nearMissResolved.retrievalHit,
    skipLlm: nearMissResolved.skipLlm,
    isCacheOutcome: nearMissResolved.cacheOutcome,
    nearMissDomainId: nearMissResolved.nearMissDomainId ?? undefined,
  });
  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId: sessionNear,
    step: 2,
    role: "tool",
    toolName: "hub_convert_verify_gate",
    gate: { name: "verify-gate", ok: true },
    domainId: "laravelMin",
    verifyCostMs: 120,
  });

  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId: sessionMiss,
    step: 1,
    role: "system",
    toolName: "hub_convert_is_routing",
    gate: { name: "is-routing", ok: true },
    domainId: "unknownSiteX",
    isTier: missResolved.tier,
    isRetrievalHit: missResolved.retrievalHit,
    skipLlm: false,
    isCacheOutcome: missResolved.cacheOutcome,
  });
  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId: sessionMiss,
    step: 2,
    role: "tool",
    toolName: "hub_convert_verify_gate",
    gate: { name: "verify-gate", ok: false },
    domainId: "unknownSiteX",
    verifyCostMs: 200,
  });

  const summary = mod.summarizeIsLiveAnalyticsFromTrajectoryFile(trajectoryPath, {
    scope: "synthetic-smoke",
    notes: [
      "Synthetic live-job trajectory for G9510 close — not production hit rate.",
      "Primary product metrics: hitRate, nearMissRate, missRate, verifyCostMsP50.",
      "compressionFactorVs7BWeights is storage analogy only — not a marketing primary.",
    ],
  });
  const analyticsPath = mod.writeIsLiveAnalytics(repoRoot, summary);

  // Demote: remove tinyBlog capsules on verify-fail reason
  const demote = mod.demoteShorthandsForDomain({
    domainId: "tinyBlog",
    reason: "verify-fail",
    shorthands: [...shorthands],
  });

  const analyticsTool = mod.findAgentTool("web_llm_is_live_analytics");
  const demoteTool = mod.findAgentTool("web_llm_demote_shorthand");

  const checks = {
    hitOutcome: hitResolved.cacheOutcome === "hit" && hitResolved.skipLlm === true,
    nearMissOutcome:
      nearMissResolved.cacheOutcome === "near-miss" &&
      nearMissResolved.skipLlm === false &&
      nearMissResolved.holeDeltaLlmOnly === true &&
      nearMissResolved.nearMissDomainId != null,
    missOutcome: missResolved.cacheOutcome === "miss" && missResolved.skipLlm === false,
    analyticsJobCount: summary.jobCount === 3,
    analyticsHasHit: summary.hitCount === 1,
    analyticsHasNearMiss: summary.nearMissCount === 1,
    analyticsHasMiss: summary.missCount === 1,
    analyticsVerifyP50: summary.verifyCostMsP50 === 120,
    analyticsRatesSum:
      Math.abs(summary.hitRate + summary.nearMissRate + summary.missRate - 1) < 1e-9,
    demotedTiny: demote.demoted === true && demote.removedIds.length >= 1,
    analyticsFile: existsSync(analyticsPath),
    analyticsToolPresent: analyticsTool?.name === "web_llm_is_live_analytics",
    demoteToolPresent: demoteTool?.name === "web_llm_demote_shorthand",
    kindOk: summary.kind === mod.IS_LIVE_ANALYTICS_KIND,
  };
  const ok = Object.values(checks).every(Boolean);

  // Hub HTML should mention live analytics primary metrics when rebuilt
  const hubNotePath = join(workDir, "metrics-note.json");
  writeFileSync(
    hubNotePath,
    `${JSON.stringify(
      {
        primaryMetrics: ["hitRate", "nearMissRate", "missRate", "verifyCostMsP50"],
        compressionIsAnalogyOnly: true,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    kind: HUB_IS_LIVE_ANALYTICS_CLOSE_KIND,
    schemaVersion: HUB_IS_LIVE_ANALYTICS_CLOSE_SCHEMA_VERSION,
    ok,
    checks,
    summary: {
      hitRate: summary.hitRate,
      nearMissRate: summary.nearMissRate,
      missRate: summary.missRate,
      verifyCostMsP50: summary.verifyCostMsP50,
      jobCount: summary.jobCount,
    },
    analyticsPath,
    hitResolved: {
      cacheOutcome: hitResolved.cacheOutcome,
      skipLlm: hitResolved.skipLlm,
    },
    nearMissResolved: {
      cacheOutcome: nearMissResolved.cacheOutcome,
      nearMissDomainId: nearMissResolved.nearMissDomainId,
      holeDeltaLlmOnly: nearMissResolved.holeDeltaLlmOnly,
    },
    missResolved: { cacheOutcome: missResolved.cacheOutcome },
    generatedAt: new Date().toISOString(),
  };
}

export async function runIsLiveAnalyticsCloseSmokeWithProgress(opts = {}) {
  const progress = createSmokeProgress("is-live-analytics-close");
  const t0 = progress.start("IS live analytics close (G9510)");
  const report = await runIsLiveAnalyticsCloseSmoke(opts);
  progress.end("IS live analytics close (G9510)", report.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G9510",
    ok: report.ok === true,
    detail: report.checks,
  });
  return report;
}

async function main() {
  const report = await runIsLiveAnalyticsCloseSmokeWithProgress();
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
