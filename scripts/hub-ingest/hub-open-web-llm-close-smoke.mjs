#!/usr/bin/env node
/** Open web-LLM program close gate (G8290). */
import { existsSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { runOpenWebLlmEntryGate } from "./hub-open-web-llm-entry-smoke.mjs";
import { runOpenWebLlmHorizonBGate } from "./hub-open-web-llm-horizon-b-smoke.mjs";
import { runWebLlmBuildBenchmark } from "../web-llm-build-benchmark.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const OPEN_WEB_LLM_CLOSE_KIND = "chrysalis.web-llm.close-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runOpenWebLlmBenchmarkGate() {
  const r = await runWebLlmBuildBenchmark();
  return { ok: r.ok === true, build: r };
}

export async function runOpenWebLlmTrajectoryGate() {
  const mod = await loadWebLlm();
  const filePath = join(scriptRoot, "generated/_web-llm-smoke/trajectory.jsonl");
  if (existsSync(filePath)) unlinkSync(filePath);
  const sessionId = mod.createTrajectorySessionId("smoke");
  mod.appendTrajectoryRecord({
    filePath,
    sessionId,
    step: 1,
    role: "user",
    content: "build web verify benchmark",
  });
  mod.appendTrajectoryRecord({
    filePath,
    sessionId,
    step: 2,
    role: "tool",
    toolName: "web_llm_build_benchmark",
    content: "benchmark built",
  });
  mod.appendTrajectoryRecord({
    filePath,
    sessionId,
    step: 3,
    role: "assistant",
    content: "WVB ready",
    gate: { name: "web-llm-benchmark", ok: true },
  });
  const summary = mod.summarizeTrajectoryFile(filePath);
  const policy = mod.evaluateVerifyGatePolicy({ gateOk: true, verifyCorrectness: 1, holeCount: 0 });
  const badPolicy = mod.evaluateVerifyGatePolicy({ gateOk: false });
  return {
    ok: summary.ok === true && summary.recordCount === 3 && policy.ok === true && badPolicy.ok === false,
    summary,
    policy,
    badPolicy,
  };
}

export async function runOpenWebLlmMcpToolsGate() {
  const mod = await loadWebLlm();
  const manifest = mod.buildAgentToolManifest();
  const verifyTool = mod.findAgentTool("chrysalis_verify");
  const shorthandTool = mod.findAgentTool("web_llm_export_shorthand");
  const tierTool = mod.findAgentTool("web_llm_preferred_shorthand_tier");
  const resolveTool = mod.findAgentTool("web_llm_resolve_shorthand");
  const ok =
    manifest.kind === "chrysalis.web-llm.tool-manifest" &&
    manifest.tools.length >= 11 &&
    verifyTool?.name === "chrysalis_verify" &&
    shorthandTool?.name === "web_llm_export_shorthand" &&
    tierTool?.name === "web_llm_preferred_shorthand_tier" &&
    resolveTool?.name === "web_llm_resolve_shorthand";
  return {
    ok,
    toolCount: manifest.tools.length,
    verifyTool: verifyTool?.name ?? null,
    shorthandTool: shorthandTool?.name ?? null,
    tierTool: tierTool?.name ?? null,
    resolveTool: resolveTool?.name ?? null,
  };
}

export async function runOpenWebLlmCloseGate() {
  const entry = await runOpenWebLlmEntryGate();
  const benchmark = await runOpenWebLlmBenchmarkGate();
  const trajectory = await runOpenWebLlmTrajectoryGate();
  const mcp = await runOpenWebLlmMcpToolsGate();
  const horizonB = await runOpenWebLlmHorizonBGate();
  const ok = entry.ok && benchmark.ok && trajectory.ok && mcp.ok && horizonB.ok;
  return {
    kind: OPEN_WEB_LLM_CLOSE_KIND,
    schemaVersion: 1,
    ok,
    entry,
    benchmark,
    trajectory,
    mcp,
    horizonB,
    generatedAt: new Date().toISOString(),
  };
}

export async function runOpenWebLlmCloseSmoke() {
  const progress = createSmokeProgress("open-web-llm-close");
  const t0 = progress.start("Open web-LLM close (G8290)");
  const gate = await runOpenWebLlmCloseGate();
  progress.end("Open web-LLM close (G8290)", gate.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: scriptRoot,
    gateName: "G8290",
    ok: gate.ok === true,
    detail: { horizonB: gate.horizonB?.ok ?? false },
  });
  return {
    kind: OPEN_WEB_LLM_CLOSE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runOpenWebLlmCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-open-web-llm-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
