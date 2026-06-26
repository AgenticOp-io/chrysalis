#!/usr/bin/env node
/** WISP full-site program close (G7790) — Phases 27a–27f + G7690 regression. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispPhase27aCloseGate } from "./hub-wisp-phase27a-close-smoke.mjs";
import { runWispPhase27bCloseGate } from "./hub-wisp-phase27b-close-smoke.mjs";
import { runWispPhase27cCloseGate } from "./hub-wisp-phase27c-close-smoke.mjs";
import { runWispPhase27dCloseGate } from "./hub-wisp-phase27d-close-smoke.mjs";
import { runWispPhase27eCloseGate } from "./hub-wisp-phase27e-close-smoke.mjs";
import { runWispPhase27fCloseGate } from "./hub-wisp-phase27f-close-smoke.mjs";
import { runCwlUniversalTranslatorCloseGate } from "./hub-cwl-universal-translator-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_FULL_SITE_CLOSE_SMOKE_KIND = "chrysalis.wisp.full-site-close-smoke";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispFullSiteDocGate() {
  const path = join(scriptRoot, "docs/WISP-FULL-SITE-CWL-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Program closed") &&
    text.includes("G7790") &&
    text.includes("G7701") &&
    text.includes("G7706") &&
    text.includes("replace any website");
  return { ok, programDocOk: ok };
}

export async function runWispFullSiteCloseGate(opts = {}) {
  const progress = createSmokeProgress("wisp-full-site-close-gates");
  const doc = runWispFullSiteDocGate();
  progress.info(`doc ${doc.ok === true ? "ok" : "FAIL"}`);
  let t0 = progress.start("phase27a");
  const phase27a = await runWispPhase27aCloseGate(opts);
  progress.end("phase27a", phase27a.ok === true, t0);
  t0 = progress.start("phase27b");
  const phase27b = await runWispPhase27bCloseGate(opts);
  progress.end("phase27b", phase27b.ok === true, t0);
  t0 = progress.start("phase27c");
  const phase27c = await runWispPhase27cCloseGate(opts);
  progress.end("phase27c", phase27c.ok === true, t0);
  t0 = progress.start("phase27d");
  const phase27d = await runWispPhase27dCloseGate(opts);
  progress.end("phase27d", phase27d.ok === true, t0);
  t0 = progress.start("phase27e");
  const phase27e = await runWispPhase27eCloseGate(opts);
  progress.end("phase27e", phase27e.ok === true, t0);
  t0 = progress.start("phase27f");
  const phase27f = await runWispPhase27fCloseGate(opts);
  progress.end("phase27f", phase27f.ok === true, t0);
  const skipGoldVerify =
    opts.skipGoldVerify === true || process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD === "1";
  t0 = progress.start("g7690-regression");
  const g7690 = await runCwlUniversalTranslatorCloseGate({ ...opts, skipGoldVerify, skipMaintenance: true });
  progress.end("g7690-regression", g7690.ok === true, t0);
  const ok =
    doc.ok === true &&
    phase27a.ok === true &&
    phase27b.ok === true &&
    phase27c.ok === true &&
    phase27d.ok === true &&
    phase27e.ok === true &&
    phase27f.ok === true &&
    g7690.ok === true;
  return {
    kind: WISP_FULL_SITE_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    phase27a,
    phase27b,
    phase27c,
    phase27d,
    phase27e,
    phase27f,
    g7690,
    skipGoldVerify,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispFullSiteCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-full-site-close");
  const t0 = progress.start("WISP full-site close (G7790)");
  const gate = await runWispFullSiteCloseGate(opts);
  progress.end("WISP full-site close (G7790)", gate.ok === true, t0);
  return {
    kind: WISP_FULL_SITE_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispFullSiteCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-full-site-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
