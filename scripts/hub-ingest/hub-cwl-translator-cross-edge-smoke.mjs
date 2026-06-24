#!/usr/bin/env node
/** Composer cross-edge smoke (G7604) — A → CWL → B for chartered pairs. */
import { loadTranslatorComposerCharter } from "./hub-cwl-translator-composer-charter.mjs";
import {
  composerCrossEdgeJobs,
  runComposerCrossEdge,
} from "./hub-cwl-translator-composer-cross-edge.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_TRANSLATOR_CROSS_EDGE_SMOKE_KIND = "chrysalis.cwl.translator-cross-edge-smoke";

export async function runCwlTranslatorCrossEdgeGate(_opts = {}) {
  const loaded = loadTranslatorComposerCharter();
  if (!loaded.ok) {
    return { ok: false, charter: loaded, generatedAt: new Date().toISOString() };
  }
  const jobs = composerCrossEdgeJobs(loaded.charter).filter((j) => j.emit);
  /** @type {Record<string, Awaited<ReturnType<typeof runComposerCrossEdge>>>} */
  const edges = {};
  let ok = true;
  for (const job of jobs) {
    const result = await runComposerCrossEdge(job);
    edges[`${job.from}->${job.to}`] = result;
    if (!result.ok) ok = false;
  }
  return {
    kind: CWL_TRANSLATOR_CROSS_EDGE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    edgeCount: jobs.length,
    edges,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlTranslatorCrossEdgeSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-translator-cross-edge");
  const t0 = progress.start("CWL translator cross-edge (G7604)");
  const gate = await runCwlTranslatorCrossEdgeGate(opts);
  progress.end("CWL translator cross-edge (G7604)", gate.ok === true, t0);
  return { kind: CWL_TRANSLATOR_CROSS_EDGE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlTranslatorCrossEdgeSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-translator-cross-edge-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
