#!/usr/bin/env node
/** Delivery pipeline + hub runner batch smoke (G286). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runDeliveryPipelineBatch } from "./hub-delivery-pipeline-smoke.mjs";
import { runHubRunnerBatchSmoke } from "./hub-runner-batch-smoke.mjs";

export const HUB_DELIVERY_PIPELINE_RUNNER_SMOKE_KIND = "chrysalis.hub.delivery-pipeline-runner-smoke";
export const HUB_DELIVERY_PIPELINE_RUNNER_SMOKE_SCHEMA_VERSION = 2;

export async function runDeliveryPipelineRunnerSmoke() {
  const pipeline = await runDeliveryPipelineBatch(["plainPhp", "symfony", "express", "laravelMin"]);
  const runner = runHubRunnerBatchSmoke();
  return {
    kind: HUB_DELIVERY_PIPELINE_RUNNER_SMOKE_KIND,
    schemaVersion: HUB_DELIVERY_PIPELINE_RUNNER_SMOKE_SCHEMA_VERSION,
    ok: pipeline.ok === true && runner.ok === true,
    deliveryPipeline: pipeline,
    runnerBatch: runner,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runDeliveryPipelineRunnerSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
