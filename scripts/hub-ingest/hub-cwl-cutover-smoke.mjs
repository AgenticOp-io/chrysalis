#!/usr/bin/env node
/** Phase 18 cutover / greenfield smoke (G7140) — WISP ladder step 5 evidence. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispCwlPipelineSmokeGate } from "./hub-wisp-cwl-pipeline-smoke.mjs";
import { buildWispHoleManifest } from "../wisp-cwl-hole-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_CUTOVER_SMOKE_KIND = "chrysalis.cwl.cutover-smoke";
export const CWL_CUTOVER_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G7141 — ladder step 5 documented in surface taxonomy. */
export function runCwlCutoverDocGate() {
  const path = join(scriptRoot, "docs/CWL-SURFACE-TAXONOMY.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-taxonomy" };
  const text = readFileSync(path, "utf8");
  const ok = text.includes("Replacement ladder") && text.includes("step 5") && text.includes("cutover");
  return { ok, cutoverDocOk: ok };
}

/** G7142 — WISP hole budget: Phase 18 ladder (firebase login) or post-G7790 zero-hole native cutover. */
export function runCwlWispCutoverHoleGate() {
  const live = buildWispHoleManifest();
  const programPath = join(scriptRoot, "docs/WISP-FULL-SITE-CWL-PROGRAM.md");
  const programText = existsSync(programPath) ? readFileSync(programPath, "utf8") : "";
  const fullSiteClosed = programText.includes("Program closed") && programText.includes("G7790");
  const ok = fullSiteClosed
    ? live.ok === true &&
      live.uiHoleCount === 0 &&
      live.totalUiHoles === 0 &&
      live.upstreamProxyHoles === 0 &&
      live.backendConversion === "native-cwl-handlers" &&
      (live.routeCount ?? 0) >= 20
    : live.ok === true &&
      live.uiHoleCount === 1 &&
      live.byReason?.["hub-svelte:firebase-auth"] === 1 &&
      (live.routeCount ?? 0) >= 20;
  return {
    ok,
    mode: fullSiteClosed ? "wisp-full-site-closed" : "phase18-ladder",
    uiHoleCount: live.uiHoleCount,
    routeCount: live.routeCount,
    nativePageRatio: live.nativePageRatio,
    backendConversion: live.backendConversion,
    upstreamProxyHoles: live.upstreamProxyHoles,
  };
}

/** G7140 — Cutover / greenfield composite. */
export async function runCwlCutoverGate(opts = {}) {
  const doc = runCwlCutoverDocGate();
  const holes = runCwlWispCutoverHoleGate();
  const programPath = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  const programOk =
    existsSync(programPath) &&
    readFileSync(programPath, "utf8").includes("Phase 13 closed");
  let pipeline = { ok: true, skip: "pipeline-skipped" };
  if (opts.runPipeline !== false) {
    pipeline = await runWispCwlPipelineSmokeGate(opts);
  }
  const ok = doc.ok === true && holes.ok === true && programOk && pipeline.ok === true;
  return {
    kind: CWL_CUTOVER_SMOKE_KIND,
    schemaVersion: CWL_CUTOVER_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    holes,
    programOk,
    pipeline,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlCutoverSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-cutover");
  const t0 = progress.start("CWL cutover (G7140)");
  const gate = await runCwlCutoverGate(opts);
  progress.end("CWL cutover (G7140)", gate.ok === true, t0);
  return {
    kind: CWL_CUTOVER_SMOKE_KIND,
    schemaVersion: CWL_CUTOVER_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlCutoverSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-cutover-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
