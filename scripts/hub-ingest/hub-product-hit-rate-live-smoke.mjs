#!/usr/bin/env node
/**
 * Product hit-rate live provenance (G9760 / D6397).
 * Seeded jobs may satisfy sample floor; they must not claim live hit-rate READY.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWebLlmSeedOperatorEvidence } from "../web-llm-seed-operator-evidence.mjs";
import { runWebLlmBuildLiveAnalyticsHub } from "../web-llm-build-live-analytics-hub.mjs";
import { runWebLlmAggregateLiveAnalytics } from "../web-llm-aggregate-live-analytics.mjs";

export const HUB_PRODUCT_HIT_RATE_LIVE_KIND = "chrysalis.hub.product-hit-rate-live-smoke";
export const HUB_PRODUCT_HIT_RATE_LIVE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runProductHitRateLiveSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();

  let seed = null;
  if (opts.skipSeed !== true) {
    seed = await runWebLlmSeedOperatorEvidence({ repoRoot });
  } else {
    await runWebLlmAggregateLiveAnalytics({ repoRoot });
  }

  const hub = await runWebLlmBuildLiveAnalyticsHub({ repoRoot });
  const analyticsPath = join(repoRoot, "reports/web-llm/shorthand/is-live-analytics.v1.json");
  const analytics = mod.loadIsLiveAnalytics(analyticsPath);
  const seedJobCount = analytics?.seedJobCount ?? seed?.seedJobCount ?? 0;
  const liveVerifiedJobCount = analytics?.liveVerifiedJobCount ?? seed?.liveVerifiedJobCount ?? 0;
  const jobCount = analytics?.jobCount ?? seed?.jobCount ?? 0;

  const sampleReady = mod.productHitRateSampleReady(jobCount) === true;
  const liveReady = mod.productHitRateLiveReady(liveVerifiedJobCount) === true;
  const seedCannotClaimLive = !(seedJobCount >= 50 && liveVerifiedJobCount < 50 && liveReady);

  const html = existsSync(hub.indexPath ?? "") ? readFileSync(hub.indexPath, "utf8") : "";

  const checks = {
    sampleReady,
    seedJobsPresent: seedJobCount >= 50,
    liveNotReadyFromSeedAlone: liveReady === false || liveVerifiedJobCount >= 50,
    seedCannotClaimLive,
    hubOk: hub.ok === true,
    hubMentionsLive: html.includes("Live hit-rate"),
    hubMentionsSeed: html.toLowerCase().includes("seed"),
    provenanceCountsPresent:
      typeof analytics?.seedJobCount === "number" && typeof analytics?.liveVerifiedJobCount === "number",
    ...(seed != null ? { seedOk: seed.ok === true } : {}),
  };
  const ok = Object.values(checks).every(Boolean);

  const report = {
    kind: HUB_PRODUCT_HIT_RATE_LIVE_KIND,
    schemaVersion: HUB_PRODUCT_HIT_RATE_LIVE_SCHEMA_VERSION,
    ok,
    checks,
    seedJobCount,
    liveVerifiedJobCount,
    jobCount,
    sampleReady,
    liveReady,
    seed,
    hub,
    generatedAt: new Date().toISOString(),
  };

  const outDir = join(repoRoot, "reports/web-llm/operator-evidence");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "product-hit-rate-live-smoke.v1.json"), `${JSON.stringify(report, null, 2)}\n`);

  return report;
}

async function main() {
  const report = await runProductHitRateLiveSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-product-hit-rate-live-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
