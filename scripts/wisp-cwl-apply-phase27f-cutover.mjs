#!/usr/bin/env node
/**
 * Phase 27f — runtime-cwl cutover: disable Svelte sidecar, enable native /api in chimera.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWispPipelineConfig } from "./wisp-cwl-pipeline.mjs";

export const WISP_PHASE27F_CUTOVER_KIND = "chrysalis.wisp.phase27f-cutover";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pipelinePath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-pipeline.config.json");

/**
 * @param {object} [opts]
 */
export function applyWispPhase27fCutover(opts = {}) {
  const configPath = opts.pipelinePath ?? pipelinePath;
  if (!existsSync(configPath)) return { kind: WISP_PHASE27F_CUTOVER_KIND, schemaVersion: 1, ok: false, skip: "missing-pipeline-config" };

  const pipeline = loadWispPipelineConfig();
  pipeline.gce = {
    ...pipeline.gce,
    svelteSidecar: false,
    svelteFallback: "",
    apiMode: "runtime-cwl-native",
    nativeApi: true,
  };
  if (pipeline.deployTargets?.gce) {
    pipeline.deployTargets.gce = {
      ...pipeline.deployTargets.gce,
      apiMode: "runtime-cwl-native",
    };
  }
  writeFileSync(configPath, `${JSON.stringify(pipeline, null, 2)}\n`, "utf8");

  const nativeOk = pipeline.gce?.svelteSidecar !== true;
  return {
    kind: WISP_PHASE27F_CUTOVER_KIND,
    schemaVersion: 1,
    ok: nativeOk === true,
    pipeline,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = applyWispPhase27fCutover();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-phase27f-cutover")) main();
