#!/usr/bin/env node
/** Firebase CWL static export staging gate (G7910). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWispClient } from "../wisp-cwl-client-build.mjs";
import { loadWispPipelineConfig } from "../wisp-cwl-pipeline.mjs";
import { stageWispCwlStaticExportClient } from "../wisp-cwl-firebase-static-stage.mjs";

export const WISP_CWL_FIREBASE_STATIC_EXPORT_STAGE_KIND =
  "chrysalis.wisp.firebase-static-export-stage-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispCwlFirebaseStaticExportStageDocGate() {
  const programPath = join(scriptRoot, "docs/WISP-PRODUCTION-COMPLETION-PROGRAM.md");
  const pipelinePath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-pipeline.config.json");
  if (!existsSync(programPath) || !existsSync(pipelinePath)) {
    return { ok: false, skip: "missing-program-or-pipeline-config" };
  }
  const program = readFileSync(programPath, "utf8");
  const pipeline = readFileSync(pipelinePath, "utf8");
  const ok =
    program.includes("cwl-static-export") &&
    pipeline.includes("cwl-static-export") &&
    pipeline.includes("cwlStaticExportDir");
  return { ok, docOk: ok };
}

export function runWispCwlFirebaseStaticExportStageGate() {
  const doc = runWispCwlFirebaseStaticExportStageDocGate();
  const config = loadWispPipelineConfig();
  const apiModeOk =
    config.firebase?.apiMode === "cwl-static-export" &&
    config.deployTargets?.firebase?.apiMode === "cwl-static-export";
  const stage = stageWispCwlStaticExportClient({ dryRun: true });
  const clientBuild = buildWispClient({ deployTarget: "firebase", dryRun: true });
  const ok =
    doc.ok === true &&
    apiModeOk === true &&
    stage.ok === true &&
    clientBuild.ok === true &&
    clientBuild.buildMode === "cwl-static-export";
  return {
    kind: WISP_CWL_FIREBASE_STATIC_EXPORT_STAGE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    apiModeOk,
    stage,
    clientBuild,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispCwlFirebaseStaticExportStageGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-firebase-static-export-stage-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
