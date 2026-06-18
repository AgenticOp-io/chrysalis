#!/usr/bin/env node
/** Path advice smoke on plain-php flagship (G236). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyPathAdviceToProject } from "./hub-apply-path-advice.mjs";

export const HUB_PATH_ADVICE_SMOKE_KIND = "chrysalis.hub.path-advice-smoke";
export const HUB_PATH_ADVICE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

export async function runPathAdviceSmoke(projectDir = defaultFixture) {
  const report = await applyPathAdviceToProject({
    projectDir,
    origin: "php",
    output: "hono",
    programId: "api-slice",
  });
  return {
    kind: HUB_PATH_ADVICE_SMOKE_KIND,
    schemaVersion: HUB_PATH_ADVICE_SMOKE_SCHEMA_VERSION,
    ok:
      report.kind === "chrysalis.hub.apply-path-advice" &&
      report.pair?.grade != null &&
      (report.pipelineSteps?.length ?? 0) >= 4,
    grade: report.pair?.grade ?? null,
    programId: report.migrationProgram?.id ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPathAdviceSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
