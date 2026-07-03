#!/usr/bin/env node
/** Log Phase 41 / build-slice gates to web-LLM trajectory corpus. */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/** @param {{ gateName: string, ok: boolean; detail?: Record<string, unknown>; repoRoot?: string }} input */
export async function logHubWebLlmGate(input) {
  const mod = await loadWebLlm();
  return mod.logWebLlmSmokeGate({
    repoRoot: resolve(input.repoRoot ?? scriptRoot),
    gateName: input.gateName,
    ok: input.ok,
    detail: input.detail,
  });
}
