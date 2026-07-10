#!/usr/bin/env node
/**
 * Convert aim persistence close (G9550 / D6375).
 * Inspired by CynoEngine — refuse contentless proceed without aim. Not a code port.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_CONVERT_AIM_PERSIST_KIND = "chrysalis.hub.convert-aim-persist-smoke";
export const HUB_CONVERT_AIM_PERSIST_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runConvertAimPersistSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();

  const stallNoAim = mod.evaluateAimDrive({ aim: null, nudge: "proceed" });
  const stallMissing = mod.evaluateAimDrive({
    aim: null,
    nudge: "convert laravelMin to hono",
  });
  const aim = mod.createConvertAim({
    domainId: "laravelMin",
    successGate: "verify-green",
    origin: "php",
    output: "hono",
  });
  const continueAim = mod.evaluateAimDrive({ aim, nudge: "ok" });
  const held = mod.evaluateAimDrive({ aim, nudge: "run another round on laravelMin" });
  const stallRound = mod.shouldStallAfterRound({
    aim,
    advancedAim: false,
    ranVerify: false,
  });
  const progressRound = mod.shouldStallAfterRound({
    aim,
    advancedAim: false,
    ranVerify: true,
  });

  const tool = mod.findAgentTool("hub_convert_evaluate_aim");
  const checks = {
    stallContentless: stallNoAim.stall === true && stallNoAim.ok === false,
    stallMissingAim: stallMissing.stall === true,
    continuePersisted: continueAim.ok === true && continueAim.stall === false,
    heldConcrete: held.ok === true,
    stallIdleRound: stallRound.stall === true,
    progressOk: progressRound.ok === true && progressRound.stall === false,
    aimAttribution: aim.attribution === mod.CYNOENGINE_ATTRIBUTION,
    toolPresent: tool?.name === "hub_convert_evaluate_aim",
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_CONVERT_AIM_PERSIST_KIND,
    schemaVersion: HUB_CONVERT_AIM_PERSIST_SCHEMA_VERSION,
    ok,
    checks,
    aim: {
      domainId: aim.domainId,
      successGate: aim.successGate,
      attribution: aim.attribution,
    },
    collaborationAttribution: mod.CYNOENGINE_ATTRIBUTION,
    generatedAt: new Date().toISOString(),
  };
}

export async function runConvertAimPersistSmokeWithProgress(opts = {}) {
  const progress = createSmokeProgress("convert-aim-persist");
  const t0 = progress.start("Convert aim persist (G9550)");
  const report = await runConvertAimPersistSmoke(opts);
  progress.end("Convert aim persist (G9550)", report.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G9550",
    ok: report.ok === true,
    detail: report.checks,
  });
  return report;
}

async function main() {
  const report = await runConvertAimPersistSmokeWithProgress();
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
