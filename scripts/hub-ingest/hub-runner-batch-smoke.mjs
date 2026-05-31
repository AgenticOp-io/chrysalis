#!/usr/bin/env node
/** Hub runner batch: plain-php + symfony + express translate step shapes (G280/G306). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hubJobSteps } from "../chrysalis-hub-runners.mjs";

export const HUB_RUNNER_BATCH_SMOKE_KIND = "chrysalis.hub.runner-batch-smoke";
export const HUB_RUNNER_BATCH_SMOKE_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function runnerShapeOk(projectDir, label, sourceLang) {
  const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");
  const steps = hubJobSteps(scriptRoot, cliBin, projectDir, {
    sourceLang,
    targetId: "hono",
    action: "hub-translate",
  });
  const kinds = steps.map((s) => s.kind);
  return {
    label,
    ok:
      kinds[0] === "hub-translate" &&
      kinds.includes("hub-evidence-gate") &&
      steps[0]?.argv?.some((arg) => String(arg).includes("hub-translate.mjs")),
    stepKinds: kinds,
  };
}

export function runHubRunnerBatchSmoke() {
  const plainPhp = runnerShapeOk(join(scriptRoot, "fixtures/hub-flagship-plain-php"), "plainPhp", "php");
  const symfony = runnerShapeOk(join(scriptRoot, "fixtures/hub-flagship-symfony"), "symfony", "php");
  const express = runnerShapeOk(join(scriptRoot, "fixtures/hub-flagship-express"), "express", "javascript");
  return {
    kind: HUB_RUNNER_BATCH_SMOKE_KIND,
    schemaVersion: HUB_RUNNER_BATCH_SMOKE_SCHEMA_VERSION,
    ok: plainPhp.ok && symfony.ok && express.ok,
    profiles: { plainPhp, symfony, express },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runHubRunnerBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
