#!/usr/bin/env node
/**
 * G9990 — Universal Translator Canon program close (Waves A–D).
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const STEPS = [
  { gate: "G9965", script: "hub-ut-wave-a-close-smoke.mjs" },
  { gate: "G9975", script: "hub-ut-wave-b-close-smoke.mjs", env: { CHRYSALIS_UT_WAVE_B_FULL_G7690: "0" } },
  { gate: "G9985", script: "hub-ut-wave-c-close-smoke.mjs" },
  { gate: "G9989", script: "hub-ut-wave-d-close-smoke.mjs", env: { CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD: "1" } },
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

async function main() {
  const steps = STEPS.map(runStep);
  const ok = steps.every((s) => s.ok);
  console.log(
    JSON.stringify(
      {
        kind: "chrysalis.ut.canon-program-close-smoke",
        schemaVersion: 1,
        gate: "G9990",
        ok,
        steps,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
