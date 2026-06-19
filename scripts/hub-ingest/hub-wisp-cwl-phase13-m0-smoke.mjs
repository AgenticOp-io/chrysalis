#!/usr/bin/env node
/** Phase 13 M0 surface smoke (G6350) — docs/help pages + login UI hole. */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildM0SurfaceManifest } from "../wisp-cwl-apply-m0-surfaces.mjs";
import { applyWispPhase13Surfaces } from "../wisp-cwl-apply-phase13-surfaces.mjs";
import { buildWispHoleManifest } from "../wisp-cwl-hole-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_CWL_PHASE13_M0_SMOKE_KIND = "chrysalis.wisp-cwl-phase13-m0-smoke";
export const WISP_CWL_PHASE13_M0_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const routesPath = join(fixtureDir, "routes.cwl");
const manifestPath = join(fixtureDir, "wisp-m0-surface-manifest.v1.json");

/** G6350-doc — M0 manifest fixture present and valid. */
export function runWispM0SurfaceManifestGate() {
  if (!existsSync(manifestPath)) return { ok: false, skip: "missing-m0-manifest" };
  const json = JSON.parse(readFileSync(manifestPath, "utf8"));
  const ok =
    json.ok === true &&
    json.wave === "M0" &&
    Array.isArray(json.surfaces?.pages) &&
    json.surfaces.pages.includes("/help") &&
    json.surfaces.pages.includes("/docs/reference/project-status");
  return { ok, manifestOk: ok };
}

/** G6350-routes — M0 routes in routes.cwl. */
export function runWispM0RoutesGate() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  const text = readFileSync(routesPath, "utf8");
  const docsPages = (text.match(/^@page GET "\/docs/gm) ?? []).length;
  const ok =
    docsPages >= 5 &&
    text.includes('@page GET "/help"') &&
    text.includes('@page GET "/docs/reference/project-status"') &&
    text.includes("hole hub-svelte:firebase-auth") &&
    !/@route GET "\/help"/.test(text);
  return { ok, docsPages, helpNative: text.includes('@page GET "/help"') };
}

/** G6350-chimera — native M0 pages served from CWL runtime (does not copy WISP lift over fixtures). */
export async function runWispM0ChimeraPagesGate() {
  const runtimeDist = join(scriptRoot, "packages/runtime-cwl/dist/index.js");
  if (!existsSync(runtimeDist)) {
    spawnSync("pnpm", ["--filter", "@chrysalis/runtime-cwl", "build"], {
      cwd: scriptRoot,
      shell: process.platform === "win32",
      encoding: "utf8",
    });
  }

  const { createWispChimeraGateway } = await import("../wisp-cwl-chimera-gateway.mjs");
  /** @type {Awaited<ReturnType<typeof createWispChimeraGateway>> | null} */
  let gw = null;
  try {
    gw = await createWispChimeraGateway({
      repoRoot: scriptRoot,
      cwlPath: routesPath,
      backendUrl: "http://127.0.0.1:9",
      host: "127.0.0.1",
      port: 0,
    });
    const addr = gw.server.address();
    const port = typeof addr === "object" && addr ? addr.port : gw.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const help = await fetch(`${baseUrl}/help`);
    const helpText = await help.text();
    const helpOk = help.status === 200 && helpText.includes("WISP Management Help");

    const ps = await fetch(`${baseUrl}/docs/reference/project-status`);
    const psText = await ps.text();
    const projectStatusOk = ps.status === 200 && psText.includes("Project Status");

    const ok = helpOk && projectStatusOk;
    return { ok, helpStatus: help.status, helpOk, projectStatusOk, projectStatusStatus: ps.status };
  } finally {
    if (gw) await gw.stop();
  }
}

/** G6350 — Phase 13 M0 composite. */
export async function runWispCwlPhase13M0Gate(opts = {}) {
  if (opts.apply !== false) applyWispPhase13Surfaces();
  buildM0SurfaceManifest();
  buildWispHoleManifest();
  const manifest = runWispM0SurfaceManifestGate();
  const routes = runWispM0RoutesGate();
  const chimera = await runWispM0ChimeraPagesGate();
  const ok = manifest.ok === true && routes.ok === true && chimera.ok === true;
  return {
    kind: WISP_CWL_PHASE13_M0_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE13_M0_SMOKE_SCHEMA_VERSION,
    ok,
    manifest,
    routes,
    chimera,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispCwlPhase13M0SmokeGate(opts = {}) {
  const progress = createSmokeProgress("wisp-cwl-phase13-m0");
  const t0 = progress.start("WISP CWL Phase 13 M0 (G6350)");
  const gate = await runWispCwlPhase13M0Gate(opts);
  progress.end("WISP CWL Phase 13 M0 (G6350)", gate.ok === true, t0);
  return gate;
}

async function main() {
  const r = await runWispCwlPhase13M0SmokeGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase13-m0-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
