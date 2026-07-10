#!/usr/bin/env node
/**
 * IS near-miss salience close (G9520 / D6375).
 * Inspired by CynoEngine — adapted to WebIR/oracle dispose. Not a code port.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openLegacyIndexEntries } from "../site-port-federation-lib.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_IS_NEAR_MISS_SALIENCE_KIND = "chrysalis.hub.is-near-miss-salience-smoke";
export const HUB_IS_NEAR_MISS_SALIENCE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runIsNearMissSalienceSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const catalog = openLegacyIndexEntries(repoRoot).map((e) => ({
    id: e.id,
    origin: e.origin,
    minRoutes: e.minRoutes,
    tags: e.tags,
    fixtureRel: e.fixtureRel,
  }));

  const plain = mod.buildPolicyGraphShorthandFromPortReport("plainPhp", {
    ok: true,
    cwl: { ok: true, cwlPath: "fixtures/hub-flagship-plain-php/routes.cwl", routeCount: 10 },
    verify: { ok: true, correctness: 1 },
  });
  const tiny = mod.buildOracleRefShorthandFromPortReport("tinyBlog", {
    ok: true,
    verify: { ok: true, correctness: 1, mode: "probe-replay" },
  });
  const shorthands = [plain, tiny].filter(Boolean);

  const scored = mod.scoreNearMissCandidates({
    taskFingerprint: { domainId: "laravelMin", origin: "php", minRoutes: 10, tags: ["php", "laravel"] },
    domainCatalog: catalog,
    shorthands,
  });
  const resolved = mod.resolveShorthandForTask({
    domainId: "laravelMin",
    shorthands,
    domainCatalog: catalog,
  });
  const withNovelty = mod.scoreNearMissCandidates({
    taskFingerprint: { domainId: "laravelMin", origin: "php", minRoutes: 10, tags: ["php", "laravel"] },
    domainCatalog: catalog,
    shorthands,
    lastDonorDomainId: resolved.nearMissDomainId ?? undefined,
  });

  const tool = mod.findAgentTool("web_llm_score_near_miss");
  const checks = {
    hasCandidates: scored.length >= 1,
    topHasScore: typeof scored[0]?.score === "number" && scored[0].score > 0,
    topHasFeatures: scored[0]?.features != null && typeof scored[0].features.authority === "number",
    attribution: scored[0]?.attribution === mod.CYNOENGINE_ATTRIBUTION,
    resolveNearMiss: resolved.cacheOutcome === "near-miss" && resolved.skipLlm === false,
    resolveScore: typeof resolved.nearMissScore === "number",
    resolveCite: resolved.collaborationAttribution === mod.CYNOENGINE_ATTRIBUTION,
    noveltyPenalizesSameDonor:
      resolved.nearMissDomainId == null ||
      withNovelty.find((c) => c.domainId === resolved.nearMissDomainId)?.features.novelty === 0,
    toolPresent: tool?.name === "web_llm_score_near_miss",
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_IS_NEAR_MISS_SALIENCE_KIND,
    schemaVersion: HUB_IS_NEAR_MISS_SALIENCE_SCHEMA_VERSION,
    ok,
    checks,
    topCandidate: scored[0]
      ? { domainId: scored[0].domainId, score: scored[0].score, features: scored[0].features }
      : null,
    collaborationAttribution: mod.CYNOENGINE_ATTRIBUTION,
    generatedAt: new Date().toISOString(),
  };
}

export async function runIsNearMissSalienceSmokeWithProgress(opts = {}) {
  const progress = createSmokeProgress("is-near-miss-salience");
  const t0 = progress.start("IS near-miss salience (G9520)");
  const report = await runIsNearMissSalienceSmoke(opts);
  progress.end("IS near-miss salience (G9520)", report.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G9520",
    ok: report.ok === true,
    detail: report.checks,
  });
  return report;
}

async function main() {
  const report = await runIsNearMissSalienceSmokeWithProgress();
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
