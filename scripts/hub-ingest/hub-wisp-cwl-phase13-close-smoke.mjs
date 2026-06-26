#!/usr/bin/env node
/** Phase 13 close smoke (G6410) — M0–M6 surfaces + taxonomy + hole budget. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispCwlPhase13M0Gate } from "./hub-wisp-cwl-phase13-m0-smoke.mjs";
import { runWispCwlPhase13M1Gate } from "./hub-wisp-cwl-phase13-m1-smoke.mjs";
import { runWispCwlPhase13M2Gate } from "./hub-wisp-cwl-phase13-m2-smoke.mjs";
import { runWispCwlPhase13M3Gate } from "./hub-wisp-cwl-phase13-m3-smoke.mjs";
import { runWispCwlPhase13M4Gate } from "./hub-wisp-cwl-phase13-m4-smoke.mjs";
import { runWispCwlPhase13M5Gate } from "./hub-wisp-cwl-phase13-m5-smoke.mjs";
import { runWispCwlPhase13M6Gate } from "./hub-wisp-cwl-phase13-m6-smoke.mjs";
import { runCwlSurfaceTaxonomyDocGate } from "./hub-cwl-surface-taxonomy-smoke.mjs";
import { buildWispHoleManifest } from "../wisp-cwl-hole-manifest.mjs";
import { applyWispPhase13Surfaces } from "../wisp-cwl-apply-phase13-surfaces.mjs";
import { applyWispM6Effects } from "../wisp-cwl-apply-m6-effects.mjs";
import { isWispFullSiteCwlProgramClosed } from "./hub-cwl-fullstack-gates.mjs";

export const WISP_CWL_PHASE13_CLOSE_SMOKE_KIND = "chrysalis.wisp-cwl-phase13-close-smoke";
export const WISP_CWL_PHASE13_CLOSE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6411 — WISP program doc records Phase 13 close. */
export function runWispPhase13CloseDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Phase 13 closed") &&
    text.includes("G6410") &&
    text.includes("M6") &&
    text.includes("CWL Effects");
  return { ok, phase13CloseDocOk: ok };
}

/** G6412 — hole manifest at M5 cutover (login firebase only) or post-G7790 zero-hole native. */
export function runWispPhase13CloseHoleGate() {
  const live = buildWispHoleManifest();
  const fullSiteClosed = isWispFullSiteCwlProgramClosed();
  const ok = fullSiteClosed
    ? live.ok === true && live.uiHoleCount === 0 && live.totalUiHoles === 0
    : live.ok === true &&
      live.uiHoleCount === 1 &&
      live.byReason?.["hub-svelte:firebase-auth"] === 1;
  return {
    ok,
    mode: fullSiteClosed ? "wisp-full-site-closed" : "phase13-m5",
    uiHoleCount: live.uiHoleCount,
    routeCount: live.routeCount,
  };
}

/** G6410 — Phase 13 close composite. */
export async function runWispCwlPhase13CloseGate(opts = {}) {
  const fullSiteClosed = isWispFullSiteCwlProgramClosed();
  if (opts.apply !== false && !fullSiteClosed) {
    applyWispPhase13Surfaces();
    applyWispM6Effects();
  } else if (!fullSiteClosed) {
    buildWispHoleManifest();
  }
  const taxonomy = runCwlSurfaceTaxonomyDocGate();
  const doc = runWispPhase13CloseDocGate();
  const holes = runWispPhase13CloseHoleGate();
  const skipped = { ok: true, skip: "post-g7790-fixture" };
  const m0 = fullSiteClosed ? skipped : await runWispCwlPhase13M0Gate({ apply: false });
  const m1 = fullSiteClosed ? skipped : await runWispCwlPhase13M1Gate({ apply: false });
  const m2 = fullSiteClosed ? skipped : await runWispCwlPhase13M2Gate({ apply: false });
  const m3 = fullSiteClosed ? skipped : await runWispCwlPhase13M3Gate({ apply: false });
  const m4 = fullSiteClosed ? skipped : await runWispCwlPhase13M4Gate({ apply: false });
  const m5 = fullSiteClosed ? skipped : await runWispCwlPhase13M5Gate({ apply: false });
  const m6 = fullSiteClosed ? skipped : await runWispCwlPhase13M6Gate({ apply: false });
  const ok =
    taxonomy.ok === true &&
    doc.ok === true &&
    holes.ok === true &&
    m0.ok === true &&
    m1.ok === true &&
    m2.ok === true &&
    m3.ok === true &&
    m4.ok === true &&
    m5.ok === true &&
    m6.ok === true;
  return {
    kind: WISP_CWL_PHASE13_CLOSE_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE13_CLOSE_SMOKE_SCHEMA_VERSION,
    ok,
    mode: fullSiteClosed ? "wisp-full-site-closed" : "phase13-closed",
    taxonomy,
    doc,
    holes,
    m0,
    m1,
    m2,
    m3,
    m4,
    m5,
    m6,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlPhase13CloseGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase13-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
