#!/usr/bin/env node
/** CWL-authored complete smoke (G7502) — 100% native on chartered modules. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFullLanguageCharter } from "./hub-cwl-full-language-charter.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_AUTHORED_COMPLETE_SMOKE_KIND = "chrysalis.cwl.authored-complete-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlAuthoredCompleteDocGate() {
  const path = join(scriptRoot, "docs/CWL-FULL-WEB-LANGUAGE-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok = text.includes("Phase 25b") && text.includes("G7502") && text.includes("100%");
  return { ok, docOk: ok };
}

export async function runCwlAuthoredCompleteGate(opts = {}) {
  const doc = runCwlAuthoredCompleteDocGate();
  const loaded = loadFullLanguageCharter();
  if (!loaded.ok) {
    return { ok: false, doc, charter: loaded, generatedAt: new Date().toISOString() };
  }
  const charter = loaded.charter;
  const minRatio = charter.minCwlNativeRatio ?? 1;
  const webir = await loadWebir();
  /** @type {Record<string, { holeFree: number, total: number, ratio: number }>} */
  const modules = {};
  let nativeOk = true;
  for (const rel of charter.cwlAuthoredModules ?? []) {
    const cwlPath = join(scriptRoot, rel, "routes.cwl");
    if (!existsSync(cwlPath)) {
      nativeOk = false;
      continue;
    }
    const snapshot = await exportCwlFileToWebirJson(cwlPath);
    const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
    const p = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
    const ratio = p.total ? p.holeFree / p.total : 0;
    modules[rel] = { holeFree: p.holeFree, total: p.total, ratio };
    if (ratio < minRatio) nativeOk = false;
  }
  const ok = doc.ok === true && nativeOk;
  return {
    kind: CWL_AUTHORED_COMPLETE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    modules,
    minCwlNativeRatio: minRatio,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlAuthoredCompleteSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-authored-complete");
  const t0 = progress.start("CWL-authored complete (G7502)");
  const gate = await runCwlAuthoredCompleteGate(opts);
  progress.end("CWL-authored complete (G7502)", gate.ok === true, t0);
  return { kind: CWL_AUTHORED_COMPLETE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlAuthoredCompleteSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-authored-complete-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
