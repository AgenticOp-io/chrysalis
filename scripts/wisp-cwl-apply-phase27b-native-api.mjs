#!/usr/bin/env node
/**
 * Phase 27b — replace api-proxy upstream holes with native CWL API handlers.
 * Usage: node scripts/wisp-cwl-apply-phase27b-native-api.mjs [--manifest path] [--out path]
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateWispApiProxyCwl } from "./wisp-cwl-generate-api-proxy-cwl.mjs";
import { buildWispHoleManifest } from "./wisp-cwl-hole-manifest.mjs";

export const WISP_PHASE27B_NATIVE_API_KIND = "chrysalis.wisp.phase27b-native-api";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifest = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-paths.json");
const defaultOut = join(scriptRoot, "fixtures/hub-wisp-management/api-proxy.cwl");

/**
 * @param {object} [opts]
 */
export function applyWispPhase27bNativeApi(opts = {}) {
  const manifestPath = resolve(opts.manifest ?? defaultManifest);
  const outPath = resolve(opts.out ?? defaultOut);
  const generated = generateWispApiProxyCwl({ manifest: manifestPath, out: outPath, mode: "native" });
  if (!generated.ok) return { kind: WISP_PHASE27B_NATIVE_API_KIND, schemaVersion: 1, ok: false, generated };
  const manifest = buildWispHoleManifest({ previewPath: opts.previewPath });
  return {
    kind: WISP_PHASE27B_NATIVE_API_KIND,
    schemaVersion: 1,
    ok: generated.ok === true && manifest.backendConversion === "native-cwl-handlers",
    generated,
    holeManifest: manifest,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = applyWispPhase27bNativeApi();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-phase27b-native-api")) main();
