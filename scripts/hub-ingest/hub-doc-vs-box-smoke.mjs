#!/usr/bin/env node
/**
 * Doc-vs-box smoke (G9590 / D6377).
 * Inspired by CynoEngine "trust the box" — docs claiming BUILT must match symbols/smokes.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_DOC_VS_BOX_KIND = "chrysalis.hub.doc-vs-box-smoke";
export const HUB_DOC_VS_BOX_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

const REQUIRED_SCRIPTS = [
  "hub:is-live-analytics-close-smoke",
  "hub:is-near-miss-salience-smoke",
  "hub:is-utility-prior-smoke",
  "hub:convert-governor-smoke",
  "hub:convert-aim-persist-smoke",
  "hub:is-evidence-used-utility-smoke",
  "hub:mcp-governor-coverage-smoke",
  "hub:convert-cycle-gate-smoke",
  "hub:doc-vs-box-smoke",
  "hub:migration-os-close-smoke",
];

const REQUIRED_EXPORTS = [
  "CYNOENGINE_ATTRIBUTION",
  "scoreNearMissCandidates",
  "recordEvidenceUsedUtility",
  "listGovernedAgentTools",
  "gateConvertCycle",
  "agentToolsGovernorCoverageOk",
];

export async function runDocVsBoxSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const scripts = pkg.scripts ?? {};
  const design = readFileSync(join(repoRoot, "DESIGN.md"), "utf8");
  const collab = readFileSync(join(repoRoot, "docs/CYNO-CHRYSALIS-COLLAB.md"), "utf8");
  const plan = readFileSync(join(repoRoot, "docs/STRATEGIC-PLAN.md"), "utf8");

  const missingScripts = REQUIRED_SCRIPTS.filter((s) => !scripts[s]);
  const missingExports = REQUIRED_EXPORTS.filter((name) => typeof mod[name] === "undefined");
  const smokeFiles = [
    "scripts/hub-ingest/hub-is-evidence-used-utility-smoke.mjs",
    "scripts/hub-ingest/hub-mcp-governor-coverage-smoke.mjs",
    "scripts/hub-ingest/hub-convert-cycle-gate-smoke.mjs",
    "scripts/hub-ingest/hub-doc-vs-box-smoke.mjs",
  ];
  const missingFiles = smokeFiles.filter((f) => !existsSync(join(repoRoot, f)));

  const checks = {
    scriptsPresent: missingScripts.length === 0,
    exportsPresent: missingExports.length === 0,
    smokeFilesPresent: missingFiles.length === 0,
    designD6375: design.includes("D6375"),
    designD6377: design.includes("D6377") || design.includes("G9560"),
    collabCitesCyno: collab.includes("nimbus7772017/CynoEngine"),
    planHasQueue: plan.includes("G9560") || plan.includes("G8550"),
    attributionString:
      typeof mod.CYNOENGINE_ATTRIBUTION === "string" &&
      mod.CYNOENGINE_ATTRIBUTION.includes("CynoEngine"),
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: HUB_DOC_VS_BOX_KIND,
    schemaVersion: HUB_DOC_VS_BOX_SCHEMA_VERSION,
    ok,
    checks,
    missingScripts,
    missingExports,
    missingFiles,
    collaborationAttribution: mod.CYNOENGINE_ATTRIBUTION,
    strategicPlanUrl:
      "https://github.com/AgenticOp-io/chrysalis/blob/main/docs/STRATEGIC-PLAN.md",
    generatedAt: new Date().toISOString(),
  };
}

export async function runDocVsBoxSmokeWithProgress(opts = {}) {
  const progress = createSmokeProgress("doc-vs-box");
  const t0 = progress.start("Doc vs box (G9590)");
  const report = await runDocVsBoxSmoke(opts);
  progress.end("Doc vs box (G9590)", report.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G9590",
    ok: report.ok === true,
    detail: report.checks,
  });
  return report;
}

async function main() {
  const report = await runDocVsBoxSmokeWithProgress();
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
