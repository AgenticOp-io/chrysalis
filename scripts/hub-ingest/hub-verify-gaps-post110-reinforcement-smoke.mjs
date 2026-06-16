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
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { prewarmFlagshipVerifyEmits } from "./hub-verify-replay.mjs";

export const HUB_VERIFY_GAPS_POST110_REINFORCEMENT_KIND =
  "chrysalis.hub.verify-gaps-post110-reinforcement-smoke";
export const HUB_VERIFY_GAPS_POST110_REINFORCEMENT_SCHEMA_VERSION = 1;

/** @param {{ skipHttp?: boolean }} [opts] */
export async function runVerifyGapsPost110ReinforcementSmoke(opts = {}) {
  const skipHttp = opts.skipHttp === true || process.env.CHRYSALIS_POST110_SKIP_HTTP === "1";
  const progress = createSmokeProgress("post110-reinforcement");

  // B1 — auth-probe strict reingest + verify seed closure
  let t0 = progress.start("B1 auth-probe reingest");
  const b1AuthProbeReingest = await runLaravelAuthProbeReingestSmoke();
  progress.end("B1 auth-probe reingest", b1AuthProbeReingest.ok === true, t0);
  t0 = progress.start("B1 verify closure");
  const b1VerifyClosure = await runLaravelAuthProbeReingestVerifyClosureSmoke();
  progress.end("B1 verify closure", b1VerifyClosure.ok === true, t0);

  // B2 — replay after reingest across flagships
  let b2AuthProbeReplay = { ok: true, skip: "http-skipped" };
  let b2FlagshipReplay = { ok: true, skip: "http-skipped" };
  if (!skipHttp) {
    t0 = progress.start("B2 auth-probe replay");
    b2AuthProbeReplay = await runLaravelAuthProbeReingestVerifyReplaySmoke();
    progress.end("B2 auth-probe replay", b2AuthProbeReplay.ok === true, t0);
    t0 = progress.start("B2 flagship replay batch");
    b2FlagshipReplay = await runFlagshipVerifyReplayBatchSmoke();
    progress.end("B2 flagship replay batch", b2FlagshipReplay.ok === true, t0);
  } else {
    progress.defer("B2 replay", "skipHttp");
  }

  // B3 — HTTP oracle verify (hono) + multi-flagship
  let b3AuthProbeHttp = { ok: true, skip: "http-skipped" };
  let b3FlagshipHttp = { ok: true, skip: "http-skipped" };
  if (!skipHttp) {
    t0 = progress.start("prewarm flagship verify emits");
    const prewarm = await prewarmFlagshipVerifyEmits({ progress });
    progress.end("prewarm flagship verify emits", prewarm.ok === true, t0);
    t0 = progress.start("B3 auth-probe HTTP hono");
    b3AuthProbeHttp = await runLaravelAuthProbeReingestVerifyHttpSmoke();
    progress.end("B3 auth-probe HTTP hono", b3AuthProbeHttp.ok === true, t0);
    t0 = progress.start("B3 flagship HTTP hono batch");
    b3FlagshipHttp = await runFlagshipVerifyHttpBatchSmoke();
    progress.end("B3 flagship HTTP hono batch", b3FlagshipHttp.ok === true, t0);
  } else {
    progress.defer("B3 HTTP hono", "skipHttp");
  }

  // B4 — Fastify HTTP + IR helper embed (B4 depth)
  let b4AuthProbeFastify = { ok: true, skip: "http-skipped" };
  let b4FlagshipFastify = { ok: true, skip: "http-skipped" };
  if (!skipHttp) {
    t0 = progress.start("B4 auth-probe HTTP fastify");
    b4AuthProbeFastify = await runLaravelAuthProbeVerifyHttpFastify();
    progress.end("B4 auth-probe HTTP fastify", b4AuthProbeFastify.ok === true, t0);
    t0 = progress.start("B4 flagship HTTP fastify batch");
    b4FlagshipFastify = await runFlagshipVerifyHttpFastifyBatchSmoke();
    progress.end("B4 flagship HTTP fastify batch", b4FlagshipFastify.ok === true, t0);
  } else {
    progress.defer("B4 HTTP fastify", "skipHttp");
  }
  t0 = progress.start("B4 IR helper embed");
  const b4IrHelperEmbed = runIrHelperLiftingEmbedSmoke();
  progress.end("B4 IR helper embed", b4IrHelperEmbed.ok === true, t0);

  // B5 — graduation: dual-backend reingest HTTP + IR helper B1–B4 full path
  let b5AuthProbeReingestFastify = { ok: true, skip: "http-skipped" };
  if (!skipHttp) {
    t0 = progress.start("B5 auth-probe reingest fastify HTTP");
    b5AuthProbeReingestFastify = await runLaravelAuthProbeReingestVerifyHttpFastifySmoke();
    progress.end("B5 auth-probe reingest fastify HTTP", b5AuthProbeReingestFastify.ok === true, t0);
  } else {
    progress.defer("B5 reingest fastify HTTP", "skipHttp");
  }
  t0 = progress.start("B5 IR helper full path");
  const b5IrHelperFullPath = runIrHelperLiftingFullPathSmoke();
  progress.end("B5 IR helper full path", b5IrHelperFullPath.ok === true, t0);

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
