#!/usr/bin/env node
/**
 * G9972 — One new chartered cross-edge green, or honest refuse documented.
 *
 * This wave documents honest refuse for CWL→nextjs without WPTP, and proves one
 * existing chartered PHP→python edge still green under hole budget (composer strength).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTranslatorComposerCharter } from "./hub-cwl-translator-composer-charter.mjs";
import { runComposerCrossEdge } from "./hub-cwl-translator-composer-cross-edge.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const refusePath = join(
  root,
  "fixtures/hub-universal-translator-slice/chrysalis.ut-wave-b-honest-refuse.v1.json",
);

export const UT_WAVE_B_CROSS_EDGE_KIND = "chrysalis.ut.wave-b-cross-edge-smoke";

export async function runUtWaveBCrossEdgeGate() {
  if (!existsSync(refusePath)) {
    return { kind: UT_WAVE_B_CROSS_EDGE_KIND, schemaVersion: 1, gate: "G9972", ok: false, skip: "missing-honest-refuse" };
  }
  const refuse = JSON.parse(readFileSync(refusePath, "utf8"));
  const refuseOk =
    refuse.kind === "chrysalis.ut.wave-b-honest-refuse" &&
    Array.isArray(refuse.refuses) &&
    refuse.refuses.some((r) => r.reasonCode === "no-wptp-emit-nextjs" && r.notAGreenClaim === true);

  const loaded = loadTranslatorComposerCharter();
  if (!loaded.ok) {
    return { kind: UT_WAVE_B_CROSS_EDGE_KIND, schemaVersion: 1, gate: "G9972", ok: false, charter: loaded, refuseOk };
  }

  const charter = loaded.charter;
  const phpPython = (charter.composerCrossEdges ?? []).find((e) => e.from === "php" && e.to === "python");
  if (!phpPython) {
    return {
      kind: UT_WAVE_B_CROSS_EDGE_KIND,
      schemaVersion: 1,
      gate: "G9972",
      ok: false,
      refuseOk,
      skip: "missing-php-python-charter-edge",
    };
  }

  const outbound = (charter.cwlOutboundTargets ?? []).find((t) => t.id === "python");
  const edgeResult = await runComposerCrossEdge({
    from: "php",
    to: "python",
    emit: outbound?.emit ?? "emit-python-from-hub.mjs",
    emitTarget: outbound?.emitTarget,
    maxHoleCount: charter.maxCrossEdgeHoleCount ?? 0,
    charter,
  });

  const proofOk = edgeResult.ok === true;
  const ok = refuseOk && proofOk;

  return {
    kind: UT_WAVE_B_CROSS_EDGE_KIND,
    schemaVersion: 1,
    gate: "G9972",
    ok,
    refuseOk,
    honestRefusePath: "fixtures/hub-universal-translator-slice/chrysalis.ut-wave-b-honest-refuse.v1.json",
    proofEdge: "php->python",
    proof: edgeResult,
  };
}

async function main() {
  const gate = await runUtWaveBCrossEdgeGate();
  console.log(JSON.stringify(gate, null, 2));
  process.exit(gate.ok ? 0 : 1);
}

if (process.argv[1]?.includes("hub-ut-wave-b-cross-edge-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
