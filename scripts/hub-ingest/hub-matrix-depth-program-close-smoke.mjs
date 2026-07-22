#!/usr/bin/env node
/**
 * Composite matrix-depth program gate (Waves 1–9 + thin-zero + full-gold).
 * Gate: hub:matrix-depth-program-close-smoke
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const GATES = [
  "hub:matrix-depth-wave1-smoke",
  "hub:matrix-depth-wave3-smoke",
  "hub:matrix-depth-wave4-smoke",
  "hub:matrix-depth-thin-zero-smoke",
  "hub:matrix-depth-full-gold-smoke",
  "hub:ui-site-depth-smoke",
  "hub:matrix-depth-wave7-nextjs-smoke",
  "hub:matrix-depth-verify-sweep-smoke",
  "hub:matrix-depth-flagship-outbound-smoke",
  "hub:matrix-depth-wave8-nextjs-replay-smoke",
  "hub:matrix-depth-wave9-nextjs-all-smoke",
];

function runGate(script) {
  const r = spawnSync("pnpm", ["run", script], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const ok = r.status === 0;
  return { script, ok, status: r.status, tail: out.trim().split(/\r?\n/).slice(-8).join("\n") };
}

export async function runMatrixDepthProgramCloseSmoke() {
  const progress = createSmokeProgress("matrix-depth-program-close");
  const t0 = progress.start("Matrix depth program close");

  const results = [];
  let ok = true;
  for (const g of GATES) {
    const row = runGate(g);
    results.push(row);
    if (!row.ok) {
      ok = false;
      break; // fail fast
    }
  }

  progress.end("Matrix depth program close", ok, t0);
  return {
    kind: "chrysalis.hub.matrix-depth-program-close-smoke",
    schemaVersion: 1,
    ok,
    gateCount: GATES.length,
    ranCount: results.length,
    results,
    note: "Composite close for matrix depth Waves 1–9",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixDepthProgramCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-depth-program-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
