#!/usr/bin/env node
/** Phase 28b pipeline gate (G7803). */
import { runWispCwlFullBuild } from "../wisp-cwl-full-build.mjs";

export const WISP_PRODUCTION_POC_PIPELINE_KIND = "chrysalis.wisp.production-poc-pipeline-smoke";

export function runWispProductionPocPipelineGate() {
  const build = runWispCwlFullBuild({ skipLift: true });
  const chainStep = build.steps?.find((s) => s.step === "post-g7790-apply-chain");
  const ok = build.ok === true && chainStep?.status === 0 && chainStep?.chainOk === true;
  return {
    kind: WISP_PRODUCTION_POC_PIPELINE_KIND,
    schemaVersion: 1,
    ok,
    buildOk: build.ok === true,
    chainOk: chainStep?.chainOk === true,
    holeManifest: build.holeManifest,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispProductionPocPipelineGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-poc-pipeline-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
