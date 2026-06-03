#!/usr/bin/env node
/**
 * Post–queue 110 Phase B: hub verify-gaps months 26–30 reinforcement (B1–B5).
 * See docs/CWL-FULLSTACK-POST-110-PROGRAM.md.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runLaravelAuthProbeReingestSmoke } from "./hub-laravel-auth-probe-reingest-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyClosureSmoke } from "./hub-laravel-auth-probe-reingest-verify-closure-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyReplaySmoke } from "./hub-laravel-auth-probe-reingest-verify-replay-smoke.mjs";
import { runFlagshipVerifyReplayBatchSmoke } from "./hub-flagship-verify-replay-batch-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyHttpSmoke } from "./hub-laravel-auth-probe-reingest-verify-http-smoke.mjs";
import { runFlagshipVerifyHttpBatchSmoke } from "./hub-flagship-verify-http-batch-smoke.mjs";
import { runLaravelAuthProbeVerifyHttpFastify } from "./hub-laravel-auth-probe-verify-http-fastify.mjs";
import { runFlagshipVerifyHttpFastifyBatchSmoke } from "./hub-flagship-verify-http-fastify-batch-smoke.mjs";
import { runIrHelperLiftingEmbedSmoke } from "./hub-ir-helper-lifting-embed-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyHttpFastifySmoke } from "./hub-laravel-auth-probe-reingest-verify-http-fastify-smoke.mjs";
import { runIrHelperLiftingFullPathSmoke } from "./hub-ir-helper-lifting-full-path-smoke.mjs";

export const HUB_VERIFY_GAPS_POST110_REINFORCEMENT_KIND =
  "chrysalis.hub.verify-gaps-post110-reinforcement-smoke";
export const HUB_VERIFY_GAPS_POST110_REINFORCEMENT_SCHEMA_VERSION = 1;

/** @param {{ skipHttp?: boolean }} [opts] */
export async function runVerifyGapsPost110ReinforcementSmoke(opts = {}) {
  const skipHttp = opts.skipHttp === true || process.env.CHRYSALIS_POST110_SKIP_HTTP === "1";

  // B1 — auth-probe strict reingest + verify seed closure
  const b1AuthProbeReingest = await runLaravelAuthProbeReingestSmoke();
  const b1VerifyClosure = await runLaravelAuthProbeReingestVerifyClosureSmoke();

  // B2 — replay after reingest across flagships
  const b2AuthProbeReplay = skipHttp
    ? { ok: true, skip: "http-skipped" }
    : await runLaravelAuthProbeReingestVerifyReplaySmoke();
  const b2FlagshipReplay = skipHttp
    ? { ok: true, skip: "http-skipped" }
    : await runFlagshipVerifyReplayBatchSmoke();

  // B3 — HTTP oracle verify (hono) + multi-flagship
  const b3AuthProbeHttp = skipHttp
    ? { ok: true, skip: "http-skipped" }
    : await runLaravelAuthProbeReingestVerifyHttpSmoke();
  const b3FlagshipHttp = skipHttp
    ? { ok: true, skip: "http-skipped" }
    : await runFlagshipVerifyHttpBatchSmoke();

  // B4 — Fastify HTTP + IR helper embed (B4 depth)
  const b4AuthProbeFastify = skipHttp
    ? { ok: true, skip: "http-skipped" }
    : await runLaravelAuthProbeVerifyHttpFastify();
  const b4FlagshipFastify = skipHttp
    ? { ok: true, skip: "http-skipped" }
    : await runFlagshipVerifyHttpFastifyBatchSmoke();
  const b4IrHelperEmbed = runIrHelperLiftingEmbedSmoke();

  // B5 — graduation: dual-backend reingest HTTP + IR helper B1–B4 full path
  const b5AuthProbeReingestFastify = skipHttp
    ? { ok: true, skip: "http-skipped" }
    : await runLaravelAuthProbeReingestVerifyHttpFastifySmoke();
  const b5IrHelperFullPath = runIrHelperLiftingFullPathSmoke();

  const ok =
    b1AuthProbeReingest.ok === true &&
    b1VerifyClosure.ok === true &&
    b2AuthProbeReplay.ok === true &&
    b2FlagshipReplay.ok === true &&
    b3AuthProbeHttp.ok === true &&
    b3FlagshipHttp.ok === true &&
    b4AuthProbeFastify.ok === true &&
    b4FlagshipFastify.ok === true &&
    b4IrHelperEmbed.ok === true &&
    b5AuthProbeReingestFastify.ok === true &&
    b5IrHelperFullPath.ok === true;

  return {
    kind: HUB_VERIFY_GAPS_POST110_REINFORCEMENT_KIND,
    schemaVersion: HUB_VERIFY_GAPS_POST110_REINFORCEMENT_SCHEMA_VERSION,
    ok,
    phaseB: {
      b1: { authProbeReingest: b1AuthProbeReingest, verifyClosure: b1VerifyClosure },
      b2: { authProbeReplay: b2AuthProbeReplay, flagshipReplay: b2FlagshipReplay },
      b3: { authProbeHttp: b3AuthProbeHttp, flagshipHttp: b3FlagshipHttp },
      b4: {
        authProbeFastify: b4AuthProbeFastify,
        flagshipFastify: b4FlagshipFastify,
        irHelperEmbed: b4IrHelperEmbed,
      },
      b5: { authProbeReingestFastify: b5AuthProbeReingestFastify, irHelperFullPath: b5IrHelperFullPath },
    },
    requireStrictReingestEnv: "CHRYSALIS_HUB_GAP_REINGEST_STRICT",
    requireVerifyClosureEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE",
    requireVerifyReplayEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY",
    requireVerifyHttpEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP",
    requireVerifyHttpTargetEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET",
    skipHttp,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runVerifyGapsPost110ReinforcementSmoke();
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
