#!/usr/bin/env node
/** CWL native UI v1 smoke (G7311) — RFC-0019 islands + events. */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCwlModule } from "./cwl-parser.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const HUB_CWL_UI_V1_SMOKE_KIND = "chrysalis.hub.cwl-ui-v1-smoke";
export const HUB_CWL_UI_V1_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-cwl-ui-v1");
const goldVerifyScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs");
const traceReplayScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-trace-replay.mjs");
const SUITE_IDS = ["cwl-ui-v1-hono", "cwl-ui-v1-fastify"];

export function runCwlUiV1RfcDocGate() {
  const rfcPath = join(scriptRoot, "docs/CWL-RFC-0019-native-ui-v1.md");
  const indexPath = join(scriptRoot, "docs/CWL-RFC.md");
  if (!existsSync(rfcPath) || !existsSync(indexPath)) {
    return { ok: false, skip: "missing-rfc-0019-or-index" };
  }
  const rfc = readFileSync(rfcPath, "utf8");
  const index = readFileSync(indexPath, "utf8");
  const ok =
    rfc.includes("client ui") &&
    rfc.includes("data-cwl-island") &&
    rfc.includes("G7310") &&
    index.includes("0019");
  return { ok, rfcDocOk: ok };
}


export async function runCwlUiV1Gate(opts = {}) {
  const rfc = runCwlUiV1RfcDocGate();
  const fixture = resolve(opts.fixture ?? goldFixture);
  const cwlPath = join(fixture, "routes.cwl");
  if (!existsSync(cwlPath)) return { ok: false, skip: "missing-routes-cwl", rfc };
  const src = await readFile(cwlPath, "utf8");
  const parsed = parseCwlModule(src, "routes.cwl");
  const uiPages = parsed.routes.filter((r) => r.surfaceKind === "page" && r.body.kind === "ui");
  const withLoad = parsed.routes.filter((r) => r.loadBody && r.body.kind === "ui");
  if (uiPages.length < 2) return { ok: false, skip: "expected-ui-v1-pages", uiPageCount: uiPages.length, rfc };
  if (!src.includes("client ui") || !src.includes("on click")) {
    return { ok: false, skip: "missing-island-or-event", rfc };
  }
  if (withLoad.length < 1) return { ok: false, skip: "missing-load-ui-page", rfc };

  let projection;
  let rawSnapshot;
  try {
    const webir = await loadWebir();
    rawSnapshot = await exportCwlFileToWebirJson(cwlPath);
    const raw = typeof rawSnapshot === "string" ? JSON.parse(rawSnapshot) : rawSnapshot;
    projection = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
  } catch (e) {
    return { ok: false, skip: "cwl-ingest-failed", detail: String(e).slice(0, 200), rfc };
  }
  const json = typeof rawSnapshot === "string" ? rawSnapshot : JSON.stringify(rawSnapshot);
  const hasUiTree = json.includes("ui.tree");
  const hasIsland = json.includes('"kind":"island"') || json.includes('"kind": "island"');
  if (!hasUiTree || !hasIsland) {
    return { ok: false, skip: "missing-ui-v1-webir", hasUiTree, hasIsland, rfc };
  }

  const goldVerify = {};
  const traceReplay = {};
  let goldOk = true;
  let traceOk = true;
  for (const suite of SUITE_IDS) {
    const gv = spawnSync(process.execPath, [goldVerifyScript, "--suite", suite], {
      cwd: scriptRoot,
      encoding: "utf8",
      timeout: 180_000,
    });
    goldVerify[suite] = gv.status === 0;
    if (!goldVerify[suite]) goldOk = false;
    const tr = spawnSync(process.execPath, [traceReplayScript, "--suite", suite], {
      cwd: scriptRoot,
      encoding: "utf8",
      timeout: 180_000,
    });
    traceReplay[suite] = tr.status === 0;
    if (!traceReplay[suite]) traceOk = false;
  }

  const programPath = join(scriptRoot, "docs/CWL-UNIVERSAL-LANGUAGE-PROGRAM.md");
  const program = existsSync(programPath) ? readFileSync(programPath, "utf8") : "";
  const programOk = program.includes("Phase 19") && program.includes("G7310");

  const ok = rfc.ok === true && hasUiTree && hasIsland && goldOk && traceOk && programOk;
  return {
    kind: HUB_CWL_UI_V1_SMOKE_KIND,
    schemaVersion: HUB_CWL_UI_V1_SMOKE_SCHEMA_VERSION,
    ok,
    rfc,
    uiPageCount: uiPages.length,
    hasUiTree,
    hasIsland,
    goldVerify,
    traceReplay,
    programOk,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlUiV1Smoke(opts = {}) {
  const progress = createSmokeProgress("cwl-ui-v1");
  const t0 = progress.start("CWL UI v1 (G7311)");
  const gate = await runCwlUiV1Gate(opts);
  progress.end("CWL UI v1 (G7311)", gate.ok === true, t0);
  return {
    kind: HUB_CWL_UI_V1_SMOKE_KIND,
    schemaVersion: HUB_CWL_UI_V1_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlUiV1Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-ui-v1-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
