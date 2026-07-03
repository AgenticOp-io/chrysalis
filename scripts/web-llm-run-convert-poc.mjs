#!/usr/bin/env node
/** Run Phase 42 convert agent POC scenarios (G8822). */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { callWebLlmTool } from "./web-llm-tool-runner.mjs";
import { loadConvertPocScenarioCatalog } from "./hub-ingest/hub-llm-convert-poc-scenarios.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runWebLlmConvertPoc(opts = {}) {
  const mod = await loadWebLlm();
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const catalog = loadConvertPocScenarioCatalog(repoRoot);
  let scenarios = catalog.scenarios ?? [];
  if (opts.scenarioId) {
    scenarios = scenarios.filter((s) => s.id === opts.scenarioId);
    if (scenarios.length === 0) throw new Error(`unknown convert poc scenario: ${opts.scenarioId}`);
  }
  const trajectoryPath = join(repoRoot, "reports/web-llm/convert-poc/sessions.jsonl");
  mkdirSync(dirname(trajectoryPath), { recursive: true });

  const report = await mod.runAgentPoc({
    repoRoot,
    scenarios,
    trajectoryPath,
    runTool: (tool, toolInput) => callWebLlmTool(repoRoot, tool, toolInput),
  });

  const outPath = opts.outPath ?? join(repoRoot, "reports/web-llm/convert-poc/last-run.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { report, outPath, trajectoryPath, catalog };
}

async function main() {
  const scenarioId = process.argv.includes("--scenario")
    ? process.argv[process.argv.indexOf("--scenario") + 1]
    : undefined;
  const { report } = await runWebLlmConvertPoc({ scenarioId });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("web-llm-run-convert-poc")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
