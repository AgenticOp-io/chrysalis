#!/usr/bin/env node
/** Phase 14 operator close smoke (G6520) — HSS chimera deploy readiness + Phase 13 regression. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispCwlPhase13CloseGate } from "./hub-wisp-cwl-phase13-close-smoke.mjs";
import { runWispCwlPhase14ClientRedirectGate } from "./hub-wisp-cwl-phase14-client-redirect-smoke.mjs";
import { runWispCwlPipelineSmokeGate } from "./hub-wisp-cwl-pipeline-smoke.mjs";
import { runWispCwlProgramDocGate } from "./hub-wisp-cwl-phase12-phase0-entry-smoke.mjs";
import { prepareWispCwlDeployBundle } from "../wisp-cwl-pipeline.mjs";

export const WISP_CWL_PHASE14_OPERATOR_CLOSE_SMOKE_KIND = "chrysalis.wisp-cwl-phase14-operator-close-smoke";
export const WISP_CWL_PHASE14_OPERATOR_CLOSE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6521 — deploy bundle matches post-apply fixtures (GCE tarball must not drift). */
export function runWispDeployBundleSyncGate() {
  const fixtureRoutes = join(scriptRoot, "fixtures/hub-wisp-management/routes.cwl");
  const bundle = prepareWispCwlDeployBundle({ skipLift: true });
  if (!bundle.ok) return { ok: false, skip: bundle.skip ?? "bundle-failed" };
  const bundleRoutes = join(bundle.bundleDir, "routes.cwl");
  if (!existsSync(bundleRoutes) || !existsSync(fixtureRoutes)) {
    return { ok: false, skip: "missing-bundle-or-fixture-routes" };
  }
  const fixtureText = readFileSync(fixtureRoutes, "utf8");
  const bundleText = readFileSync(bundleRoutes, "utf8");
  const syncOk = fixtureText === bundleText;
  return { ok: syncOk, bundleSyncOk: syncOk, bundleDir: bundle.bundleDir };
}

/** G6522 — operator close doc gate. */
export function runWispPhase14OperatorCloseDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6520") &&
    text.includes("G6510") &&
    text.includes("Phase 14") &&
    text.includes("ACS / TR-069 as CWL language goals");
  return { ok, phase14CloseDocOk: ok };
}

/** G6520 — Phase 14 operator close composite. */
export async function runWispCwlPhase14OperatorCloseGate(opts = {}) {
  const doc = runWispPhase14OperatorCloseDocGate();
  const programDoc = runWispCwlProgramDocGate();
  const clientRedirect = runWispCwlPhase14ClientRedirectGate({ apply: opts.apply !== false });
  const bundleSync = runWispDeployBundleSyncGate();
  const phase13 = await runWispCwlPhase13CloseGate({ apply: false });
  const pipeline =
    opts.skipPipeline === true
      ? { ok: true, skip: "skip-pipeline" }
      : await runWispCwlPipelineSmokeGate({ ci: true, skipLift: true });
  const ok =
    doc.ok === true &&
    programDoc.ok === true &&
    clientRedirect.ok === true &&
    bundleSync.ok === true &&
    phase13.ok === true &&
    pipeline.ok === true;
  return {
    kind: WISP_CWL_PHASE14_OPERATOR_CLOSE_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE14_OPERATOR_CLOSE_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    programDoc,
    clientRedirect,
    bundleSync,
    phase13,
    pipeline,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlPhase14OperatorCloseGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase14-operator-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
