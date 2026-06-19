#!/usr/bin/env node
/** WordPress probe oracle live capture smoke (G6218). */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runWordPressVerticalOracleLiveCaptureGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @param {Record<string, unknown>} [opts] */
export async function runWordPressProbeOracleCaptureSmoke(opts = {}) {
  const progress = createSmokeProgress("wordpress-probe-oracle-capture");
  const t0 = progress.start("WordPress probe oracle capture");
  const gate = await runWordPressVerticalOracleLiveCaptureGate(opts);
  if (gate.ok === true && gate.replay?.ok === true) {
    const corpusPath = resolve(scriptRoot, "fixtures/wordpress-probe/chrysalis.oracle-corpus.json");
    const existing = JSON.parse(readFileSync(corpusPath, "utf8"));
    const updated = {
      ...existing,
      routeCount: gate.replay.routeCount ?? existing.routeCount,
      traceCount: gate.replay.traceCount ?? existing.traceCount,
      correctness: gate.replay.correctness ?? 1,
      capturedAt: new Date().toISOString(),
    };
    writeFileSync(corpusPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  }
  progress.end("WordPress probe oracle capture", gate.ok === true, t0);
  return {
    kind: "chrysalis.hub.wordpress-probe-oracle-capture-smoke",
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runWordPressProbeOracleCaptureSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
