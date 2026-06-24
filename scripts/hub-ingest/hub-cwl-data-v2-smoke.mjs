#!/usr/bin/env node
/** Phase 20 CWL Data v2 smoke (G7320). */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCwlModule } from "./cwl-parser.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { runSveltekitDeepCwlExportSmoke } from "./hub-sveltekit-deep-cwl-export-smoke.mjs";
import { runNextjsDeepCwlExportSmoke } from "./hub-nextjs-deep-cwl-export-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_DATA_V2_SMOKE_KIND = "chrysalis.cwl.data-v2-smoke";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @param {import("./cwl-parser.mjs").CwlLoadBody | null | undefined} loadBody */
function loadObjectEntries(loadBody) {
  return loadBody?.kind === "object" ? loadBody.entries ?? [] : [];
}
const FIXTURE = join(scriptRoot, "fixtures/hub-gold-cwl-data-v2");
const SUITE_IDS = ["cwl-data-v2-hono", "cwl-data-v2-fastify"];

export function runCwlDataV2RfcGate() {
  const path = join(scriptRoot, "docs/CWL-RFC-0013-page-load-functions.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-rfc-0013" };
  const text = readFileSync(path, "utf8");
  const ok = text.includes("v2 extensions") && text.includes("G7320") && text.includes("Load redirect");
  return { ok, rfcV2Ok: ok };
}

/** G7321 — SvelteKit deep + Next.js deep gold export CWL Data `load { }` shapes. */
export async function runCwlDataV2FrameworkIngestGate(opts = {}) {
  const svelte = await runSveltekitDeepCwlExportSmoke(opts);
  const nextjs = await runNextjsDeepCwlExportSmoke(opts);
  const ok = svelte.ok === true && nextjs.ok === true;
  return { ok, svelte, nextjs };
}

export async function runCwlDataV2Gate(opts = {}) {
  const rfc = runCwlDataV2RfcGate();
  const framework = await runCwlDataV2FrameworkIngestGate(opts);
  const cwlPath = join(opts.fixture ?? FIXTURE, "routes.cwl");
  if (!existsSync(cwlPath)) return { ok: false, skip: "missing-data-v2-fixture", rfc, framework };
  const src = readFileSync(cwlPath, "utf8");
  const parsed = parseCwlModule(src, "routes.cwl");
  const loadUi = parsed.routes.filter((r) => r.loadBody && r.body.kind === "ui");
  const redirect = parsed.routes.some((r) =>
    loadObjectEntries(r.loadBody).some((e) => e.key === "redirect"),
  );
  const loadError = parsed.routes.some((r) =>
    loadObjectEntries(r.loadBody).some((e) => e.key === "error"),
  );
  const cookieLoad = src.includes("cookie session_id");
  if (loadUi.length < 1 || !redirect || !loadError || !cookieLoad) {
    return { ok: false, skip: "data-v2-shapes-missing", loadUi: loadUi.length, redirect, loadError, cookieLoad, rfc };
  }
  const webir = await loadWebir();
  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  const p = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
  const json = JSON.stringify(raw);
  const hasRedirect = json.includes("redirect");
  const hasLoadUi = json.includes("cwl-page-load-ui") || json.includes("__page_load");

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

  const ok = rfc.ok && framework.ok === true && hasRedirect && hasLoadUi && p.holeFree === p.total && goldOk;
  return {
    ok,
    rfc,
    framework,
    projection: { holeFree: p.holeFree, total: p.total },
    hasRedirect,
    hasLoadUi,
    goldVerify,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlDataV2Smoke(opts = {}) {
  const progress = createSmokeProgress("cwl-data-v2");
  const t0 = progress.start("CWL Data v2 (G7320)");
  const gate = await runCwlDataV2Gate(opts);
  progress.end("CWL Data v2 (G7320)", gate.ok === true, t0);
  return { kind: CWL_DATA_V2_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlDataV2Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-data-v2-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
