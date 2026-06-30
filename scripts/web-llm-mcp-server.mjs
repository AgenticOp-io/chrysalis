#!/usr/bin/env node
/**
 * Minimal MCP stdio server exposing Chrysalis web-LLM agent tools.
 * Protocol: JSON-RPC 2.0 line-delimited (initialize, tools/list, tools/call).
 */
import { createInterface } from "node:readline";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { callWebLlmTool } from "./web-llm-tool-runner.mjs";

export const WEB_LLM_MCP_SERVER_KIND = "chrysalis.web-llm.mcp-server";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/** @param {string} name @param {Record<string, unknown>} args */
async function callTool(name, args) {
  return callWebLlmTool(scriptRoot, name, args);
}

/** @param {unknown} msg */
async function handleMessage(msg) {
  const m = /** @type {{ jsonrpc?: string, id?: number|string, method?: string, params?: Record<string, unknown> }} */ (msg);
  if (m.jsonrpc !== "2.0" || m.method === undefined) return null;

  if (m.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: m.id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "chrysalis-web-llm", version: "0.1.0" },
        capabilities: { tools: {} },
      },
    };
  }

  if (m.method === "notifications/initialized") return null;

  if (m.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: m.id,
      result: { tools: (await loadWebLlm()).chrysalisAgentToolDefinitions().map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })) },
    };
  }

  if (m.method === "tools/call") {
    const params = m.params ?? {};
    const name = String(params.name ?? "");
    const args = /** @type {Record<string, unknown>} */ (params.arguments ?? {});
    const result = await callTool(name, args);
    return {
      jsonrpc: "2.0",
      id: m.id,
      result: {
        content: [
          {
            type: "text",
            text: result.stdout || result.stderr || JSON.stringify(result),
          },
        ],
        isError: result.ok !== true,
      },
    };
  }

  return {
    jsonrpc: "2.0",
    id: m.id,
    error: { code: -32601, message: `Method not found: ${m.method}` },
  };
}

export async function runWebLlmMcpServer() {
  const rl = createInterface({ input: process.stdin, terminal: false });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      const response = await handleMessage(msg);
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (e) {
      process.stdout.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: String(e) },
        })}\n`,
      );
    }
  }
}

if (process.argv[1]?.includes("web-llm-mcp-server")) {
  runWebLlmMcpServer().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
