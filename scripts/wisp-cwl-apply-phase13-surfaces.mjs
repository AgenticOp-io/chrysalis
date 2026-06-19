#!/usr/bin/env node
/** Apply all Phase 13 WISP POC surface patches (M0→M5) after lift copy. */
import { applyWispM0Surfaces } from "./wisp-cwl-apply-m0-surfaces.mjs";
import { applyWispM1Surfaces } from "./wisp-cwl-apply-m1-surfaces.mjs";
import { applyWispM2Surfaces } from "./wisp-cwl-apply-m2-surfaces.mjs";
import { applyWispM3Surfaces } from "./wisp-cwl-apply-m3-surfaces.mjs";
import { applyWispM4Surfaces } from "./wisp-cwl-apply-m4-surfaces.mjs";
import { applyWispM5Surfaces } from "./wisp-cwl-apply-m5-surfaces.mjs";
import { applyWispM6Effects } from "./wisp-cwl-apply-m6-effects.mjs";
import { buildWispHoleManifest } from "./wisp-cwl-hole-manifest.mjs";

/** @param {object} [opts] */
export function applyWispPhase13Surfaces(opts = {}) {
  const m0 = applyWispM0Surfaces(opts);
  const m1 = applyWispM1Surfaces(opts);
  const m2 = applyWispM2Surfaces(opts);
  const m3 = applyWispM3Surfaces(opts);
  const m4 = applyWispM4Surfaces(opts);
  const m5 = applyWispM5Surfaces(opts);
  const m6 = applyWispM6Effects(opts);
  const holeManifest = buildWispHoleManifest();
  const ok = m0.ok && m1.ok && m2.ok && m3.ok && m4.ok && m5.ok && m6.ok;
  return { ok, m0, m1, m2, m3, m4, m5, m6, holeManifest };
}

async function main() {
  const r = applyWispPhase13Surfaces();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-phase13-surfaces")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
