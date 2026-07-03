#!/usr/bin/env node
/** Phase 42b.2 — convert agent POC scenario (G8822). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runLlmAssistedConvertProgramDocGate } from "./hub-llm-assisted-convert-program-entry-smoke.mjs";
import { loadConvertPocScenarioCatalog } from "./hub-llm-convert-poc-scenarios.mjs";
import { runWebLlmConvertPoc } from "../web-llm-run-convert-poc.mjs";

export const LLM_CONVERT_POC_SMOKE_KIND = "chrysalis.llm-convert-poc-smoke";
export const LLM_CONVERT_POC_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G8822 — php→hono convert POC with verify-gated assist; hole scenario never auto-applies. */
export async function runLlmConvertPocGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runLlmAssistedConvertProgramDocGate();
  const catalog = loadConvertPocScenarioCatalog(repoRoot);
  const { report, trajectoryPath } = await runWebLlmConvertPoc({ repoRoot });
  const phpHono = (report.scenarios ?? []).find((s) => s.id === "php-hono-convert-verify");
  const holeScenario = (report.scenarios ?? []).find((s) => s.id === "convert-hole-propose-db-query");
  const checks = {
    programOk: program.ok === true,
    catalogOk: (catalog.scenarios ?? []).length >= 2,
    reportOk: report.ok === true,
    trajectoryExists: existsSync(trajectoryPath),
    phpHonoOk: phpHono?.ok === true,
    holeScenarioOk: holeScenario?.ok === true,
    passCountMin: (report.passCount ?? 0) >= 2,
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: LLM_CONVERT_POC_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_POC_SMOKE_SCHEMA_VERSION,
    ok,
    checks,
    report,
    trajectoryPath,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertPocSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-poc");
  const t0 = progress.start("LLM convert agent POC (G8822)");
  const gate = await runLlmConvertPocGate(opts);
  progress.end("LLM convert agent POC (G8822)", gate.ok === true, t0);
  return {
    kind: LLM_CONVERT_POC_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_POC_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runLlmConvertPocSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-poc-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
