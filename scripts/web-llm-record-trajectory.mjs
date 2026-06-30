#!/usr/bin/env node
/** Append verify-gated trajectory records (JSONL). */
import { unlinkSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/**
 * @param {object} opts
 */
export async function runWebLlmRecordTrajectory(opts) {
  const mod = await loadWebLlm();
  const record = mod.appendTrajectoryRecord({
    filePath: opts.filePath,
    sessionId: opts.sessionId,
    step: opts.step,
    role: opts.role,
    content: opts.content,
    toolName: opts.toolName,
    toolInput: opts.toolInput,
    toolOutput: opts.toolOutput,
    gate: opts.gate,
    artifacts: opts.artifacts,
    unverified: opts.unverified,
  });
  const summary = mod.summarizeTrajectoryFile(opts.filePath);
  return { ok: true, record, summary };
}

function parseArgs(argv) {
  /** @type {Record<string, string | boolean | number>} */
  const out = { step: 1, role: "tool" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file" && argv[i + 1]) out.filePath = argv[++i];
    else if (a === "--session" && argv[i + 1]) out.sessionId = argv[++i];
    else if (a === "--step" && argv[i + 1]) out.step = Number(argv[++i]);
    else if (a === "--role" && argv[i + 1]) out.role = argv[++i];
    else if (a === "--content" && argv[i + 1]) out.content = argv[++i];
    else if (a === "--gate-name" && argv[i + 1]) out.gateName = argv[++i];
    else if (a === "--gate-ok") out.gateOk = true;
    else if (a === "--unverified") out.unverified = true;
    else if (a === "--reset" && out.filePath) {
      if (existsSync(String(out.filePath))) unlinkSync(String(out.filePath));
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.filePath || !args.sessionId) {
    console.error("Usage: web-llm-record-trajectory --file PATH --session ID [--step N] [--role tool] [--gate-name NAME --gate-ok]");
    process.exit(1);
  }
  const mod = await loadWebLlm();
  /** @type {import('@chrysalis/web-llm').AppendTrajectoryRecordInput} */
  const input = {
    filePath: String(args.filePath),
    sessionId: String(args.sessionId),
    step: Number(args.step),
    role: /** @type {import('@chrysalis/web-llm').TrajectoryRole} */ (String(args.role)),
    content: typeof args.content === "string" ? args.content : undefined,
    unverified: args.unverified === true,
  };
  if (args.gateName) {
    input.gate = { name: String(args.gateName), ok: args.gateOk === true };
  }
  const r = await runWebLlmRecordTrajectory(input);
  console.log(JSON.stringify(r, null, 2));
}

if (process.argv[1]?.includes("web-llm-record-trajectory")) main();
