#!/usr/bin/env node
/**
 * IS near-miss salience v2 (G9630 / D6382) — catalog z-score normalization.
 * Production activates when operator-evidence domains ≥ 20; smoke uses forceSalienceV2.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_IS_NEAR_MISS_SALIENCE_V2_KIND = "chrysalis.hub.is-near-miss-salience-v2-smoke";
export const HUB_IS_NEAR_MISS_SALIENCE_V2_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/** Synthetic catalog with ≥2 php near-miss donors for z-score pool. */
function syntheticCatalog() {
  const ids = [
    "plainPhp",
    "tinyBlog",
    "laravelMin",
    "phpGreenfield",
    "symfonyFlagship",
    "wordpressProbe",
    "expressJs",
    "djangoMin",
  ];
  return ids.map((id, i) => ({
    id,
    origin: id.includes("django") ? "python" : id === "expressJs" ? "js" : "php",
    minRoutes: 5 + i * 3,
    tags: [id.includes("django") ? "python" : id === "expressJs" ? "js" : "php", "flagship"],
    fixtureRel: `fixtures/hub-flagship-${id}`,
  }));
}

export async function runIsNearMissSalienceV2Smoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const catalog = syntheticCatalog();
  const shorthands = ["plainPhp", "tinyBlog", "symfonyFlagship"]
    .map((id) => {
      const e = catalog.find((c) => c.id === id);
      if (!e) return null;
      return mod.buildPolicyGraphShorthandFromPortReport(e.id, {
        ok: true,
        cwl: { ok: true, cwlPath: `fixtures/${e.id}/routes.cwl`, routeCount: e.minRoutes },
        verify: { ok: true, correctness: 1 },
      });
    })
    .filter(Boolean);

  const task = {
    domainId: "phpGreenfield",
    origin: "php",
    minRoutes: 12,
    tags: ["php", "greenfield"],
  };

  const v1 = mod.scoreNearMissCandidates({ taskFingerprint: task, domainCatalog: catalog, shorthands });
  const v2 = mod.scoreNearMissCandidatesV2({
    taskFingerprint: task,
    domainCatalog: catalog,
    shorthands,
    forceSalienceV2: true,
  });
  const operatorCount = mod.countOperatorEvidenceDomains(repoRoot);
  const autoLow = mod.scoreNearMissCandidatesAuto(
    { taskFingerprint: task, domainCatalog: catalog, shorthands },
    operatorCount,
  );
  const autoHigh = mod.scoreNearMissCandidatesAuto(
    { taskFingerprint: task, domainCatalog: catalog, shorthands, forceSalienceV2: true },
    operatorCount,
  );

  const resolved = mod.resolveShorthandWithTransfer({
    domainId: "phpGreenfield",
    shorthands,
    domainCatalog: catalog,
    taskFingerprint: task,
    operatorDomainCount: 25,
  });

  const checks = {
    v2HasCandidates: v2.length >= 2,
    v2VersionTag: v2.every((c) => c.salienceVersion === 2),
    v1VersionTag: v1.every((c) => c.salienceVersion === 1),
    productionGateLow: mod.salienceV2ProductionReady(operatorCount) === (operatorCount >= 20),
    autoUsesV1WhenLow: operatorCount < 20 ? autoLow[0]?.salienceVersion === 1 : true,
    autoUsesV2WhenForced: autoHigh[0]?.salienceVersion === 2,
    autoUsesV2WhenReady:
      operatorCount >= mod.SALIENCE_V2_MIN_OPERATOR_DOMAINS
        ? mod.scoreNearMissCandidatesAuto(
            { taskFingerprint: task, domainCatalog: catalog, shorthands },
            operatorCount,
          )[0]?.salienceVersion === 2
        : true,
    resolveNearMiss: resolved.cacheOutcome === "near-miss",
    resolveSalienceV2: resolved.salienceVersion === 2,
    attribution: v2[0]?.attribution === mod.CYNOENGINE_ATTRIBUTION,
    minDomainsConstant: mod.SALIENCE_V2_MIN_OPERATOR_DOMAINS === 20,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_IS_NEAR_MISS_SALIENCE_V2_KIND,
    schemaVersion: HUB_IS_NEAR_MISS_SALIENCE_V2_SCHEMA_VERSION,
    ok,
    checks,
    operatorEvidenceDomains: operatorCount,
    topV2: v2[0] ? { domainId: v2[0].domainId, score: v2[0].score } : null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const progress = createSmokeProgress("is-near-miss-salience-v2");
  const t0 = progress.start("IS near-miss salience v2 (G9630)");
  const report = await runIsNearMissSalienceV2Smoke();
  progress.end("IS near-miss salience v2 (G9630)", report.ok === true, t0);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-is-near-miss-salience-v2-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
