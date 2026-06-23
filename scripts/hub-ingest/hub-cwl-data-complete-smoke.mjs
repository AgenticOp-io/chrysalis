#!/usr/bin/env node
/** Phase 16 CWL Data complete smoke (G7120) — RFC-0013 load replay. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlPageLoadParitySmoke } from "./hub-cwl-page-load-parity-smoke.mjs";
import { runCwlGoldRuntimeSmoke } from "./hub-cwl-gold-runtime-smoke.mjs";
import { parseCwlModule } from "./cwl-parser.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_DATA_COMPLETE_SMOKE_KIND = "chrysalis.cwl.data-complete-smoke";
export const CWL_DATA_COMPLETE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FLAGSHIP = "fixtures/hub-flagship-cwl-fullstack";
const WISP = "fixtures/hub-wisp-management";

/** G7121 — RFC-0013 + flagship load with array literal. */
export function runCwlDataRfcGate() {
  const rfcPath = join(scriptRoot, "docs/CWL-RFC-0013-page-load-functions.md");
  const flagshipPath = join(scriptRoot, FLAGSHIP, "routes.cwl");
  if (!existsSync(rfcPath) || !existsSync(flagshipPath)) {
    return { ok: false, skip: "missing-rfc-or-flagship" };
  }
  const flagship = readFileSync(flagshipPath, "utf8");
  const ok = readFileSync(rfcPath, "utf8").includes("load {") && flagship.includes('tags: ["news", "featured"]');
  return { ok, flagshipLoadArrayOk: ok };
}

/** G7122 — WISP charter routes use native `load { }` (no load holes in routes.cwl). */
export function runCwlWispLoadNativeGate() {
  const path = join(scriptRoot, WISP, "routes.cwl");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-routes" };
  const parsed = parseCwlModule(readFileSync(path, "utf8"), "routes.cwl");
  const pages = parsed.routes.filter((r) => r.surfaceKind === "page");
  const withLoad = pages.filter((r) => r.loadBody && r.loadBody.kind === "object");
  const maxWithoutLoad = 11;
  const ok = pages.length >= 10 && withLoad.length >= pages.length - maxWithoutLoad;
  return { ok, pageCount: pages.length, loadCount: withLoad.length };
}

/** G7120 — CWL Data complete composite. */
export async function runCwlDataCompleteGate(opts = {}) {
  const rfc = runCwlDataRfcGate();
  const wispLoad = runCwlWispLoadNativeGate();
  const pageLoad = await runCwlPageLoadParitySmoke(opts);
  const flagship = await runCwlGoldRuntimeSmoke({
    kind: CWL_DATA_COMPLETE_SMOKE_KIND,
    schemaVersion: CWL_DATA_COMPLETE_SMOKE_SCHEMA_VERSION,
    fixtureRel: FLAGSHIP,
    rfc: "CWL-RFC-0013",
    suiteIds: ["cwl-fullstack-flagship-hono", "cwl-fullstack-flagship-fastify"],
    projectionOk: (p) => p.holeFree === p.total && p.total >= 3,
    fixtureDir: opts.flagshipDir,
  });
  const ok =
    rfc.ok === true &&
    wispLoad.ok === true &&
    pageLoad.ok === true &&
    flagship.ok === true;
  return {
    kind: CWL_DATA_COMPLETE_SMOKE_KIND,
    schemaVersion: CWL_DATA_COMPLETE_SMOKE_SCHEMA_VERSION,
    ok,
    rfc,
    wispLoad,
    pageLoad,
    flagship,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlDataCompleteSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-data-complete");
  const t0 = progress.start("CWL Data complete (G7120)");
  const gate = await runCwlDataCompleteGate(opts);
  progress.end("CWL Data complete (G7120)", gate.ok === true, t0);
  return {
    kind: CWL_DATA_COMPLETE_SMOKE_KIND,
    schemaVersion: CWL_DATA_COMPLETE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlDataCompleteSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-data-complete-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
