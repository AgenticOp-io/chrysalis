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
    {
      name: "web_llm_export_shorthand",
      description:
        "Export verify-gated Intelligence Shorthand artifacts (IS-T3/T4/T5) from port reports and federation shards — CPU only, no GPU.",
      inputSchema: {
        type: "object",
        properties: {
          repoRoot: { type: "string" },
          buildHub: { type: "boolean", description: "Also build static shorthand POC hub when true" },
        },
        additionalProperties: false,
      },
    },
    {
      name: "web_llm_preferred_shorthand_tier",
      description:
        "Select the lowest IS tier (T5→T2) that can satisfy a verify-gated migration task without storing neural weights.",
      inputSchema: {
        type: "object",
        properties: {
          hasOracleReplay: { type: "boolean", description: "Oracle replay fully covers the task" },
          hasPolicyGraph: { type: "boolean", description: "CWL/WebIR policy graph covers the task" },
          needsNovelLanguage: {
            type: "boolean",
            description: "Task requires novel language not in policy/oracle (needs LoRA or base model)",
          },
          domainId: { type: "string", description: "Open Legacy domain id — uses corpus when set" },
          repoRoot: { type: "string", description: "Repo root for shorthand index lookup" },
        },
        required: ["hasOracleReplay", "hasPolicyGraph", "needsNovelLanguage"],
        additionalProperties: false,
      },
    },
    {
      name: "web_llm_resolve_shorthand",
      description:
        "Resolve Intelligence Shorthand tier + capsule for a chartered domain from the verify-gated corpus (IS runtime protocol).",
      inputSchema: {
        type: "object",
        properties: {
          domainId: { type: "string", description: "Open Legacy index domain id (e.g. tinyBlog)" },
          needsNovelLanguage: {
            type: "boolean",
            description: "When true, may route to IS-T2+ (LoRA/base model)",
          },
          repoRoot: { type: "string", description: "Repo root; defaults to cwd" },
        },
        required: ["domainId"],
        additionalProperties: false,
      },
    },
    {
      name: "hub_convert_is_routing",
      description:
        "Resolve IS tier routing for a hub convert pair (propose-only; logs trajectory when projectDir set).",
      inputSchema: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Hub origin language id (e.g. php)" },
          output: { type: "string", description: "Hub output language id (e.g. hono)" },
          projectDir: { type: "string", description: "Optional project workspace for trajectory logging" },
          repoRoot: { type: "string" },
        },
        required: ["origin", "output"],
        additionalProperties: false,
      },
    },
    {
      name: "hub_convert_propose_holes",
      description:
        "Propose hole patches for a translated project — verify-gated, never auto-applied (Phase 42 convert assist).",
      inputSchema: {
        type: "object",
        properties: {
          projectDir: { type: "string", description: "Project directory with ingest/status holes" },
          domainId: { type: "string", description: "Optional IS domain id for trajectory" },
          enrichWithLlm: { type: "boolean", description: "Enrich proposals with LLM/stub hints when true" },
          skipLlm: { type: "boolean", description: "Force IS skipLlm routing for enrichment" },
          tier: { type: "string", description: "IS tier label for LLM context" },
          repoRoot: { type: "string" },
        },
        required: ["projectDir"],
        additionalProperties: false,
      },
    },
    {
      name: "hub_convert_verify_gate",
      description: "Run oracle verify and record verify-before-apply gate on hole proposals.",
      inputSchema: {
        type: "object",
        properties: {
          projectDir: { type: "string" },
          repoRoot: { type: "string" },
        },
        required: ["projectDir"],
        additionalProperties: false,
      },
    },
    {
      name: "hub_convert_apply_holes",
      description:
        "Apply verify-gated hole proposals after operator confirm — requires verify correctness >= 1.",
      inputSchema: {
        type: "object",
        properties: {
          projectDir: { type: "string" },
          confirmApply: { type: "boolean", description: "Must be true to apply" },
          repoRoot: { type: "string" },
        },
        required: ["projectDir", "confirmApply"],
        additionalProperties: false,
      },
    },
    {
      name: "hub_convert_llm_enrich",
      description:
        "Enrich hole list with LLM or stub scaffold hints (respects skipLlm and API key env).",
      inputSchema: {
        type: "object",
        properties: {
          holes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                detail: { type: "string" },
              },
              required: ["name"],
            },
          },
          skipLlm: { type: "boolean" },
          domainId: { type: "string" },
          tier: { type: "string" },
          repoRoot: { type: "string" },
        },
        required: ["holes"],
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
