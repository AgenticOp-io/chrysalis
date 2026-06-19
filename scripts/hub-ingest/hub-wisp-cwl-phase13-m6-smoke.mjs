#!/usr/bin/env node
/** Phase 13 M6 effects smoke (G6420) — session.read on M1–M2 protected routes. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import {
  applyWispM6Effects,
  runM6EffectsRoutesGate,
  M6_SESSION_READ_PATHS,
} from "../wisp-cwl-apply-m6-effects.mjs";
import { applyWispPhase13Surfaces } from "../wisp-cwl-apply-phase13-surfaces.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_CWL_PHASE13_M6_SMOKE_KIND = "chrysalis.wisp-cwl-phase13-m6-smoke";
export const WISP_CWL_PHASE13_M6_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-m6-effects-manifest.v1.json");
const routesPath = join(scriptRoot, "fixtures/hub-wisp-management/routes.cwl");

export function runWispM6EffectsManifestGate() {
  if (!existsSync(manifestPath)) return { ok: false, skip: "missing-m6-manifest" };
  const json = JSON.parse(readFileSync(manifestPath, "utf8"));
  const ok =
    json.ok === true &&
    json.wave === "M6" &&
    json.rfc === "CWL-RFC-0007" &&
    (json.protectedCount ?? 0) === M6_SESSION_READ_PATHS.length;
  return { ok, protectedCount: json.protectedCount };
}

export async function runWispM6RuntimeGate() {
  const runtimeDist = join(scriptRoot, "packages/runtime-cwl/dist/index.js");
  if (!existsSync(runtimeDist)) {
    spawnSync("pnpm", ["--filter", "@chrysalis/runtime-cwl", "build"], {
      cwd: scriptRoot,
      shell: process.platform === "win32",
      encoding: "utf8",
    });
  }
  const { createCwlRuntime, loadModuleFromCwlFile } = await import(pathToFileURL(runtimeDist).href);
  const runtime = createCwlRuntime({ module: loadModuleFromCwlFile(routesPath, scriptRoot) });
  const samples = ["/dashboard", "/admin/billing", "/modules/customers", "/docs"];
  const results = [];
  for (const path of samples) {
    const res = await runtime.fetch({ method: "GET", url: `http://127.0.0.1${path}` });
    const body = await res.text();
    results.push({ path, status: res.status, ok: res.status === 200 && body.length > 10 });
  }
  await runtime.stop();
  const ok = results.every((r) => r.ok);
  return { ok, results, note: "effects are declarative; public routes stay 200 without session" };
}

export async function runWispCwlPhase13M6Gate(opts = {}) {
  if (opts.apply !== false) {
    applyWispPhase13Surfaces();
    applyWispM6Effects();
  }
  const manifest = runWispM6EffectsManifestGate();
  const routes = runM6EffectsRoutesGate();
  const runtime = await runWispM6RuntimeGate();
  const ok = manifest.ok === true && routes.ok === true && runtime.ok === true;
  return {
    kind: WISP_CWL_PHASE13_M6_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE13_M6_SMOKE_SCHEMA_VERSION,
    ok,
    manifest,
    routes,
    runtime,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispCwlPhase13M6SmokeGate(opts = {}) {
  const progress = createSmokeProgress("wisp-cwl-phase13-m6");
  const t0 = progress.start("WISP CWL Phase 13 M6 (G6420)");
  const gate = await runWispCwlPhase13M6Gate(opts);
  progress.end("WISP CWL Phase 13 M6 (G6420)", gate.ok === true, t0);
  return gate;
}

async function main() {
  const r = await runWispCwlPhase13M6SmokeGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase13-m6-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
