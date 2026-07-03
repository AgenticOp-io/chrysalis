#!/usr/bin/env node
/** IS runtime protocol close (G8600) — tier retrieval + skip-LLM routing, CPU only. */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exportIntelligenceShorthands } from "../web-llm-export-shorthand.mjs";
import { callWebLlmTool } from "../web-llm-tool-runner.mjs";
import { openLegacyIndexEntries } from "../site-port-federation-lib.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_IS_RUNTIME_CLOSE_KIND = "chrysalis.hub.is-runtime-close-smoke";
export const HUB_IS_RUNTIME_CLOSE_SCHEMA_VERSION = 1;

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
export async function runIsRuntimeCloseSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const entries = openLegacyIndexEntries(repoRoot);
  const domainIds = entries.map((e) => e.id);

  const exported = await exportIntelligenceShorthands({ repoRoot });
  const shorthands = mod.loadIntelligenceShorthandsFromRepo(repoRoot);
  const promoted = mod.promoteShorthandsByDomain(shorthands);
  const tierRouting = mod.summarizeTierRoutingForDomains(domainIds, shorthands);

  const resolveTiny = await callWebLlmTool(repoRoot, "web_llm_resolve_shorthand", {
    domainId: "tinyBlog",
    repoRoot,
  });
  const resolveDetail = resolveTiny.detail ?? {};

  const manifest = mod.buildAgentToolManifest();
  const resolveTool = mod.findAgentTool("web_llm_resolve_shorthand");
  const convertRoutingTool = mod.findAgentTool("hub_convert_is_routing");
  const convertProposeTool = mod.findAgentTool("hub_convert_propose_holes");

  const trajectoryPath = join(repoRoot, "generated/_is-runtime-smoke/trajectory.jsonl");
  const sessionId = mod.createTrajectorySessionId("is-runtime");
  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId,
    step: 1,
    role: "tool",
    toolName: "web_llm_resolve_shorthand",
    content: "tinyBlog",
    gate: { name: "resolve", ok: resolveTiny.ok === true },
    isTier: resolveDetail.tier,
    isRetrievalHit: resolveDetail.retrievalHit === true,
    skipLlm: resolveDetail.skipLlm === true,
    domainId: "tinyBlog",
  });
  const records = mod.readTrajectoryRecords(trajectoryPath);
  const tierLogged = records.some((r) => r.isTier && r.skipLlm === true);

  const checks = {
    exportOk: exported.ok === true,
    promotedCount: (exported.promotedCount ?? promoted.length) >= entries.length,
    tierRoutingSkipLlm: (tierRouting.skipLlmCount ?? 0) >= 1,
    tierRoutingHitRate: (tierRouting.skipLlmRate ?? 0) >= 0.5,
    resolveTinyOk: resolveTiny.ok === true,
    resolveTinySkipLlm: resolveDetail.skipLlm === true,
    resolveTinyTierHigh:
      typeof resolveDetail.tier === "string" &&
      mod.tierRank(resolveDetail.tier) <= mod.tierRank("IS-T3-skill-capsule"),
    resolveToolPresent: resolveTool?.name === "web_llm_resolve_shorthand",
    convertRoutingToolPresent: convertRoutingTool?.name === "hub_convert_is_routing",
    convertProposeToolPresent: convertProposeTool?.name === "hub_convert_propose_holes",
    convertApplyToolPresent: mod.findAgentTool("hub_convert_apply_holes")?.name === "hub_convert_apply_holes",
    convertEnrichToolPresent: mod.findAgentTool("hub_convert_llm_enrich")?.name === "hub_convert_llm_enrich",
    toolCountMin: manifest.tools.length >= 16,
    tierLogged,
    bundleExists: existsSync(exported.jsonPath ?? ""),
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_IS_RUNTIME_CLOSE_KIND,
    schemaVersion: HUB_IS_RUNTIME_CLOSE_SCHEMA_VERSION,
    ok,
    checks,
    exported: {
      count: exported.count,
      promotedCount: exported.promotedCount,
      tierRouting: exported.tierRouting ?? tierRouting,
    },
    resolveTiny: resolveDetail,
    generatedAt: new Date().toISOString(),
  };
}

export async function runIsRuntimeCloseSmokeWithProgress(opts = {}) {
  const progress = createSmokeProgress("is-runtime-close");
  const t0 = progress.start("IS runtime protocol close (G8600)");
  const report = await runIsRuntimeCloseSmoke(opts);
  progress.end("IS runtime protocol close (G8600)", report.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G8600",
    ok: report.ok === true,
    detail: report.checks,
  });
  return report;
}

async function main() {
  const report = await runIsRuntimeCloseSmokeWithProgress();
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
