#!/usr/bin/env node
/** Phase 43 — convert apply → repair bridge smoke (G8913). */
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runConvertRepairBridge } from "./hub-llm-convert-repair-bridge.mjs";
import { runLlmConvertFullProgramDocGate } from "./hub-llm-convert-full-program-entry-smoke.mjs";

const scriptRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

export async function runLlmConvertRepairBridgeGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const projectDir = join(repoRoot, "fixtures/db-query-unknown-receiver-probe");
  const program = runLlmConvertFullProgramDocGate();

  const scaffoldArtifact = {
    proposals: [{ id: "p1", patch: { kind: "hole-scaffold" }, hole: "legacy:test" }],
  };
  const scaffoldSkip = runConvertRepairBridge(projectDir, scaffoldArtifact);

  const closureArtifact = {
    proposals: [
      {
        id: "p2",
        hole: "legacy:closure",
        patch: {
          kind: "hole-closure",
          holeId: "hole-test",
          replacementRootId: "root-1",
          nodesToAdd: [],
        },
      },
    ],
  };
  const closureSkip = runConvertRepairBridge(projectDir, closureArtifact);

  const checks = {
    programOk: program.ok === true,
    scaffoldSkipped: scaffoldSkip.skipped === "no-hole-closure-patches",
    closureNoTraces: closureSkip.skipped === "no-traces" || closureSkip.skipped === "no-CHRYSALIS_HUB_VERIFY_BASE_URL",
  };
  return {
    kind: "chrysalis.llm-convert-repair-bridge-smoke",
    schemaVersion: 1,
    ok: Object.values(checks).every(Boolean),
    checks,
    scaffoldSkip,
    closureSkip,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertRepairBridgeSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-repair-bridge");
  const t0 = progress.start("LLM convert repair bridge (G8913)");
  const gate = await runLlmConvertRepairBridgeGate(opts);
  progress.end("LLM convert repair bridge (G8913)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runLlmConvertRepairBridgeSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-repair-bridge-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
