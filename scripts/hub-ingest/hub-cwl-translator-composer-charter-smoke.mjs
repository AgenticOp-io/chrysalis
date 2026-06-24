#!/usr/bin/env node
/** Translator composer charter smoke (G7601). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTranslatorComposerCharter } from "./hub-cwl-translator-composer-charter.mjs";

export const CWL_TRANSLATOR_COMPOSER_CHARTER_SMOKE_KIND = "chrysalis.cwl.translator-composer-charter-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlTranslatorComposerDocGate() {
  const path = join(scriptRoot, "docs/CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-universal-translator-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G7601") &&
    text.includes("composerCrossEdges") &&
    text.includes("D6267") &&
    text.toLowerCase().includes("n×n through cwl");
  return { ok, docOk: ok };
}

export function runCwlTranslatorComposerCharterGate(_opts = {}) {
  const doc = runCwlTranslatorComposerDocGate();
  const loaded = loadTranslatorComposerCharter();
  if (!loaded.ok) {
    return {
      kind: CWL_TRANSLATOR_COMPOSER_CHARTER_SMOKE_KIND,
      schemaVersion: 1,
      ok: false,
      doc,
      charter: loaded,
      generatedAt: new Date().toISOString(),
    };
  }
  const charter = loaded.charter;
  const edgesOk = (charter.composerCrossEdges ?? []).length >= (charter.webOriginIds ?? []).length;
  const outboundOk = (charter.cwlOutboundTargets ?? []).length >= 9;
  const ok = doc.ok === true && edgesOk && outboundOk;
  return {
    kind: CWL_TRANSLATOR_COMPOSER_CHARTER_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    charter: {
      ok: true,
      charterId: charter.charterId,
      edgeCount: charter.composerCrossEdges?.length ?? 0,
      outboundCount: charter.cwlOutboundTargets?.length ?? 0,
    },
    edgesOk,
    outboundOk,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const gate = runCwlTranslatorComposerCharterGate();
  console.log(JSON.stringify(gate, null, 2));
  if (!gate.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-translator-composer-charter-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
