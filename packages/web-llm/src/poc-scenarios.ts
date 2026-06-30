import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { WEB_LLM_POC_SCENARIOS_KIND } from "./kinds.js";

export type PocScenarioStep =
  | { kind: "tool"; tool: string; toolInput?: Record<string, unknown> }
  | { kind: "check"; check: "min-wvb-cases" | "wisp-ui-anchors" | "wisp-ui-parity-manifest" | "wisp-demo-manifest" | "wisp-gce-live-anchors"; min?: number };

export type PocScenario = {
  id: string;
  title: string;
  userPrompt: string;
  steps: PocScenarioStep[];
  gateName: string;
  tags?: string[];
  optional?: boolean;
};

export type PocScenarioCatalog = {
  kind: typeof WEB_LLM_POC_SCENARIOS_KIND;
  schemaVersion: number;
  agenda?: string;
  demoUrl?: string;
  scenarios: PocScenario[];
};

export function loadPocScenarioCatalog(repoRoot: string): PocScenarioCatalog {
  const path = join(repoRoot, "fixtures/web-llm/chrysalis.web-llm-poc-scenarios.v1.json");
  if (!existsSync(path)) {
    throw new Error(`missing poc scenarios: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as PocScenarioCatalog;
}

export function listPocScenarios(repoRoot: string): PocScenario[] {
  return loadPocScenarioCatalog(repoRoot).scenarios ?? [];
}
