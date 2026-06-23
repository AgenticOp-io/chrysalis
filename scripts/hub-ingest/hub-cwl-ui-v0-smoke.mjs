#!/usr/bin/env node
/** CWL native UI v0 smoke (G7111) — RFC-0017 server element tree. */
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

export const HUB_CWL_UI_V0_SMOKE_KIND = "chrysalis.hub.cwl-ui-v0-smoke";
export const HUB_CWL_UI_V0_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-cwl-ui-v0");
const goldVerifyScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs");
const traceReplayScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-trace-replay.mjs");

const SUITE_IDS = ["cwl-ui-v0-hono", "cwl-ui-v0-fastify"];

/** G7112 — RFC-0017 doc present and indexed. */
export function runCwlUiV0RfcDocGate() {
  const rfcPath = join(scriptRoot, "docs/CWL-RFC-0017-native-ui-v0.md");
  const indexPath = join(scriptRoot, "docs/CWL-RFC.md");
  if (!existsSync(rfcPath) || !existsSync(indexPath)) {
    return { ok: false, skip: "missing-rfc-0017-or-index" };
  }
  const rfc = readFileSync(rfcPath, "utf8");
  const index = readFileSync(indexPath, "utf8");
  const ok =
    rfc.includes("return ui") &&
    rfc.includes("data.ui.tree") &&
    rfc.includes("G7111") &&
    index.includes("0017") &&
    index.includes("Native UI v0");
  return { ok, rfcDocOk: ok };
}

async function loadCwlProjection(cwlPath) {
  const webir = await loadWebir();
  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  return summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
}

/** G7111 — CWL UI v0 ingest + gold verify composite. */
export async function runCwlUiV0Gate(opts = {}) {
  const rfc = runCwlUiV0RfcDocGate();
  const fixture = resolve(opts.fixture ?? goldFixture);
  const cwlPath = join(fixture, "routes.cwl");
  if (!existsSync(cwlPath)) {
    return { ok: false, skip: "missing-routes-cwl", rfc };
  }
  const src = await readFile(cwlPath, "utf8");
  const parsed = parseCwlModule(src, "routes.cwl");
  const uiPages = parsed.routes.filter((r) => r.surfaceKind === "page" && r.body.kind === "ui");
  if (uiPages.length < 3) {
    return { ok: false, skip: "expected-ui-page-routes", uiPageCount: uiPages.length, rfc };
  }
  const components = parsed.components ?? [];
  if (components.length < 1) {
    return { ok: false, skip: "expected-component-def", componentCount: components.length, rfc };
  }

  let cwlProjection;
  try {
    cwlProjection = await loadCwlProjection(cwlPath);
  } catch (e) {
    return { ok: false, skip: "cwl-ingest-failed", detail: String(e).slice(0, 200), rfc };
  }
  const hasUiTree = JSON.stringify(cwlProjection).includes("ui.tree");
  if (!hasUiTree) {
    return { ok: false, skip: "missing-ui-tree-webir", rfc, cwlProjection };
  }

  /** @type {Record<string, boolean>} */
  const goldVerify = {};
  /** @type {Record<string, boolean>} */
  const traceReplay = {};
  let goldOk = true;
  let traceOk = true;
  for (const suite of SUITE_IDS) {
    const gv = spawnSync(process.execPath, [goldVerifyScript, "--suite", suite], {
      cwd: scriptRoot,
      encoding: "utf8",
      timeout: 120_000,
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

  const programPath = join(scriptRoot, "docs/CWL-LANGUAGE-PROGRAM.md");
  const program = existsSync(programPath) ? readFileSync(programPath, "utf8") : "";
  const programOk = program.includes("Phase 15") && program.includes("G7110");

  const ok = rfc.ok === true && hasUiTree && goldOk && traceOk && programOk;
  return {
    kind: HUB_CWL_UI_V0_SMOKE_KIND,
    schemaVersion: HUB_CWL_UI_V0_SMOKE_SCHEMA_VERSION,
    ok,
    rfc,
    uiPageCount: uiPages.length,
    hasUiTree,
    goldVerify,
    traceReplay,
    programOk,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlUiV0Smoke(opts = {}) {
  const progress = createSmokeProgress("cwl-ui-v0");
  const t0 = progress.start("CWL UI v0 (G7111)");
  const gate = await runCwlUiV0Gate(opts);
  progress.end("CWL UI v0 (G7111)", gate.ok === true, t0);
  return {
    kind: HUB_CWL_UI_V0_SMOKE_KIND,
    schemaVersion: HUB_CWL_UI_V0_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlUiV0Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-ui-v0-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
