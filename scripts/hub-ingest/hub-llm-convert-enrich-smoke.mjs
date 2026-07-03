#!/usr/bin/env node
/** Phase 43a — LLM hole enrichment smoke (G8911). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runLlmConvertFullProgramDocGate } from "./hub-llm-convert-full-program-entry-smoke.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runLlmConvertEnrichGate(opts = {}) {
  const mod = await loadWebLlm();
  const program = runLlmConvertFullProgramDocGate();
  const stub = await mod.enrichConvertHoleProposals({
    holes: [{ name: "legacy:db-query-unknown-receiver", detail: null }],
    skipLlm: false,
  });
  const skipped = await mod.enrichConvertHoleProposals({
    holes: [{ name: "legacy:test", detail: null }],
    skipLlm: true,
  });
  const manifest = mod.buildAgentToolManifest();
  const enrichTool = mod.findAgentTool("hub_convert_llm_enrich");
  const checks = {
    programOk: program.ok === true,
    stubEnriched: stub.enrichments.length === 1 && stub.enrichments[0]?.suggestion != null,
    stubHasPatchHint: stub.enrichments[0]?.patchHint != null,
    skipLlmSkipped: skipped.skipLlm === true && skipped.enrichments[0]?.source === "skipped",
    enrichToolPresent: enrichTool?.name === "hub_convert_llm_enrich",
    toolCountMin: manifest.tools.length >= 16,
  };
  return {
    kind: "chrysalis.llm-convert-enrich-smoke",
    schemaVersion: 1,
    ok: Object.values(checks).every(Boolean),
    checks,
    stub,
    skipped,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertEnrichSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-enrich");
  const t0 = progress.start("LLM convert enrich (G8911)");
  const gate = await runLlmConvertEnrichGate(opts);
  progress.end("LLM convert enrich (G8911)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runLlmConvertEnrichSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-enrich-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
