import { WEB_LLM_TOOL_MANIFEST_KIND, WEB_LLM_TOOL_MANIFEST_SCHEMA_VERSION } from "./kinds.js";
import type { AgentToolDefinition } from "./types.js";

export function chrysalisAgentToolDefinitions(): AgentToolDefinition[] {
  return [
    {
      name: "chrysalis_status",
      description: "Run chrysalis status --json on a project directory.",
      inputSchema: {
        type: "object",
        properties: {
          projectDir: { type: "string", description: "Absolute or repo-relative project path" },
        },
        required: ["projectDir"],
        additionalProperties: false,
      },
    },
    {
      name: "chrysalis_verify",
      description: "Run chrysalis verify --project on a translated project (oracle replay).",
      inputSchema: {
        type: "object",
        properties: {
          projectDir: { type: "string" },
          jsonSummary: { type: "boolean", description: "Emit machine JSON summary when true" },
        },
        required: ["projectDir"],
        additionalProperties: false,
      },
    },
    {
      name: "chrysalis_ingest",
      description: "Ingest a PHP or hub origin tree into WebIR.",
      inputSchema: {
        type: "object",
        properties: {
          originDir: { type: "string" },
          language: { type: "string", enum: ["php", "svelte", "nextjs", "hub"] },
        },
        required: ["originDir"],
        additionalProperties: false,
      },
    },
    {
      name: "chrysalis_insight",
      description: "Run chrysalis insight for migration debt and hole economics.",
      inputSchema: {
        type: "object",
        properties: {
          projectDir: { type: "string" },
        },
        required: ["projectDir"],
        additionalProperties: false,
      },
    },
    {
      name: "web_llm_record_trajectory",
      description: "Append a verify-gated step to a trajectory JSONL file.",
      inputSchema: {
        type: "object",
        properties: {
          filePath: { type: "string" },
          sessionId: { type: "string" },
          step: { type: "number" },
          role: { type: "string", enum: ["user", "assistant", "system", "tool"] },
          content: { type: "string" },
          gateName: { type: "string" },
          gateOk: { type: "boolean" },
          unverified: { type: "boolean" },
        },
        required: ["filePath", "sessionId", "step", "role"],
        additionalProperties: false,
      },
    },
    {
      name: "web_llm_build_leaderboard",
      description: "Build static WVB leaderboard HTML + JSON under reports/web-llm/leaderboard/",
      inputSchema: {
        type: "object",
        properties: {
          repoRoot: { type: "string" },
          outDir: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    {
      name: "web_llm_export_dataset",
      description: "Export verify-gated training shards from trajectory JSONL files.",
      inputSchema: {
        type: "object",
        properties: {
          repoRoot: { type: "string" },
          outDir: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    {
      name: "web_llm_build_benchmark",
      description: "Build the in-repo Web Verify Benchmark (WVB) manifest from fixtures.",
      inputSchema: {
        type: "object",
        properties: {
          repoRoot: { type: "string" },
          outPath: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  ];
}

export function buildAgentToolManifest() {
  return {
    kind: WEB_LLM_TOOL_MANIFEST_KIND,
    schemaVersion: WEB_LLM_TOOL_MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    tools: chrysalisAgentToolDefinitions(),
  };
}

export function findAgentTool(name: string): AgentToolDefinition | undefined {
  return chrysalisAgentToolDefinitions().find((t) => t.name === name);
}
