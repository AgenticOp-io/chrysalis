#!/usr/bin/env node
/** Live hit-rate READY from hub-convert-verify batch (G9770 / D6398). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWebLlmBatchHubConvertVerifyEvidence } from "../web-llm-batch-hub-convert-verify-evidence.mjs";
import { runWebLlmSeedOperatorEvidence } from "../web-llm-seed-operator-evidence.mjs";
import { runWebLlmBuildLiveAnalyticsHub } from "../web-llm-build-live-analytics-hub.mjs";

export const HUB_PRODUCT_HIT_RATE_LIVE_READY_KIND = "chrysalis.hub.product-hit-rate-live-ready-smoke";
export const HUB_PRODUCT_HIT_RATE_LIVE_READY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runProductHitRateLiveReadySmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  // Prefer precomputed batch when G8550 already ran it (avoid double 50× routing).
  const batch =
    opts.skipBatch === true
      ? {
          ok: true,
          skip: "batch-skipped",
          liveVerifiedJobCount: 0,
        }
      : await runWebLlmBatchHubConvertVerifyEvidence({ repoRoot });
  const seed =
    opts.skipSeed === true
      ? { ok: true, skip: "seed-skipped" }
      : await runWebLlmSeedOperatorEvidence({ repoRoot });
  if (opts.skipBatch === true) {
    const { runWebLlmAggregateLiveAnalytics } = await import("../web-llm-aggregate-live-analytics.mjs");
    await runWebLlmAggregateLiveAnalytics({ repoRoot });
  }
  const hub = await runWebLlmBuildLiveAnalyticsHub({ repoRoot });
  const analytics = mod.loadIsLiveAnalytics(join(repoRoot, "reports/web-llm/shorthand/is-live-analytics.v1.json"));
  const liveVerifiedJobCount = analytics?.liveVerifiedJobCount ?? batch.liveVerifiedJobCount ?? 0;
  const seedJobCount = analytics?.seedJobCount ?? 0;
  const liveReady = mod.productHitRateLiveReady(liveVerifiedJobCount) === true;
  const html = existsSync(hub.indexPath ?? "") ? readFileSync(hub.indexPath, "utf8") : "";

  const checks = {
    batchOk: batch.ok === true,
    liveReady,
    liveMin: liveVerifiedJobCount >= 50,
    seedStillDistinct: seedJobCount >= 0,
    seedDidNotClaimAlone: !(seedJobCount >= 50 && liveVerifiedJobCount < 50 && liveReady),
    hubLiveReady: hub.productLiveReady === true,
    hubMentionsLive: html.includes("Live hit-rate"),
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_PRODUCT_HIT_RATE_LIVE_READY_KIND,
    schemaVersion: HUB_PRODUCT_HIT_RATE_LIVE_READY_SCHEMA_VERSION,
    ok,
    checks,
    liveVerifiedJobCount,
    seedJobCount,
    liveReady,
    batch,
    seed,
    hub,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runProductHitRateLiveReadySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-product-hit-rate-live-ready-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
