#!/usr/bin/env node
/** Pilot ingest depth smoke (G7402) — PHP origins → hole-free CWL export. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPilotCharter, resolvePilotCwlFixture } from "./hub-cwl-pilot-charter.mjs";
import { runProjectToCwlOracleGates } from "./hub-project-to-cwl-gates.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PILOT_INGEST_SMOKE_KIND = "chrysalis.cwl.pilot-ingest-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlPilotIngestDocGate() {
  const path = join(scriptRoot, "docs/CWL-CUSTOMER-PILOT-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok = text.includes("Phase 24b") && text.includes("G7402") && text.includes("Ingest depth");
  return { ok, docOk: ok };
}

export async function runCwlPilotIngestGate(opts = {}) {
  const doc = runCwlPilotIngestDocGate();
  const loaded = loadPilotCharter();
  if (!loaded.ok) {
    return { ok: false, doc, charter: loaded, generatedAt: new Date().toISOString() };
  }
  const charter = loaded.charter;
  const fixtures = charter.ingestOrigins.map((o) => ({
    id: o.id,
    rel: o.rel,
    origin: o.origin,
    requireHoleFree: o.requireHoleFree !== false,
  }));
  const oracle = await runProjectToCwlOracleGates({ ...opts, fixtures });

  const fixture = resolvePilotCwlFixture(charter);
  const cwlPath = join(fixture, "routes.cwl");
  let nativeRatio = 0;
  if (existsSync(cwlPath)) {
    const webir = await loadWebir();
    const snapshot = await exportCwlFileToWebirJson(cwlPath);
    const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
    const p = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
    nativeRatio = p.total ? p.holeFree / p.total : 0;
  }
  const minNative = charter.minNativeRatio ?? 0.99;
  const nativeOk = nativeRatio >= minNative;

  const ok = doc.ok === true && oracle.ok === true && nativeOk;
  return {
    kind: CWL_PILOT_INGEST_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    oracle,
    nativeRatio,
    minNativeRatio: minNative,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlPilotIngestSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-pilot-ingest");
  const t0 = progress.start("CWL pilot ingest (G7402)");
  const gate = await runCwlPilotIngestGate(opts);
  progress.end("CWL pilot ingest (G7402)", gate.ok === true, t0);
  return { kind: CWL_PILOT_INGEST_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPilotIngestSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-pilot-ingest-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
