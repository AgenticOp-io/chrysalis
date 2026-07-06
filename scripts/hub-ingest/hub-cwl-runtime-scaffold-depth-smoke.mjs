#!/usr/bin/env node
/** Maintenance — CWL browser/worker scaffold depth (G9238). */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function runPnpm(args, cwd = scriptRoot) {
  const r = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return { ok: r.status === 0, stdout: r.stdout, stderr: r.stderr, status: r.status ?? 1 };
}

export function runCwlRuntimeScaffoldDepthDocGate() {
  const path = join(scriptRoot, "docs/CWL-RUNTIME-DEPTH-PHASE-46.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-cwl-runtime-depth-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G9238") &&
    text.includes("bindClientIslandEvents") &&
    text.includes("createCwlWorkerFetchHandler") &&
    text.includes("Maintenance continuation");
  return { ok };
}

export function runCwlRuntimeScaffoldDepthGate() {
  const doc = runCwlRuntimeScaffoldDepthDocGate();
  const browserBuild = runPnpm(["--filter", "@chrysalis/runtime-cwl-browser", "build"]);
  const workerBuild = runPnpm(["--filter", "@chrysalis/runtime-cwl-worker", "build"]);
  const browserTest = runPnpm([
    "exec",
    "vitest",
    "run",
    "packages/runtime-cwl-browser/tests/browser.test.ts",
  ]);
  const workerTest = runPnpm([
    "exec",
    "vitest",
    "run",
    "packages/runtime-cwl-worker/tests/worker.test.ts",
  ]);
  const ok =
    doc.ok === true &&
    browserBuild.ok &&
    workerBuild.ok &&
    browserTest.ok &&
    workerTest.ok;
  return {
    kind: "chrysalis.cwl-runtime-scaffold-depth-smoke",
    schemaVersion: 1,
    ok,
    doc,
    browserBuild: { ok: browserBuild.ok },
    workerBuild: { ok: workerBuild.ok },
    browserTest: { ok: browserTest.ok },
    workerTest: { ok: workerTest.ok },
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlRuntimeScaffoldDepthSmoke() {
  const progress = createSmokeProgress("cwl-runtime-scaffold-depth");
  const t0 = progress.start("CWL runtime scaffold depth (G9238)");
  const gate = runCwlRuntimeScaffoldDepthGate();
  progress.end("CWL runtime scaffold depth (G9238)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlRuntimeScaffoldDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-runtime-scaffold-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
