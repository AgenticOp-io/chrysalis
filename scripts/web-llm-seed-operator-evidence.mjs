#!/usr/bin/env node
/** Seed operator-evidence trajectories for salience v2 + live analytics (G9640 / D6384). */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openLegacyIndexEntries } from "./site-port-federation-lib.mjs";
import { runWebLlmAggregateLiveAnalytics } from "./web-llm-aggregate-live-analytics.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

function loadSeedConfig(repoRoot) {
  const path = join(repoRoot, "fixtures/ci/operator-evidence-seed-domains.v1.json");
  if (!existsSync(path)) return { minDomains: 20, priorityIds: [] };
  return JSON.parse(readFileSync(path, "utf8"));
}

function bundleDomainIds(repoRoot, limit = 40) {
  const bundlePath = join(repoRoot, "reports/web-llm/shorthand/intelligence-shorthands.v1.json");
  if (!existsSync(bundlePath)) return [];
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
  const ids = [...new Set((bundle.shorthands ?? []).map((s) => s.domainId).filter(Boolean))];
  return ids.slice(0, limit);
}

function pickSeedDomains(repoRoot, config) {
  const catalog = openLegacyIndexEntries(repoRoot).map((e) => e.id);
  const fromBundle = bundleDomainIds(repoRoot, 80);
  const priority = config.priorityIds ?? [];
  const merged = [...new Set([...priority, ...catalog, ...fromBundle])];
  const min = Math.max(config.minDomains ?? 20, config.minJobs ?? 20);
  return merged.slice(0, Math.max(min, Math.min(merged.length, min + 16)));
}

/**
 * @param {object} [opts]
 */
export async function runWebLlmSeedOperatorEvidence(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const config = loadSeedConfig(repoRoot);
  const domainIds = pickSeedDomains(repoRoot, config);
  const catalog = openLegacyIndexEntries(repoRoot).map((e) => ({
    id: e.id,
    origin: e.origin,
    minRoutes: e.minRoutes,
    tags: e.tags,
    fixtureRel: e.fixtureRel,
  }));

  const bundlePath = join(repoRoot, "reports/web-llm/shorthand/intelligence-shorthands.v1.json");
  if (!existsSync(bundlePath)) {
    return { ok: false, skip: "shorthand-bundle-missing", bundlePath };
  }
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
  const shorthands = bundle.shorthands ?? [];

  const evidenceBase = join(repoRoot, "reports/web-llm/operator-evidence");
  mkdirSync(evidenceBase, { recursive: true });

  let seeded = 0;
  const outcomes = { hit: 0, "near-miss": 0, miss: 0 };

  for (const domainId of domainIds) {
    const evidenceDir = join(evidenceBase, domainId);
    const resolved = mod.resolveShorthandForTask({
      domainId,
      shorthands,
      domainCatalog: catalog,
      repoRoot,
    });
    const sessionId = mod.createTrajectorySessionId(`seed-${domainId}`);
    // Seed and live coexist: seed.trajectory.jsonl vs hub-convert.trajectory.jsonl (G9770).
    const trajectoryPath = join(evidenceDir, "seed.trajectory.jsonl");
    mkdirSync(dirname(trajectoryPath), { recursive: true });
    writeFileSync(trajectoryPath, "", "utf8");

    mod.appendTrajectoryRecord({
      filePath: trajectoryPath,
      sessionId,
      step: 1,
      role: "system",
      toolName: "hub_convert_is_routing",
      gate: { name: "is-routing", ok: true },
      domainId,
      isCacheOutcome: resolved.cacheOutcome,
      skipLlm: resolved.skipLlm,
      isTier: resolved.tier,
      nearMissScore: resolved.nearMissScore,
      evidenceSource: "seed",
    });
    mod.appendTrajectoryRecord({
      filePath: trajectoryPath,
      sessionId,
      step: 2,
      role: "tool",
      toolName: "hub_convert_verify_gate",
      gate: { name: "verify-gate", ok: resolved.cacheOutcome !== "miss" },
      domainId,
      verifyCostMs: resolved.cacheOutcome === "hit" ? 42 : resolved.cacheOutcome === "near-miss" ? 96 : 180,
      evidenceSource: "seed",
    });
    seeded += 1;
    outcomes[resolved.cacheOutcome] = (outcomes[resolved.cacheOutcome] ?? 0) + 1;
  }

  const minJobs = config.minJobs ?? config.minDomains ?? 20;
  const domainCount = mod.countOperatorEvidenceDomains(repoRoot);
  const aggregate = await runWebLlmAggregateLiveAnalytics({ repoRoot });
  const { runWebLlmBuildLiveAnalyticsHub } = await import("./web-llm-build-live-analytics-hub.mjs");
  const hub = await runWebLlmBuildLiveAnalyticsHub({ repoRoot });
  const salienceV2Ready = mod.salienceV2ProductionReady(domainCount);
  const jobCount = aggregate.summary?.jobCount ?? 0;
  const productMetricsReady = mod.productHitRateSampleReady?.(jobCount) ?? jobCount >= 50;
  const liveVerifiedJobCount = aggregate.summary?.liveVerifiedJobCount ?? 0;
  const seedJobCount = aggregate.summary?.seedJobCount ?? 0;
  const productLiveReady =
    mod.productHitRateLiveReady?.(liveVerifiedJobCount) ?? liveVerifiedJobCount >= 50;

  return {
    kind: "chrysalis.web-llm.seed-operator-evidence",
    schemaVersion: 2,
    ok: seeded >= minJobs && domainCount >= Math.min(20, minJobs) && jobCount >= minJobs,
    seeded,
    domainCount,
    jobCount,
    seedJobCount,
    liveVerifiedJobCount,
    salienceV2Ready,
    productMetricsReady,
    productLiveReady,
    outcomes,
    aggregateOk: aggregate.ok === true,
    liveAnalyticsHubOk: hub.ok === true,
    notes: config.notes ?? [],
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const result = await runWebLlmSeedOperatorEvidence();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

if (process.argv[1]?.includes("web-llm-seed-operator-evidence")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
