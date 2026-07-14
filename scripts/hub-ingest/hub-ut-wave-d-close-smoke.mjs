#!/usr/bin/env node
/**
 * G9989 — UT Wave D composite (engine depth for UT edges).
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const STEPS = [
  { gate: "G9986", script: "hub-cwl-universal-translator-close-smoke.mjs", env: { CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD: "1" } },
  { gate: "G9987", script: "hub-multi-origin-lift-close-smoke.mjs" },
];

function runStep(step) {
  if (step.gate === "G9986" && process.env.CHRYSALIS_UT_WAVE_D_SKIP_G7690 === "1") {
    return { gate: step.gate, script: step.script, status: 0, ok: true, skip: "g7690-deferred-to-program-close" };
  }
  const r = spawnSync(process.execPath, [join(root, "scripts/hub-ingest", step.script)], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...(step.env ?? {}) },
    maxBuffer: 40 * 1024 * 1024,
  });
  return {
    gate: step.gate,
    script: step.script,
    status: r.status ?? 1,
    ok: (r.status ?? 1) === 0,
    stderrTail: (r.stderr ?? "").slice(-300),
  };
}

export async function runUtWaveDCloseGate() {
  const steps = STEPS.map(runStep);
  const ok = steps.every((s) => s.ok);
  return {
    kind: "chrysalis.ut.wave-d-close-smoke",
    schemaVersion: 1,
    gate: "G9989",
    ok,
    steps,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const gate = await runUtWaveDCloseGate();
  console.log(JSON.stringify(gate, null, 2));
  process.exit(gate.ok ? 0 : 1);
}

if (process.argv[1]?.includes("hub-ut-wave-d-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
