#!/usr/bin/env node
/** Phase 12 Phase 0 close smoke (G6310). */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispCwlPhase12Phase0EntryGate } from "./hub-wisp-cwl-phase12-phase0-entry-smoke.mjs";
import { buildWispHoleManifest } from "../wisp-cwl-hole-manifest.mjs";

export const WISP_CWL_PHASE12_PHASE0_CLOSE_SMOKE_KIND = "chrysalis.wisp-cwl-phase12-phase0-close-smoke";
export const WISP_CWL_PHASE12_PHASE0_CLOSE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6305 — hole manifest published and within budget. */
export function runWispCwlHoleManifestGate() {
  const path = join(scriptRoot, "fixtures/hub-wisp-management/wisp-hole-manifest.v1.json");
  const live = buildWispHoleManifest();
  if (!existsSync(path) && !live.ok) return { ok: false, skip: "hole-manifest-missing" };
  const json = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : live;
  const ok =
    json.withinBudget === true &&
    (json.routeCount ?? 0) >= 87 &&
    json.backendConversion === "deferred";
  return { ok, totalUiHoles: json.totalUiHoles ?? null, routeCount: json.routeCount ?? null };
}

/** G6306 — lifted UI routes fixture present. */
export function runWispCwlRoutesFixtureGate() {
  const routesPath = join(scriptRoot, "fixtures/hub-wisp-management/routes.cwl");
  const previewPath = join(scriptRoot, "fixtures/hub-wisp-management/cwl-preview.json");
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  const text = readFileSync(routesPath, "utf8");
  const routeCount = (text.match(/^@(route|page) /gm) ?? []).length;
  let previewCount = routeCount;
  if (existsSync(previewPath)) {
    previewCount = JSON.parse(readFileSync(previewPath, "utf8")).routeCount ?? previewCount;
  }
  const ok = routeCount >= 80 && previewCount >= 87;
  return { ok, routeCount, previewCount };
}

/** G6307 — deploy topology section in WISP program doc. */
export function runWispCwlTopologyDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Topology and deploy") &&
    text.includes("leave the HSS backend VM as-is") &&
    text.includes("chrysalis-test-vm") &&
    text.includes("Dual deploy") &&
    text.includes("Firebase Hosting") &&
    text.includes("The POC exists solely to showcase the language");
  return { ok, topologyDocOk: ok };
}

/** G6308 — backend deferral in scenario inventory. */
export function runWispCwlBackendDeferralGate() {
  const path = join(scriptRoot, "fixtures/hub-wisp-management/wisp-scenarios.v1.json");
  if (!existsSync(path)) return { ok: false, skip: "missing-scenario-inventory" };
  const json = JSON.parse(readFileSync(path, "utf8"));
  const deferred = (json.scenarios ?? []).filter((s) => s.backendConversion === "deferred");
  const ok = deferred.some((s) => s.id === "backend-mongodb");
  return { ok, deferredCount: deferred.length };
}

/** G6309 — deploy + bootstrap scripts present (GCE + Firebase). */
export function runWispCwlDeployScriptsGate() {
  const deploy = join(scriptRoot, "scripts/gce-wisp-local-stack-deploy.ps1");
  const bootstrap = join(scriptRoot, "scripts/gce-wisp-chimera-bootstrap.sh");
  const gateway = join(scriptRoot, "scripts/wisp-cwl-chimera-gateway.mjs");
  const clientBuild = join(scriptRoot, "scripts/wisp-cwl-client-build.mjs");
  const firebaseDeploy = join(scriptRoot, "scripts/wisp-cwl-firebase-deploy.mjs");
  const ok =
    existsSync(deploy) &&
    existsSync(bootstrap) &&
    existsSync(gateway) &&
    existsSync(clientBuild) &&
    existsSync(firebaseDeploy);
  return {
    ok,
    deployOk: existsSync(deploy),
    bootstrapOk: existsSync(bootstrap),
    gatewayOk: existsSync(gateway),
    clientBuildOk: existsSync(clientBuild),
    firebaseDeployOk: existsSync(firebaseDeploy),
  };
}

/** G6310 — Phase 0 close composite. */
export async function runWispCwlPhase12Phase0CloseGate() {
  const entry = await runWispCwlPhase12Phase0EntryGate();
  const holeManifest = runWispCwlHoleManifestGate();
  const routes = runWispCwlRoutesFixtureGate();
  const topology = runWispCwlTopologyDocGate();
  const backendDeferral = runWispCwlBackendDeferralGate();
  const deployScripts = runWispCwlDeployScriptsGate();
  const ok =
    entry.ok === true &&
    holeManifest.ok === true &&
    routes.ok === true &&
    topology.ok === true &&
    backendDeferral.ok === true &&
    deployScripts.ok === true;
  return {
    kind: WISP_CWL_PHASE12_PHASE0_CLOSE_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE12_PHASE0_CLOSE_SMOKE_SCHEMA_VERSION,
    ok,
    entry,
    holeManifest,
    routes,
    topology,
    backendDeferral,
    deployScripts,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlPhase12Phase0CloseGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase12-phase0-close-smoke")) main().catch((e) => { console.error(e); process.exit(1); });
