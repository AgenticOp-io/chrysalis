#!/usr/bin/env node
/**
 * Apply Phase 27b–27f + Phase 28g on WISP fixture (post-G7790 production POC path).
 */
import { applyWispPhase27bNativeApi } from "./wisp-cwl-apply-phase27b-native-api.mjs";
import { applyWispPhase27cNativeUi } from "./wisp-cwl-apply-phase27c-native-ui.mjs";
import { applyWispPhase27dNativeAuth } from "./wisp-cwl-apply-phase27d-native-auth.mjs";
import { applyWispPhase27fCutover } from "./wisp-cwl-apply-phase27f-cutover.mjs";
import { applyWispPhase28gIntegrationsUi } from "./wisp-cwl-apply-phase28g-integrations-ui.mjs";
import { buildWispHoleManifest } from "./wisp-cwl-hole-manifest.mjs";

export const WISP_POST_G7790_CHAIN_KIND = "chrysalis.wisp.post-g7790-apply-chain";

/** @param {object} [opts] */
export function applyWispPostG7790Chain(opts = {}) {
  const phase27b = applyWispPhase27bNativeApi(opts);
  const phase27c = applyWispPhase27cNativeUi(opts);
  const phase27d = applyWispPhase27dNativeAuth(opts);
  const phase27f = applyWispPhase27fCutover(opts);
  const phase28g = applyWispPhase28gIntegrationsUi(opts);
  const holeManifest = buildWispHoleManifest(opts);
  const ok =
    phase27b.ok === true &&
    phase27c.ok === true &&
    phase27d.ok === true &&
    phase27f.ok === true &&
    phase28g.ok === true &&
    holeManifest.ok === true &&
    holeManifest.uiHoleCount === 0 &&
    holeManifest.upstreamProxyHoles === 0;
  return {
    kind: WISP_POST_G7790_CHAIN_KIND,
    schemaVersion: 1,
    ok,
    phase27b,
    phase27c,
    phase27d,
    phase27f,
    phase28g,
    holeManifest,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = applyWispPostG7790Chain();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-post-g7790-chain")) main();
