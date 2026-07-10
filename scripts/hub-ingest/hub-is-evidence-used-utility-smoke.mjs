#!/usr/bin/env node
/**
 * Evidence-used utility v2 (G9560 / D6377).
 * Inspired by CynoEngine — credit only domains actually used; never mere surface.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_IS_EVIDENCE_USED_UTILITY_KIND = "chrysalis.hub.is-evidence-used-utility-smoke";
export const HUB_IS_EVIDENCE_USED_UTILITY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runIsEvidenceUsedUtilitySmoke(opts = {}) {
  const mod = await loadWebLlm();
  let store = mod.emptyIsUtilityStore();
  store = mod.recordEvidenceUsedUtility(store, {
    outcome: "useful",
    verifyCorrectness: 1,
    usedDomainIds: ["plainPhp"],
    surfacedButUnusedDomainIds: ["tinyBlog", "laravelMin"],
  });

  const checks = {
    schemaV2: store.schemaVersion === 2,
    attribution: store.attribution === mod.CYNOENGINE_ATTRIBUTION,
    usedCredited: (store.domains.plainPhp?.evidenceUsedCount ?? 0) >= 1,
    usedUseful: (store.domains.plainPhp?.mean ?? 0) > 0.5,
    unusedNotCredited:
      store.domains.tinyBlog == null && store.domains.laravelMin == null,
    noiseUnusedOnFail: (() => {
      let s = mod.emptyIsUtilityStore();
      s = mod.recordEvidenceUsedUtility(s, {
        outcome: "noise",
        usedDomainIds: ["plainPhp"],
        surfacedButUnusedDomainIds: ["tinyBlog"],
      });
      return s.domains.plainPhp != null && s.domains.tinyBlog != null;
    })(),
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: HUB_IS_EVIDENCE_USED_UTILITY_KIND,
    schemaVersion: HUB_IS_EVIDENCE_USED_UTILITY_SCHEMA_VERSION,
    ok,
    checks,
    collaborationAttribution: mod.CYNOENGINE_ATTRIBUTION,
    generatedAt: new Date().toISOString(),
  };
}

export async function runIsEvidenceUsedUtilitySmokeWithProgress(opts = {}) {
  const progress = createSmokeProgress("is-evidence-used-utility");
  const t0 = progress.start("IS evidence-used utility (G9560)");
  const report = await runIsEvidenceUsedUtilitySmoke(opts);
  progress.end("IS evidence-used utility (G9560)", report.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G9560",
    ok: report.ok === true,
    detail: report.checks,
  });
  return report;
}

async function main() {
  const report = await runIsEvidenceUsedUtilitySmokeWithProgress();
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
