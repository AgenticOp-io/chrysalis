#!/usr/bin/env node
/** One-command web-LLM + WISP POC demo for operators and sponsors. */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { runWebLlmPoc } from "./web-llm-run-poc.mjs";
import { runWebLlmBuildPocHub } from "./web-llm-build-poc-hub.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

function runBuildWebLlm() {
  const r = spawnSync("pnpm", ["--filter", "@chrysalis/web-llm", "build"], {
    cwd: scriptRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return (r.status ?? 1) === 0;
}

export async function runWebLlmDemo(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipBuild = opts.skipBuild === true || process.env.CHRYSALIS_POC_SKIP_BUILD === "1";
  const liveStrict = process.env.CHRYSALIS_WISP_POC_LIVE === "1";

  if (!skipBuild) {
    const built = runBuildWebLlm();
    if (!built) return { ok: false, skip: "web-llm-build-failed" };
  }

  const mod = await loadWebLlm();
  const { report, outPath, trajectoryPath } = await runWebLlmPoc({ repoRoot });
  const hub = await runWebLlmBuildPocHub({ repoRoot });
  const demoUrl = mod.resolveWispDemoBaseUrl(repoRoot);

  const liveScenario = report.scenarios.find((s) => s.id === "wisp-gce-live-anchors");
  const summary = {
    ok: report.ok === true,
    reportPath: outPath,
    hubPath: hub.indexPath,
    trajectoryPath,
    demoUrl,
    scenarioCount: report.scenarioCount,
    passCount: report.passCount,
    liveStrict,
    liveScenarioOk: liveScenario?.ok ?? null,
    wvbCaseCount: hub.caseCount,
    generatedAt: new Date().toISOString(),
  };

  return summary;
}

async function main() {
  const summary = await runWebLlmDemo();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
  console.error("");
  console.error("POC hub:", summary.hubPath);
  if (summary.demoUrl) console.error("WISP demo:", summary.demoUrl);
  console.error("Login: demo@wisptools.io (password from env CHRYSALIS_WISP_DEMO_PASSWORD)");
  if (existsSync(summary.hubPath)) {
    console.error("Open the hub HTML file in a browser to review scenario results.");
  }
}

if (process.argv[1]?.includes("web-llm-demo")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
