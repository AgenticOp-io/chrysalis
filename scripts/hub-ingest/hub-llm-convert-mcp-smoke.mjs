#!/usr/bin/env node
/** Phase 42b.1 — MCP convert tools (G8821). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runLlmAssistedConvertProgramDocGate } from "./hub-llm-assisted-convert-program-entry-smoke.mjs";
import { callWebLlmTool } from "../web-llm-tool-runner.mjs";

export const LLM_CONVERT_MCP_SMOKE_KIND = "chrysalis.llm-convert-mcp-smoke";
export const LLM_CONVERT_MCP_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/** G8821 — MCP tool surface includes convert assist tools; propose never auto-applies. */
export async function runLlmConvertMcpGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runLlmAssistedConvertProgramDocGate();
  const mod = await loadWebLlm();
  const tools = mod.chrysalisAgentToolDefinitions();
  const names = tools.map((t) => t.name);
  const resolveTool = mod.findAgentTool("web_llm_resolve_shorthand");
  const routingTool = mod.findAgentTool("hub_convert_is_routing");
  const proposeTool = mod.findAgentTool("hub_convert_propose_holes");

  const resolved = await callWebLlmTool(repoRoot, "web_llm_resolve_shorthand", { domainId: "tinyBlog" });
  const routing = await callWebLlmTool(repoRoot, "hub_convert_is_routing", {
    origin: "php",
    output: "hono",
    projectDir: "fixtures/tiny-blog",
  });
  const proposed = await callWebLlmTool(repoRoot, "hub_convert_propose_holes", {
    projectDir: "fixtures/db-query-unknown-receiver-probe",
  });

  const checks = {
    programOk: program.ok === true,
    resolveToolPresent: resolveTool?.name === "web_llm_resolve_shorthand",
    routingToolPresent: routingTool?.name === "hub_convert_is_routing",
    proposeToolPresent: proposeTool?.name === "hub_convert_propose_holes",
    toolCountMin: names.length >= 16,
    resolveOk: resolved.ok === true,
    routingOk: routing.ok === true,
    routingProposeOnly: routing.detail?.proposeOnly === true,
    proposeOk: proposed.ok === true,
    proposeNeverApplied: proposed.detail?.applied === false,
    allProposalsNoApply: (proposed.detail?.proposals ?? []).every((p) => p.apply === false),
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: LLM_CONVERT_MCP_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_MCP_SMOKE_SCHEMA_VERSION,
    ok,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertMcpSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-mcp");
  const t0 = progress.start("LLM convert MCP tools (G8821)");
  const gate = await runLlmConvertMcpGate(opts);
  progress.end("LLM convert MCP tools (G8821)", gate.ok === true, t0);
  return {
    kind: LLM_CONVERT_MCP_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_MCP_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runLlmConvertMcpSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-mcp-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
