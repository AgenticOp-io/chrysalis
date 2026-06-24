#!/usr/bin/env node
/** Phase 22 Universal ingest smoke (G7340). */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_UNIVERSAL_INGEST_SMOKE_KIND = "chrysalis.cwl.universal-ingest-smoke";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const PILOT_FIXTURES = [
  "fixtures/hub-flagship-cwl-fullstack",
  "fixtures/hub-greenfield-cwl-only",
  "fixtures/hub-gold-cwl-data-v2",
];

export function runCwlUniversalIngestDocGate() {
  const path = join(scriptRoot, "docs/CWL-UNIVERSAL-LANGUAGE-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok = text.includes("Phase 22") && text.includes("G7340") && text.includes("Universal ingest");
  return { ok, docOk: ok };
}

export async function runCwlUniversalIngestGate(opts = {}) {
  const doc = runCwlUniversalIngestDocGate();
  const webir = await loadWebir();
  /** @type {Record<string, { holeFree: number, total: number }>} */
  const pilots = {};
  let nativeOk = true;
  let totalRoutes = 0;
  let holeFreeRoutes = 0;
  for (const rel of PILOT_FIXTURES) {
    const cwlPath = join(scriptRoot, rel, "routes.cwl");
    if (!existsSync(cwlPath)) {
      nativeOk = false;
      continue;
    }
    const snapshot = await exportCwlFileToWebirJson(cwlPath);
    const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
    const p = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
    pilots[rel] = { holeFree: p.holeFree, total: p.total };
    totalRoutes += p.total;
    holeFreeRoutes += p.holeFree;
    if (p.total === 0 || p.holeFree / p.total < 0.99) nativeOk = false;
  }

  const svelteGold = spawnSync(
    process.execPath,
    [join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs"), "--suite", "svelte-literal-cwl"],
    { cwd: scriptRoot, encoding: "utf8", timeout: 120_000 },
  );
  const svelteStructuralOk = svelteGold.status === 0;

  const ok = doc.ok === true && nativeOk && totalRoutes >= 4 && svelteStructuralOk;
  return {
    ok,
    doc,
    pilots,
    nativeRatio: totalRoutes ? holeFreeRoutes / totalRoutes : 0,
    svelteStructuralOk,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlUniversalIngestSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-universal-ingest");
  const t0 = progress.start("CWL Universal ingest (G7340)");
  const gate = await runCwlUniversalIngestGate(opts);
  progress.end("CWL Universal ingest (G7340)", gate.ok === true, t0);
  return { kind: CWL_UNIVERSAL_INGEST_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlUniversalIngestSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-universal-ingest-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
