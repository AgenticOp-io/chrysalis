#!/usr/bin/env node
/**
 * Convert governor close (G9540 / D6375).
 * Inspired by CynoEngine — GREEN/YELLOW/RED visible STOP half. Not a code port.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_CONVERT_GOVERNOR_KIND = "chrysalis.hub.convert-governor-smoke";
export const HUB_CONVERT_GOVERNOR_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runConvertGovernorSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();

  const green = mod.classifyConvertAction("hub_convert_is_routing");
  const yellow = mod.classifyConvertAction("hub_convert_propose_holes");
  const red = mod.classifyConvertAction("hub_convert_apply_holes");
  const deny = mod.classifyConvertAction("bypass_verify");
  const redBlocked = mod.governConvertAction({
    action: "hub_convert_apply_holes",
    confirmApply: false,
    verifyGatePass: true,
  });
  const redOk = mod.governConvertAction({
    action: "hub_convert_apply_holes",
    confirmApply: true,
    verifyGatePass: true,
  });
  const redNoVerify = mod.governConvertAction({
    action: "hub_convert_apply_holes",
    confirmApply: true,
    verifyGatePass: false,
  });

  const tool = mod.findAgentTool("hub_convert_govern_action");
  const checks = {
    greenTier: green.tier === "GREEN" && green.allowed === true,
    yellowTier: yellow.tier === "YELLOW",
    redTier: red.tier === "RED" && red.requiresConfirm === true && red.requiresVerifyGreen === true,
    denyBlocked: deny.tier === "DENY" && deny.allowed === false,
    redNeedsConfirm: redBlocked.ok === false,
    redNeedsVerify: redNoVerify.ok === false,
    redPass: redOk.ok === true,
    attribution: green.attribution === mod.CYNOENGINE_ATTRIBUTION,
    toolPresent: tool?.name === "hub_convert_govern_action",
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_CONVERT_GOVERNOR_KIND,
    schemaVersion: HUB_CONVERT_GOVERNOR_SCHEMA_VERSION,
    ok,
    checks,
    samples: { green, yellow, red, deny },
    collaborationAttribution: mod.CYNOENGINE_ATTRIBUTION,
    generatedAt: new Date().toISOString(),
  };
}

export async function runConvertGovernorSmokeWithProgress(opts = {}) {
  const progress = createSmokeProgress("convert-governor");
  const t0 = progress.start("Convert governor (G9540)");
  const report = await runConvertGovernorSmoke(opts);
  progress.end("Convert governor (G9540)", report.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G9540",
    ok: report.ok === true,
    detail: report.checks,
  });
  return report;
}

async function main() {
  const report = await runConvertGovernorSmokeWithProgress();
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
