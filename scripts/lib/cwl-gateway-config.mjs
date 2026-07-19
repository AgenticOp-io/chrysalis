#!/usr/bin/env node
/** Runtime-only WISP pipeline config loader (GCE chimera bundle — no hub-ingest deps). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** @returns {Record<string, unknown>} */
export function loadWispPipelineConfig() {
  const localDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(localDir, "wisp-pipeline.config.json"),
    join(repoRoot, "fixtures/hub-wisp-management/wisp-pipeline.config.json"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  }
  return {
    kind: "chrysalis.wisp.pipeline-config",
    schemaVersion: 1,
    reportPath: "reports/wisp/wisp-cwl-pipeline.json",
    gce: {},
  };
}

/**
 * Operator GCE deploy: CWL-native UI from converted Svelte (actual build).
 * Svelte sidecar is opt-in debug only (CHRYSALIS_WISP_SVELTE_SIDECAR=1) — not the conversion product.
 * GenieACS ignored — removed from source (**D6205**).
 */
export function patchOperatorGceDeployPipelineConfig(config) {
  return {
    ...config,
    gce: {
      ...(config.gce ?? {}),
      svelteSidecar: false,
      svelteFallback: "",
      operatorUi: "cwl-native",
      cwlNativePrefixes: "*",
      nativeApi: true,
      apiMode: "runtime-cwl-native",
      // Live-first API: proxy /api to the real HSS backend (MongoDB) with
      // gateway-held demo auth; native seeded API is the fallback only.
      liveApi: true,
    },
  };
}

/** Files copied beside wisp-cwl-chimera-gateway.mjs on GCE deploy. */
export const WISP_CWL_GCE_GATEWAY_SUPPORT_FILES = [
  "wisp-cwl-gateway-config.mjs",
  "wisp-cwl-post-g7790.mjs",
  "wisp-pipeline.config.json",
];
