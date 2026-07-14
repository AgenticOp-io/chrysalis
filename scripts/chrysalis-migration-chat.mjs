#!/usr/bin/env node
/**
 * Migration Chat — human + AI session loop over Chrysalis agent tools.
 * Models propose via tools; verify / governor dispose. No LiteRT.
 *
 * Interactive:  pnpm run chrysalis:chat
 * Scripted:     pnpm run chrysalis:chat -- --script path/to/turns.txt
 * CLI:          chrysalis chat …
 *
 * Turn file lines (pipe-separated):
 *   say|user message
 *   tools|
 *   call|toolName|{"json":"args"}
 *   status|
 *   quit|
 */
import { createInterface } from "node:readline";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { callWebLlmTool } from "./web-llm-tool-runner.mjs";

export const MIGRATION_CHAT_KIND = "chrysalis.migration-chat.session";
export const MIGRATION_CHAT_SCHEMA_VERSION = 1;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/web-llm/dist/index.js")).href);
  }
}

function defaultTrajectoryPath() {
  return join(ROOT, "reports/web-llm/migration-chat/session.jsonl");
}

function printBanner(session) {
  console.log(`
Chrysalis Migration Chat
  Works best with an AI assistant (Cursor / MCP / this chat).
  Models propose; WebIR + oracle + verify dispose.
  LiteRT.js is not supported — use MCP / API LLM / IS tooling.

Session: ${session.sessionId}
Trajectory: ${session.trajectoryPath}
Commands: help | tools | status | say <text> | call <tool> <json> | quit
RED tools (apply) require confirmApply:true + verifyGatePass:true in JSON args.
`);
}

/**
 * @param {{
 *   trajectoryPath?: string,
 *   sessionId?: string,
 *   repoRoot?: string,
 * }} [opts]
 */
export async function createMigrationChatSession(opts = {}) {
  const mod = await loadWebLlm();
  const repoRoot = opts.repoRoot || ROOT;
  const trajectoryPath = opts.trajectoryPath || defaultTrajectoryPath();
  mkdirSync(dirname(trajectoryPath), { recursive: true });
  const sessionId = opts.sessionId || mod.createTrajectorySessionId("migration-chat");
  let step = mod.nextTrajectoryStep(trajectoryPath);

  mod.appendTrajectoryRecord({
    filePath: trajectoryPath,
    sessionId,
    step: step++,
    role: "system",
    content:
      "Migration Chat session start. AI Assist recommended. Verify still disposes. LiteRT refused.",
    unverified: true,
  });

  return {
    kind: MIGRATION_CHAT_KIND,
    schemaVersion: MIGRATION_CHAT_SCHEMA_VERSION,
    sessionId,
    trajectoryPath,
    repoRoot,
    step,
    mod,
  };
}

/**
 * @param {Awaited<ReturnType<typeof createMigrationChatSession>>} session
 * @param {string} line
 */
export async function handleMigrationChatLine(session, line) {
  const raw = String(line || "").trim();
  if (!raw) return { ok: true, empty: true };

  const { mod, trajectoryPath, sessionId, repoRoot } = session;

  if (raw === "help" || raw === "?") {
    return {
      ok: true,
      reply:
        "help | tools | status | say <text> | call <tool> <json> | quit\n" +
        "AI Assist: pnpm run web-llm:mcp-server + fixtures/web-llm/cursor-mcp.example.json\n" +
        "Docs: docs/AI-ASSIST.md",
    };
  }

  if (raw === "quit" || raw === "exit") {
    mod.appendTrajectoryRecord({
      filePath: trajectoryPath,
      sessionId,
      step: session.step++,
      role: "user",
      content: "quit",
      unverified: true,
    });
    return { ok: true, quit: true, reply: "Session ended." };
  }

  if (raw === "tools") {
    const tools = mod.chrysalisAgentToolDefinitions().map((t) => {
      const g = mod.classifyConvertAction(t.name);
      return `${t.name} [${g.tier}] — ${t.description}`;
    });
    mod.appendTrajectoryRecord({
      filePath: trajectoryPath,
      sessionId,
      step: session.step++,
      role: "assistant",
      content: `Listed ${tools.length} tools`,
      unverified: true,
    });
    return { ok: true, reply: tools.join("\n"), tools: mod.chrysalisAgentToolDefinitions() };
  }

  if (raw === "status") {
    const summary = mod.summarizeTrajectorySession(trajectoryPath, sessionId);
    const reply = JSON.stringify(
      {
        sessionId,
        trajectoryPath,
        summary,
        aiAssistRecommended: true,
        liteRtSupported: false,
      },
      null,
      2,
    );
    return { ok: true, reply };
  }

  if (raw.startsWith("say ")) {
    const content = raw.slice(4).trim();
    mod.appendTrajectoryRecord({
      filePath: trajectoryPath,
      sessionId,
      step: session.step++,
      role: "user",
      content,
      unverified: true,
    });
    return {
      ok: true,
      reply:
        "Logged. Next: call a GREEN/YELLOW tool, or connect Cursor MCP for AI proposals.\n" +
        "Apply stays RED — confirmApply + verifyGatePass required.",
    };
  }

  if (raw.startsWith("call ")) {
    const rest = raw.slice(5).trim();
    const sp = rest.indexOf(" ");
    const name = sp === -1 ? rest : rest.slice(0, sp);
    const jsonPart = sp === -1 ? "{}" : rest.slice(sp + 1).trim();
    let args = {};
    try {
      args = jsonPart ? JSON.parse(jsonPart) : {};
    } catch (e) {
      return { ok: false, reply: `Invalid JSON args: ${e}` };
    }
    if (!name) return { ok: false, reply: "Usage: call <tool> <json>" };

    const decision = mod.classifyConvertAction(name);
    mod.appendTrajectoryRecord({
      filePath: trajectoryPath,
      sessionId,
      step: session.step++,
      role: "user",
      content: `call ${name}`,
      toolName: name,
      toolInput: args,
      unverified: true,
      governorTier: decision.tier,
    });

    if (decision.tier === "RED" && args.confirmApply !== true) {
      const msg =
        `Governor RED: ${name} requires confirmApply:true (and verifyGatePass:true). Not executed.`;
      mod.appendTrajectoryRecord({
        filePath: trajectoryPath,
        sessionId,
        step: session.step++,
        role: "assistant",
        content: msg,
        toolName: name,
        gate: { ok: false, reason: "confirm-required" },
        unverified: true,
        governorTier: decision.tier,
      });
      return { ok: false, reply: msg, governor: decision };
    }

    const result = await callWebLlmTool(repoRoot, name, args);
    const gateOk = result.ok === true;
    mod.appendTrajectoryRecord({
      filePath: trajectoryPath,
      sessionId,
      step: session.step++,
      role: "assistant",
      content: gateOk ? `tool ok: ${name}` : `tool failed: ${name}`,
      toolName: name,
      toolInput: args,
      toolOutput: {
        ok: result.ok,
        status: result.status,
        stdout: String(result.stdout || "").slice(0, 4000),
        stderr: String(result.stderr || "").slice(0, 1000),
      },
      gate: gateOk ? { ok: true } : undefined,
      unverified: gateOk ? undefined : true,
      governorTier: decision.tier,
    });

    const body = result.stdout || result.stderr || JSON.stringify(result);
    return {
      ok: gateOk,
      reply: String(body).slice(0, 8000),
      governor: decision,
      toolResult: result,
    };
  }

  return {
    ok: false,
    reply: `Unknown command. Try help.\n(got: ${raw.slice(0, 80)})`,
  };
}

