#!/usr/bin/env node
/** Web-LLM agent POC close gate (G8300). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWebLlmPoc } from "../web-llm-run-poc.mjs";
import { runWebLlmBuildPocHub } from "../web-llm-build-poc-hub.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const OPEN_WEB_LLM_POC_KIND = "chrysalis.web-llm.poc-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runOpenWebLlmPocGate() {
  const mod = await loadWebLlm();
  const catalog = mod.loadPocScenarioCatalog(scriptRoot);
  const scenariosOk = (catalog.scenarios ?? []).length >= 4;
  const { report, trajectoryPath } = await runWebLlmPoc({ repoRoot: scriptRoot });
  const hub = await runWebLlmBuildPocHub({ repoRoot: scriptRoot });
  const trajectoryOk = existsSync(trajectoryPath);
  const hubOk = existsSync(hub.indexPath);
  const ok = scenariosOk && report.ok === true && trajectoryOk && hubOk;
  return {
    kind: OPEN_WEB_LLM_POC_KIND,
    schemaVersion: 1,
    ok,
    scenariosOk,
    report,
    hub,
    trajectoryPath,
    generatedAt: new Date().toISOString(),
  };
}

export async function runOpenWebLlmPocSmoke() {
  const progress = createSmokeProgress("open-web-llm-poc");
  const t0 = progress.start("Open web-LLM POC (G8300)");
  const gate = await runOpenWebLlmPocGate();
  progress.end("Open web-LLM POC (G8300)", gate.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: scriptRoot,
    gateName: "G8300",
    ok: gate.ok === true,
    detail: { passCount: gate.report?.passCount ?? 0 },
  });
  return gate;
}

async function main() {
  const r = await runOpenWebLlmPocSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-open-web-llm-poc-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
