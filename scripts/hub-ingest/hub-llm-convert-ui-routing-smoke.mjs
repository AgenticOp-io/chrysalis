#!/usr/bin/env node
/** Phase 42a.3 — hub UI surfaces IS tier on job progress (G8813). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runLlmAssistedConvertProgramDocGate } from "./hub-llm-assisted-convert-program-entry-smoke.mjs";

export const LLM_CONVERT_UI_ROUTING_SMOKE_KIND = "chrysalis.llm-convert-ui-routing-smoke";
export const LLM_CONVERT_UI_ROUTING_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G8813 — operator hub HTML/JS expose IS routing on job progress. */
export function runLlmConvertUiRoutingGate(_opts = {}) {
  const program = runLlmAssistedConvertProgramDocGate();
  const indexPath = join(scriptRoot, "scripts/chrysalis-operator-index.html");
  const uiPath = join(scriptRoot, "scripts/chrysalis-operator-ui.js");
  const webPath = join(scriptRoot, "scripts/chrysalis-operator-web.mjs");
  if (!existsSync(indexPath) || !existsSync(uiPath) || !existsSync(webPath)) {
    return { ok: false, skip: "missing-operator-hub-ui" };
  }
  const index = readFileSync(indexPath, "utf8");
  const ui = readFileSync(uiPath, "utf8");
  const web = readFileSync(webPath, "utf8");
  const checks = {
    programOk: program.ok === true,
    indexHasIsRoutingSummary: index.includes('id="isRoutingSummary"'),
    uiReferencesIsRouting: ui.includes("isRouting") && ui.includes("isRoutingSummary"),
    webAttachesIsRouting: web.includes("resolveHubConvertIsRouting") && web.includes("isRouting"),
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    kind: LLM_CONVERT_UI_ROUTING_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_UI_ROUTING_SMOKE_SCHEMA_VERSION,
    ok,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertUiRoutingSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-ui-routing");
  const t0 = progress.start("LLM convert UI IS routing (G8813)");
  const gate = runLlmConvertUiRoutingGate(opts);
  progress.end("LLM convert UI IS routing (G8813)", gate.ok === true, t0);
  return {
    kind: LLM_CONVERT_UI_ROUTING_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_UI_ROUTING_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runLlmConvertUiRoutingSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-ui-routing-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
