#!/usr/bin/env node
/**
 * G9985 — UT Wave C composite (AI-assisted convert under verify).
 * Spawns existing program smokes; does not invent new LLM dispose paths.
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {{ gate: string; script: string; env?: Record<string, string> }[]} */
const STEPS = [
  { gate: "G9980", script: "hub-migration-chat-smoke.mjs" },
  { gate: "G9981", script: "hub-llm-convert-verify-apply-smoke.mjs" },
  { gate: "G9982", script: "hub-intelligence-shorthand-close-smoke.mjs" },
  { gate: "G9983", script: "hub-product-hit-rate-live-smoke.mjs" },
  { gate: "G9984", script: "hub-convert-governor-smoke.mjs" },
];

function runStep(step) {
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

export async function runUtWaveCCloseGate() {
  const steps = STEPS.map(runStep);
  const ok = steps.every((s) => s.ok);
  return {
    kind: "chrysalis.ut.wave-c-close-smoke",
    schemaVersion: 1,
    gate: "G9985",
    ok,
    steps,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const gate = await runUtWaveCCloseGate();
  console.log(JSON.stringify(gate, null, 2));
  process.exit(gate.ok ? 0 : 1);
}

if (process.argv[1]?.includes("hub-ut-wave-c-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
