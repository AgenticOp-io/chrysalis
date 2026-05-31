#!/usr/bin/env node
/** Laravel live verify gaps closure v3: live backlog 0 + auth-probe verify closure/replay (G945). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLaravelVerifyGapsReport } from "./hub-laravel-verify-gaps.mjs";
import { runLaravelVerifyGapsAction } from "./hub-laravel-verify-gaps-action.mjs";
import { runLaravelAuthProbeReingestVerifyClosureSmoke } from "./hub-laravel-auth-probe-reingest-verify-closure-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyReplaySmoke } from "./hub-laravel-auth-probe-reingest-verify-replay-smoke.mjs";

export const HUB_LARAVEL_VERIFY_LIVE_GAPS_CLOSURE_KIND = "chrysalis.hub.laravel-verify-live-gaps-closure-smoke";
export const HUB_LARAVEL_VERIFY_LIVE_GAPS_CLOSURE_SCHEMA_VERSION = 3;

export async function runLaravelVerifyLiveGapsClosureSmoke() {
  const gaps = buildLaravelVerifyGapsReport();
  const action = runLaravelVerifyGapsAction();
  const authProbeVerifyClosure = await runLaravelAuthProbeReingestVerifyClosureSmoke();
  const authProbeVerifyReplay = await runLaravelAuthProbeReingestVerifyReplaySmoke();
  const backlogCount = gaps.backlog?.length ?? 0;
  const liveOk =
    gaps.ok === true &&
    gaps.skipped == null &&
    backlogCount === 0 &&
    (gaps.verify?.correctness ?? 0) >= 1;
  const postVerifyOk = authProbeVerifyClosure.ok === true || authProbeVerifyReplay.ok === true;
  const ok =
    liveOk &&
    postVerifyOk &&
    (backlogCount === 0 || (gaps.ingestNext != null && action.ok === true && action.ingestRemediation != null));
  return {
    kind: HUB_LARAVEL_VERIFY_LIVE_GAPS_CLOSURE_KIND,
    schemaVersion: HUB_LARAVEL_VERIFY_LIVE_GAPS_CLOSURE_SCHEMA_VERSION,
    ok,
    backlogCount,
    ingestNext: gaps.ingestNext?.divergenceKind ?? null,
    ingestRemediation: action.ingestRemediation?.divergenceKind ?? null,
    correctness: gaps.verify?.correctness ?? null,
    authProbeVerifyClosure: {
      ok: authProbeVerifyClosure.ok === true,
      backlogAfter: authProbeVerifyClosure.backlogAfter ?? null,
      correctnessAfter: authProbeVerifyClosure.correctnessAfter ?? null,
    },
    authProbeVerifyReplay: {
      ok: authProbeVerifyReplay.ok === true,
      backlogAfter: authProbeVerifyReplay.backlogAfter ?? null,
      correctnessAfter: authProbeVerifyReplay.correctnessAfter ?? null,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runLaravelVerifyLiveGapsClosureSmoke();
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
