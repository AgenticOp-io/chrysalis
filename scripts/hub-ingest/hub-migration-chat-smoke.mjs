#!/usr/bin/env node
/**
 * G9921–G9923 — Migration Chat + AI Assist packaging (D6417). LiteRT refused.
 *
 * Run: pnpm run hub:migration-chat-smoke
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrationChat } from "../chrysalis-migration-chat.mjs";

export const MIGRATION_CHAT_SMOKE_KIND = "chrysalis.migration-chat-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export async function runMigrationChatSmoke() {
  const docsPath = join(ROOT, "docs/AI-ASSIST.md");
  const turnsPath = join(ROOT, "fixtures/web-llm/migration-chat-smoke-turns.txt");
  const mcpExample = join(ROOT, "fixtures/web-llm/cursor-mcp.example.json");
  const chatScript = join(ROOT, "scripts/chrysalis-migration-chat.mjs");
  const chatHtml = join(ROOT, "scripts/chrysalis-migration-chat.html");
  const operatorWeb = join(ROOT, "scripts/chrysalis-operator-web.mjs");
  const cliBin = join(ROOT, "packages/cli/src/bin.ts");

  const docsOk =
    existsSync(docsPath) &&
    readFileSync(docsPath, "utf8").includes("works best") &&
    readFileSync(docsPath, "utf8").includes("LiteRT") &&
    /Refused|not supported|refused/i.test(readFileSync(docsPath, "utf8"));

  const mcpOk = existsSync(mcpExample) && readFileSync(mcpExample, "utf8").includes("web-llm-mcp-server");
  const scriptOk = existsSync(chatScript) && existsSync(turnsPath) && existsSync(chatHtml);
  const hubOk =
    existsSync(operatorWeb) &&
    readFileSync(operatorWeb, "utf8").includes("aiAssist") &&
    readFileSync(operatorWeb, "utf8").includes("migration-chat") &&
    readFileSync(operatorWeb, "utf8").includes("liteRtSupported: false");
  const cliOk =
    existsSync(cliBin) &&
    readFileSync(cliBin, "utf8").includes('case "chat"') &&
    readFileSync(cliBin, "utf8").includes("cmdChat");

  const trajectoryPath = join(ROOT, "reports/web-llm/migration-chat/smoke-session.jsonl");
  const run = await runMigrationChat({
    scriptPath: turnsPath,
    trajectoryPath,
    quiet: true,
  });

  const runOk =
    run.ok === true &&
    run.aiAssistRecommended === true &&
    run.liteRtSupported === false &&
    Array.isArray(run.turns) &&
    run.turns.some((t) => String(t.line).startsWith("call "));

  const ok = docsOk && mcpOk && scriptOk && hubOk && cliOk && runOk;

  return {
    kind: MIGRATION_CHAT_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    docsOk,
    mcpOk,
    scriptOk,
    hubOk,
    cliOk,
    runOk,
    sessionId: run.sessionId,
    trajectoryPath: run.trajectoryPath,
    note: "Migration Chat + AI Assist packaging; LiteRT.js explicitly refused",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMigrationChatSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-migration-chat-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
