#!/usr/bin/env node
/**
 * IS utility prior close (G9530 / D6375).
 * Inspired by CynoEngine — outcome closes the loop; never LLM self-report. Not a code port.
 */
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openLegacyIndexEntries } from "../site-port-federation-lib.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_IS_UTILITY_PRIOR_KIND = "chrysalis.hub.is-utility-prior-smoke";
export const HUB_IS_UTILITY_PRIOR_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runIsUtilityPriorSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const workDir = join(repoRoot, "generated/_is-utility-prior-smoke");
  mkdirSync(workDir, { recursive: true });
  const utilPath = join(workDir, "is-utility.v1.json");
  if (existsSync(utilPath)) unlinkSync(utilPath);

  let store = mod.emptyIsUtilityStore();
  store = mod.recordUtilityOutcome(store, { domainId: "plainPhp", outcome: "noise" });
  store = mod.recordUtilityOutcome(store, { domainId: "plainPhp", outcome: "noise" });
  store = mod.recordUtilityOutcome(store, { domainId: "plainPhp", outcome: "noise" });
  store = mod.recordUtilityOutcome(store, {
    domainId: "tinyBlog",
    outcome: "useful",
    verifyCorrectness: 1,
  });
  mod.writeIsUtilityStore(utilPath, store);
  const loaded = mod.loadIsUtilityStore(utilPath);

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
    verify: { ok: true, correctness: 1 },
  });
  const shorthands = [plain, tiny].filter(Boolean);

  const downRanked = mod.shouldDownRankByUtility(loaded.domains.plainPhp);
  const resolved = mod.resolveShorthandForTask({
    domainId: "laravelMin",
    shorthands,
    domainCatalog: catalog,
    utilityStore: loaded,
  });

  const tool = mod.findAgentTool("web_llm_record_utility_outcome");
  const checks = {
    kindOk: loaded.kind === mod.IS_UTILITY_KIND,
    attribution: loaded.attribution === mod.CYNOENGINE_ATTRIBUTION,
    plainDownRank: downRanked === true,
    tinyNotDownRank: mod.shouldDownRankByUtility(loaded.domains.tinyBlog) === false,
    multiplierNoise: mod.utilityScoreMultiplier(loaded.domains.plainPhp) < 1,
    // With plainPhp down-ranked, near-miss should prefer tinyBlog (same origin php) or miss
    nearMissAvoidsBadDonor:
      resolved.cacheOutcome === "miss" ||
      resolved.nearMissDomainId !== "plainPhp" ||
      resolved.nearMissDomainId === "tinyBlog",
    toolPresent: tool?.name === "web_llm_record_utility_outcome",
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_IS_UTILITY_PRIOR_KIND,
    schemaVersion: HUB_IS_UTILITY_PRIOR_SCHEMA_VERSION,
    ok,
    checks,
    utilityPath: utilPath,
    resolved: {
      cacheOutcome: resolved.cacheOutcome,
      nearMissDomainId: resolved.nearMissDomainId,
    },
    collaborationAttribution: mod.CYNOENGINE_ATTRIBUTION,
    generatedAt: new Date().toISOString(),
  };
}

export async function runIsUtilityPriorSmokeWithProgress(opts = {}) {
  const progress = createSmokeProgress("is-utility-prior");
  const t0 = progress.start("IS utility prior (G9530)");
  const report = await runIsUtilityPriorSmoke(opts);
  progress.end("IS utility prior (G9530)", report.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G9530",
    ok: report.ok === true,
    detail: report.checks,
  });
  return report;
}

async function main() {
  const report = await runIsUtilityPriorSmokeWithProgress();
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
