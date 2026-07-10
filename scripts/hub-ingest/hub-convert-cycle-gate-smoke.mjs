#!/usr/bin/env node
/**
 * Convert cycle gate — aim + governor (G9580 / D6377).
 * Inspired by CynoEngine — refuse contentless proceed; STOP half on each cycle.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_CONVERT_CYCLE_GATE_KIND = "chrysalis.hub.convert-cycle-gate-smoke";
export const HUB_CONVERT_CYCLE_GATE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runConvertCycleGateSmoke(opts = {}) {
  const mod = await loadWebLlm();
  const stall = mod.gateConvertCycle({
    aim: null,
    nudge: "proceed",
    action: "hub_convert_propose_holes",
  });
  const aim = mod.createConvertAim({ domainId: "laravelMin", successGate: "verify-green" });
  const yellowOk = mod.gateConvertCycle({
    aim,
    nudge: "ok",
    action: "hub_convert_propose_holes",
  });
  const redBlocked = mod.gateConvertCycle({
    aim,
    nudge: "apply",
    action: "hub_convert_apply_holes",
    confirmApply: false,
    verifyGatePass: true,
  });
  const redOk = mod.gateConvertCycle({
    aim,
    nudge: "apply now",
    action: "hub_convert_apply_holes",
    confirmApply: true,
    verifyGatePass: true,
  });
  const idleRound = mod.gateConvertCycle({
    aim,
    nudge: "continue",
    action: "hub_convert_propose_holes",
    checkRoundStall: true,
    advancedAim: false,
    ranVerify: false,
  });

  const checks = {
    stallContentless: stall.stall === true && stall.ok === false,
    yellowPass: yellowOk.ok === true && yellowOk.governor.tier === "YELLOW",
    redNeedsConfirm: redBlocked.ok === false,
    redPass: redOk.ok === true,
    idleStall: idleRound.stall === true,
    attribution: stall.attribution === mod.CYNOENGINE_ATTRIBUTION,
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: HUB_CONVERT_CYCLE_GATE_KIND,
    schemaVersion: HUB_CONVERT_CYCLE_GATE_SCHEMA_VERSION,
    ok,
    checks,
    collaborationAttribution: mod.CYNOENGINE_ATTRIBUTION,
    generatedAt: new Date().toISOString(),
  };
}

export async function runConvertCycleGateSmokeWithProgress(opts = {}) {
  const progress = createSmokeProgress("convert-cycle-gate");
  const t0 = progress.start("Convert cycle gate (G9580)");
  const report = await runConvertCycleGateSmoke(opts);
  progress.end("Convert cycle gate (G9580)", report.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G9580",
    ok: report.ok === true,
    detail: report.checks,
  });
  return report;
}

async function main() {
  const report = await runConvertCycleGateSmokeWithProgress();
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
