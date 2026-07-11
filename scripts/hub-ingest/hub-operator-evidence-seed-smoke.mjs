#!/usr/bin/env node
/** Operator evidence seed close (G9640 / D6384). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWebLlmSeedOperatorEvidence } from "../web-llm-seed-operator-evidence.mjs";

export const HUB_OPERATOR_EVIDENCE_SEED_KIND = "chrysalis.hub.operator-evidence-seed-smoke";
export const HUB_OPERATOR_EVIDENCE_SEED_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runOperatorEvidenceSeedSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const seed = await runWebLlmSeedOperatorEvidence({ repoRoot });
  const domainCount = mod.countOperatorEvidenceDomains(repoRoot);

  const checks = {
    seedOk: seed.ok === true,
    seededMin: (seed.seeded ?? 0) >= 50,
    domainCountMin: domainCount >= 20,
    jobCountMin: (seed.jobCount ?? 0) >= 50,
    salienceV2Ready: mod.salienceV2ProductionReady(domainCount) === true,
    productMetricsReady: seed.productMetricsReady === true,
    aggregateOk: seed.aggregateOk === true,
    liveHubOk: seed.liveAnalyticsHubOk === true,
    hubHtml: existsSync(join(repoRoot, "reports/web-llm/operator-evidence/poc/index.html")),
    analyticsJson: existsSync(join(repoRoot, "reports/web-llm/shorthand/is-live-analytics.v1.json")),
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_OPERATOR_EVIDENCE_SEED_KIND,
    schemaVersion: HUB_OPERATOR_EVIDENCE_SEED_SCHEMA_VERSION,
    ok,
    checks,
    seed,
    domainCount,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runOperatorEvidenceSeedSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-operator-evidence-seed-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
