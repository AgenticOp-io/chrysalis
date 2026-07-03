#!/usr/bin/env node
/** Load Phase 42 convert POC scenario catalog (G8822). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const catalogPath = join(scriptRoot, "fixtures/web-llm/chrysalis.web-llm-convert-poc-scenarios.v1.json");

export const LLM_CONVERT_POC_SCENARIOS_KIND = "chrysalis.web-llm.convert-poc-scenarios";

/** @returns {import("@chrysalis/web-llm").PocScenarioCatalog} */
export function loadConvertPocScenarioCatalog(repoRoot = scriptRoot) {
  const path = join(repoRoot, "fixtures/web-llm/chrysalis.web-llm-convert-poc-scenarios.v1.json");
  if (!existsSync(path)) {
    throw new Error(`missing convert poc scenarios: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

export function listConvertPocScenarios(repoRoot = scriptRoot) {
  return loadConvertPocScenarioCatalog(repoRoot).scenarios ?? [];
}
