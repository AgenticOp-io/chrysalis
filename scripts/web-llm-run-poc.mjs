#!/usr/bin/env node
/** Run scripted web-LLM agent POC scenarios (verify-gated trajectories). */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { callWebLlmTool } from "./web-llm-tool-runner.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

function parseArgs(argv) {
  const scenarioId = argv.includes("--scenario")
    ? argv[argv.indexOf("--scenario") + 1]
    : undefined;
  const outPath = argv.includes("--out")
    ? argv[argv.indexOf("--out") + 1]
    : join(scriptRoot, "reports/web-llm/poc/last-run.json");
  return { scenarioId, outPath };
}

export async function runWebLlmPoc(opts = {}) {
  const mod = await loadWebLlm();
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const catalog = mod.loadPocScenarioCatalog(repoRoot);
  let scenarios = catalog.scenarios ?? [];
  if (opts.scenarioId) {
    scenarios = scenarios.filter((s) => s.id === opts.scenarioId);
    if (scenarios.length === 0) {
      throw new Error(`unknown poc scenario: ${opts.scenarioId}`);
    }
  }
  const trajectoryPath = join(repoRoot, "reports/web-llm/poc/sessions.jsonl");
  mkdirSync(dirname(trajectoryPath), { recursive: true });

  const report = await mod.runAgentPoc({
    repoRoot,
    scenarios,
    demoUrl: catalog.demoUrl,
    trajectoryPath,
    runTool: (tool, toolInput) => callWebLlmTool(repoRoot, tool, toolInput),
  });

  const outPath = opts.outPath ?? join(repoRoot, "reports/web-llm/poc/last-run.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { report, outPath, trajectoryPath };
}

async function main() {
  const { scenarioId, outPath } = parseArgs(process.argv.slice(2));
  const { report } = await runWebLlmPoc({ scenarioId, outPath });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("web-llm-run-poc")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
