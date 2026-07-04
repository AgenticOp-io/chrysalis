#!/usr/bin/env node
/** Phase 44b — LLM hole-closure hint smoke (G9051). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";
import { runLlmConvertRepairBridgeGate } from "./hub-llm-convert-repair-bridge-smoke.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runLlmConvertHoleClosureGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runPhase44ProgramDocGate();
  const mod = await loadWebLlm();

  const withId = mod.buildHoleClosurePatchHint({
    name: "legacy:test",
    holeId: "hole-node-1",
    reason: "legacy:test",
  });
  const withoutId = mod.buildHoleClosurePatchHint({ name: "legacy:no-id" });
  const merged = mod.mergeHoleClosureIntoPatchHint(null, {
    name: "legacy:merged",
    holeId: "hole-node-2",
  });

  const enrich = await mod.enrichConvertHoleProposals({
    holes: [{ name: "legacy:x", holeId: "hole-x", detail: "probe" }],
    skipLlm: true,
  });
  const patch = enrich.enrichments[0]?.patchHint;

  const repairBridge = await runLlmConvertRepairBridgeGate({ repoRoot });

  const checks = {
    programOk: program.ok === true,
    closureWithId: withId?.kind === "hole-closure" && withId.holeId === "hole-node-1",
    closureWithoutId: withoutId === null,
    mergedKind: merged.kind === "hole-closure",
    enrichHoleClosure: patch?.kind === "hole-closure" && patch.holeId === "hole-x",
    repairBridgeOk: repairBridge.ok === true,
  };
  return {
    kind: "chrysalis.llm-convert-hole-closure-smoke",
    schemaVersion: 1,
    ok: Object.values(checks).every(Boolean),
    checks,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertHoleClosureSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-hole-closure");
  const t0 = progress.start("LLM convert hole closure (G9051)");
  const gate = await runLlmConvertHoleClosureGate(opts);
  progress.end("LLM convert hole closure (G9051)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runLlmConvertHoleClosureSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-hole-closure-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
