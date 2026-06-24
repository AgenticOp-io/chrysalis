#!/usr/bin/env node
/** Phase 23 Greenfield cutover smoke (G7350). */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCwlModule } from "./cwl-parser.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_GREENFIELD_CUTOVER_SMOKE_KIND = "chrysalis.cwl.greenfield-cutover-smoke";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(scriptRoot, "fixtures/hub-greenfield-cwl-only");
const SUITE_IDS = ["cwl-greenfield-hono", "cwl-greenfield-fastify"];

export function runCwlGreenfieldDocGate() {
  const taxonomy = join(scriptRoot, "docs/CWL-SURFACE-TAXONOMY.md");
  const program = join(scriptRoot, "docs/CWL-UNIVERSAL-LANGUAGE-PROGRAM.md");
  if (!existsSync(taxonomy) || !existsSync(program)) return { ok: false, skip: "missing-docs" };
  const ok =
    readFileSync(taxonomy, "utf8").includes("Greenfield cutover") &&
    readFileSync(program, "utf8").includes("G7350");
  return { ok, docOk: ok };
}

export async function runCwlGreenfieldCutoverGate(opts = {}) {
  const doc = runCwlGreenfieldDocGate();
  const cwlPath = join(opts.fixture ?? FIXTURE, "routes.cwl");
  if (!existsSync(cwlPath)) return { ok: false, skip: "missing-greenfield-fixture", doc };
  const src = readFileSync(cwlPath, "utf8");
  if (src.includes("hub-svelte") || src.includes("hole ")) {
    return { ok: false, skip: "greenfield-has-holes", doc };
  }
  const parsed = parseCwlModule(src, "routes.cwl");
  const hasApi = parsed.routes.some((r) => r.surfaceKind === "api" || r.surfaceKind === "route");
  const hasPage = parsed.routes.some((r) => r.surfaceKind === "page");
  const hasUi = parsed.routes.some((r) => r.body.kind === "ui");
  const webir = await loadWebir();
  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  const p = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
  const goldVerify = {};
  let goldOk = true;
  for (const suite of SUITE_IDS) {
    const gv = spawnSync(process.execPath, [join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs"), "--suite", suite], {
      cwd: scriptRoot,
      encoding: "utf8",
      timeout: 180_000,
    });
    goldVerify[suite] = gv.status === 0;
    if (!goldVerify[suite]) goldOk = false;
  }
  const ok =
    doc.ok === true &&
    hasApi &&
    hasPage &&
    hasUi &&
    p.holeFree === p.total &&
    p.total >= 3 &&
    goldOk;
  return {
    ok,
    doc,
    hasApi,
    hasPage,
    hasUi,
    projection: { holeFree: p.holeFree, total: p.total },
    goldVerify,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlGreenfieldCutoverSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-greenfield-cutover");
  const t0 = progress.start("CWL Greenfield cutover (G7350)");
  const gate = await runCwlGreenfieldCutoverGate(opts);
  progress.end("CWL Greenfield cutover (G7350)", gate.ok === true, t0);
  return { kind: CWL_GREENFIELD_CUTOVER_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlGreenfieldCutoverSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-greenfield-cutover-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