/** @param {string} text */
function parseScriptLines(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const parts = l.split("|");
      const cmd = parts[0];
      if (cmd === "say") return `say ${parts.slice(1).join("|")}`;
      if (cmd === "call") return `call ${parts[1]} ${parts.slice(2).join("|") || "{}"}`;
      if (cmd === "tools" || cmd === "status" || cmd === "quit" || cmd === "help") return cmd;
      return l;
    });
}

/**
 * @param {{
 *   scriptPath?: string,
 *   scriptText?: string,
 *   trajectoryPath?: string,
 *   quiet?: boolean,
 * }} [opts]
 */
export async function runMigrationChat(opts = {}) {
  const session = await createMigrationChatSession({
    trajectoryPath: opts.trajectoryPath,
  });
  if (!opts.quiet) printBanner(session);

  const scriptText =
    opts.scriptText ||
    (opts.scriptPath && existsSync(opts.scriptPath) ? readFileSync(opts.scriptPath, "utf8") : null);

  if (scriptText != null) {
    const lines = parseScriptLines(scriptText);
    const turns = [];
    for (const line of lines) {
      const r = await handleMigrationChatLine(session, line);
      turns.push({ line, ...r });
      if (!opts.quiet && r.reply) console.log(r.reply);
      if (r.quit) break;
    }
    const summary = session.mod.summarizeTrajectorySession(session.trajectoryPath, session.sessionId);
    return {
      kind: MIGRATION_CHAT_KIND,
      schemaVersion: MIGRATION_CHAT_SCHEMA_VERSION,
      ok: turns.every((t) => t.empty || t.ok || t.quit),
      sessionId: session.sessionId,
      trajectoryPath: session.trajectoryPath,
      turns,
      summary,
      aiAssistRecommended: true,
      liteRtSupported: false,
    };
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const prompt = () =>
    new Promise((resolvePrompt) => {
      rl.question("migration-chat> ", resolvePrompt);
    });

  for (;;) {
    const line = await prompt();
    const r = await handleMigrationChatLine(session, line);
    if (r.reply) console.log(r.reply);
    if (r.quit) break;
  }
  rl.close();
  return {
    kind: MIGRATION_CHAT_KIND,
    schemaVersion: MIGRATION_CHAT_SCHEMA_VERSION,
    ok: true,
    sessionId: session.sessionId,
    trajectoryPath: session.trajectoryPath,
    aiAssistRecommended: true,
    liteRtSupported: false,
  };
}

function parseArgs(argv) {
  const out = { scriptPath: "", trajectoryPath: "", json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--script" && argv[i + 1]) out.scriptPath = argv[++i];
    else if (argv[i] === "--trajectory" && argv[i + 1]) out.trajectoryPath = argv[++i];
    else if (argv[i] === "--json") out.json = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runMigrationChat({
    scriptPath: args.scriptPath || undefined,
    trajectoryPath: args.trajectoryPath || undefined,
    quiet: args.json,
  });
  if (args.json || args.scriptPath) {
    console.log(JSON.stringify(result, null, 2));
  }
  if (result.ok === false) process.exit(1);
}

if (process.argv[1]?.includes("chrysalis-migration-chat")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
