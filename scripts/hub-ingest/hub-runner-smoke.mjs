#!/usr/bin/env node
/** Hub runner step smoke for php→hono translate path (G223). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hubJobSteps } from "../chrysalis-hub-runners.mjs";

export const HUB_RUNNER_SMOKE_KIND = "chrysalis.hub.runner-smoke";
export const HUB_RUNNER_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runHubRunnerSmoke() {
  const repo = scriptRoot;
  const cliBin = join(repo, "packages/cli/dist/bin.js");
  const projectDir = join(repo, "fixtures/hub-flagship-plain-php");
  const steps = hubJobSteps(
    repo,
    cliBin,
    projectDir,
    { sourceLang: "php", targetId: "hono", action: "hub-translate" },
  );
  const kinds = steps.map((s) => s.kind);
  const ok =
    kinds[0] === "hub-translate" &&
    kinds.includes("hub-evidence-gate") &&
    steps[0]?.argv?.some((arg) => String(arg).includes("hub-translate.mjs"));
  return {
    kind: HUB_RUNNER_SMOKE_KIND,
    schemaVersion: HUB_RUNNER_SMOKE_SCHEMA_VERSION,
    ok,
    stepKinds: kinds,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runHubRunnerSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
