#!/usr/bin/env node
/** WordPress probe ingest smoke (G6212). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWordPressVerticalProbeIngestGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

/** @param {Record<string, unknown>} [opts] */
export async function runWordPressProbeIngestSmoke(_opts = {}) {
  const progress = createSmokeProgress("wordpress-probe-ingest");
  const t0 = progress.start("WordPress probe ingest");
  const gate = await runWordPressVerticalProbeIngestGate();
  progress.end("WordPress probe ingest", gate.ok === true, t0);
  return {
    kind: "chrysalis.hub.wordpress-probe-ingest-smoke",
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runWordPressProbeIngestSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
