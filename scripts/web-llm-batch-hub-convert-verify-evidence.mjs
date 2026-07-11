#!/usr/bin/env node
/**
 * Batch hub-convert IS routing + verify-gate evidence (G9770 / D6398).
 * Writes hub-convert-verify trajectories (≥50) without inventing verify summaries —
 * uses committed fixture verify summary-cache (same mode as production when HTTP verify is off).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openLegacyIndexEntries } from "./site-port-federation-lib.mjs";
import { resolveHubConvertIsRouting } from "./hub-ingest/hub-llm-convert-is-routing.mjs";
import { recordConvertVerifyGate } from "./hub-ingest/hub-llm-convert-verify-apply.mjs";
import { runWebLlmAggregateLiveAnalytics } from "./web-llm-aggregate-live-analytics.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

function loadBatchConfig(repoRoot) {
  const path = join(repoRoot, "fixtures/ci/hub-convert-verify-batch.v1.json");
  if (!existsSync(path)) {
    return {
      minLiveJobs: 50,
      verifySummaryRel: "fixtures/ci/tiny-blog-verify-for-status/summary.json",
      priorityIds: [],
    };
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function bundleDomainIds(repoRoot, limit = 80) {
  const bundlePath = join(repoRoot, "reports/web-llm/shorthand/intelligence-shorthands.v1.json");
  if (!existsSync(bundlePath)) return [];
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
  return [...new Set((bundle.shorthands ?? []).map((s) => s.domainId).filter(Boolean))].slice(0, limit);
}

function pickDomains(repoRoot, config) {
  const catalog = openLegacyIndexEntries(repoRoot);
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const priority = config.priorityIds ?? [];
  const fromBundle = bundleDomainIds(repoRoot, 100);
  const mergedIds = [...new Set([...priority, ...catalog.map((e) => e.id), ...fromBundle])];
  const min = config.minLiveJobs ?? 50;
  return mergedIds.slice(0, Math.max(min, Math.min(mergedIds.length, min + 16))).map((id) => {
    const entry = byId.get(id);
    return {
      domainId: id,
      origin: entry?.origin ?? "php",
      output: config.defaultOutput ?? "hono",
      fixtureRel: entry?.fixtureRel ?? null,
    };
  });
}

function seedVerifySummary(projectDir, summarySrc) {
  const destDir = join(projectDir, "reports", "verify");
  mkdirSync(destDir, { recursive: true });
  copyFileSync(summarySrc, join(destDir, "summary.json"));
}

/**
 * @param {object} [opts]
 */
export async function runWebLlmBatchHubConvertVerifyEvidence(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const config = loadBatchConfig(repoRoot);
  const minLiveJobs = config.minLiveJobs ?? 50;
  const summarySrc = join(repoRoot, config.verifySummaryRel ?? "fixtures/ci/tiny-blog-verify-for-status/summary.json");
  if (!existsSync(summarySrc)) {
    return { ok: false, skip: "verify-summary-missing", summarySrc };
  }
  const bundlePath = join(repoRoot, "reports/web-llm/shorthand/intelligence-shorthands.v1.json");
  if (!existsSync(bundlePath)) {
    return { ok: false, skip: "shorthand-bundle-missing", bundlePath };
  }

  const domains = pickDomains(repoRoot, config);
  const workRoot = join(repoRoot, "generated", "_hub-convert-verify-batch");
  mkdirSync(workRoot, { recursive: true });

  let recorded = 0;
  let gatePassCount = 0;
  const outcomes = { hit: 0, "near-miss": 0, miss: 0 };
  const errors = [];

  for (const d of domains) {
    try {
      const projectDir = join(workRoot, d.domainId);
      mkdirSync(join(projectDir, ".chrysalis"), { recursive: true });
      seedVerifySummary(projectDir, summarySrc);

      const routing = await resolveHubConvertIsRouting({
        repoRoot,
        projectDir,
        origin: d.origin,
        output: d.output,
        domainId: d.domainId,
      });

      const gate = await recordConvertVerifyGate({
        projectDir,
        domainId: d.domainId,
        sessionId: routing.sessionId,
        trajectoryPath: routing.trajectoryPath,
        evidenceFileName: "hub-convert.trajectory.jsonl",
        allowDemote: false,
        recordUtility: true,
      });

      recorded += 1;
      if (gate.gatePass) gatePassCount += 1;
      const oc = routing.cacheOutcome ?? "miss";
      outcomes[oc] = (outcomes[oc] ?? 0) + 1;
    } catch (e) {
      errors.push({ domainId: d.domainId, error: String(e?.message ?? e) });
    }
  }

  const aggregate = await runWebLlmAggregateLiveAnalytics({ repoRoot });
  const { runWebLlmBuildLiveAnalyticsHub } = await import("./web-llm-build-live-analytics-hub.mjs");
  const hub = await runWebLlmBuildLiveAnalyticsHub({ repoRoot });
  const liveVerifiedJobCount = aggregate.summary?.liveVerifiedJobCount ?? 0;
  const productLiveReady = mod.productHitRateLiveReady(liveVerifiedJobCount) === true;

  const report = {
    kind: "chrysalis.web-llm.batch-hub-convert-verify-evidence",
    schemaVersion: 1,
    ok: recorded >= minLiveJobs && liveVerifiedJobCount >= minLiveJobs && productLiveReady,
    recorded,
    gatePassCount,
    liveVerifiedJobCount,
    productLiveReady,
    minLiveJobs,
    outcomes,
    errors,
    aggregateOk: aggregate.ok === true,
    liveAnalyticsHubOk: hub.ok === true,
    notes: config.notes ?? [],
    generatedAt: new Date().toISOString(),
  };

  const outDir = join(repoRoot, "reports/web-llm/operator-evidence");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "batch-hub-convert-verify-evidence.v1.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() {
  const result = await runWebLlmBatchHubConvertVerifyEvidence();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

if (process.argv[1]?.includes("web-llm-batch-hub-convert-verify-evidence")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
