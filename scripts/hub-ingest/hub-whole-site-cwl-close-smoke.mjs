#!/usr/bin/env node
/**
 * Whole-site CWL conversion program close (G9450, DESIGN D6366).
 *
 * Proof tier: one project tree with UI artifacts + traces + CWL routes must
 * (1) pass the G9420–G9440 gates and (2) serve through runtime-cwl.
 * WISP visual parity close remains a separate showcase regression — not this gate.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runSiteConvertSmoke } from "./hub-site-convert-smoke.mjs";
import { runSiteLoadBindSmoke } from "./hub-site-load-bind-smoke.mjs";
import { runSiteScaleMatrixSmoke } from "./hub-site-scale-matrix-smoke.mjs";

export const WHOLE_SITE_CWL_CLOSE_KIND = "chrysalis.hub.whole-site-cwl-close-smoke";
export const WHOLE_SITE_CWL_CLOSE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const proofFixture = join(scriptRoot, "fixtures/site-scale-matrix");

async function loadRuntime(repoRoot) {
  try {
    return await import("@chrysalis/runtime-cwl");
  } catch {
    return import(pathToFileURL(join(repoRoot, "packages/runtime-cwl/dist/index.js")).href);
  }
}

async function loadVerify(repoRoot) {
  try {
    return await import("@chrysalis/verify");
  } catch {
    return import(pathToFileURL(join(repoRoot, "packages/verify/dist/index.js")).href);
  }
}

export function runWholeSiteCwlProgramDocGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const design = readFileSync(join(repoRoot, "DESIGN.md"), "utf8");
  const program = readFileSync(join(repoRoot, "docs/WHOLE-SITE-CWL-CONVERSION.md"), "utf8");
  const roadmap = readFileSync(join(repoRoot, "ROADMAP.md"), "utf8");
  const strategic = readFileSync(join(repoRoot, "docs/STRATEGIC-PLAN.md"), "utf8");
  const checks = {
    d6366: design.includes("D6366"),
    g9450InProgram: program.includes("G9450"),
    g9450InRoadmap: roadmap.includes("G9450"),
    proofIsLast: /proof is last/i.test(program) || /Proof is last/i.test(design),
    closeSmokeNamed:
      program.includes("hub:whole-site-cwl-close-smoke") ||
      roadmap.includes("hub:whole-site-cwl-close-smoke") ||
      strategic.includes("hub:whole-site-cwl-close-smoke"),
  };
  return { ok: Object.values(checks).every(Boolean), checks };
}

/** Serve proof-fixture CWL and assert HTML + load bind evidence. */
export async function runWholeSiteCwlRuntimeProofGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const fixtureDir = resolve(opts.fixtureDir ?? proofFixture);
  const cwlPath = join(fixtureDir, "routes.cwl");
  if (!existsSync(cwlPath)) {
    return { ok: false, skip: "missing-proof-cwl", cwlPath };
  }

  const { createCwlRuntime, loadModuleFromCwlFile, loadCwlUiAssetsFromProject } = await loadRuntime(repoRoot);
  const uiAssets = loadCwlUiAssetsFromProject(fixtureDir);
  const runtime = createCwlRuntime({
    module: loadModuleFromCwlFile(cwlPath, repoRoot),
    ...(uiAssets !== null ? { uiAssets } : {}),
  });

  const login = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/login" });
  const loginBody = await login.text();
  const billing = await runtime.fetch({
    method: "GET",
    url: "http://127.0.0.1/admin/billing",
  });
  const billingBody = await billing.text();
  const css = await runtime.fetch({
    method: "GET",
    url: "http://127.0.0.1/assets/original-css/login.css",
  });
  const cssBody = await css.text();

  const checks = {
    loginStatus: login.status === 200,
    loginHasForm: loginBody.includes("login-form") || loginBody.includes("login-page"),
    loginHasDocumentShell: loginBody.includes("<!DOCTYPE html>") && loginBody.includes("stylesheet"),
    loginHasRouteCss: loginBody.includes("/assets/original-css/login.css"),
    billingStatus: billing.status === 200,
    billingHasDemo: billingBody.includes("wisp-module-demo") || billingBody.includes("wisp-demo-stat"),
    billingHasHydratedStat: billingBody.includes("42"),
    billingHasPageLoadSidecar:
      billingBody.includes("cwl-page-load") &&
      (billingBody.includes("activeRecords") || billingBody.includes('"api_ok"')),
    cssServed: css.status === 200 && cssBody.length > 0,
    uiAssetsLoaded: uiAssets !== null,
  };

  return {
    ok: Object.values(checks).every(Boolean),
    cwlPath,
    checks,
    loginStatus: login.status,
    billingStatus: billing.status,
    cssStatus: css.status,
  };
}

/** Re-run site-scale matrix on the proof fixture (not just the smoke wrapper). */
export async function runWholeSiteCwlMatrixProofGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const fixtureDir = resolve(opts.fixtureDir ?? proofFixture);
  const verify = await loadVerify(repoRoot);
  const report = verify.verifySiteScaleMatrix({ projectDir: fixtureDir });
  return {
    ok: report.ok === true && report.layersChecked === 4 && report.layersFailed === 0,
    report: {
      ok: report.ok,
      layersChecked: report.layersChecked,
      layersFailed: report.layersFailed,
      layers: report.layers.map((l) => ({ layer: l.layer, ok: l.ok, skip: l.skip })),
    },
  };
}

export async function runWholeSiteCwlCloseGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runWholeSiteCwlProgramDocGate({ repoRoot });
  const siteConvert = await runSiteConvertSmoke();
  const siteLoadBind = await runSiteLoadBindSmoke();
  const siteScaleSmoke = await runSiteScaleMatrixSmoke();
  const matrixProof = await runWholeSiteCwlMatrixProofGate({ repoRoot });
  const runtimeProof = await runWholeSiteCwlRuntimeProofGate({ repoRoot });

  const closeReady =
    siteConvert.ok === true &&
    siteLoadBind.ok === true &&
    siteScaleSmoke.ok === true &&
    matrixProof.ok === true &&
    runtimeProof.ok === true;

  return {
    kind: WHOLE_SITE_CWL_CLOSE_KIND,
    schemaVersion: WHOLE_SITE_CWL_CLOSE_SCHEMA_VERSION,
    ok: program.ok === true && closeReady,
    closeReady,
    proofFixture,
    program,
    siteConvert: { ok: siteConvert.ok === true },
    siteLoadBind: { ok: siteLoadBind.ok === true },
    siteScaleSmoke: { ok: siteScaleSmoke.ok === true },
    matrixProof,
    runtimeProof,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWholeSiteCwlCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("whole-site-cwl-close");
  const t0 = progress.start("Whole-site CWL close (G9450)");
  const gate = await runWholeSiteCwlCloseGate(opts);
  progress.end("Whole-site CWL close (G9450)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runWholeSiteCwlCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-whole-site-cwl-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
