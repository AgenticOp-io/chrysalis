#!/usr/bin/env node
/** Production SQL verify parity smoke (G6203): tiny-blog replay verify. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProductionSqlVerifyParityGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

/** @param {Record<string, unknown>} [opts] */
export async function runProductionSqlVerifyParitySmoke(opts = {}) {
  const progress = createSmokeProgress("production-sql-verify-parity");
  const t0 = progress.start("Production SQL verify parity");
  const gate = await runProductionSqlVerifyParityGate(opts);
  progress.end("Production SQL verify parity", gate.ok === true, t0);
  return {
    kind: "chrysalis.hub.production-sql-verify-parity-smoke",
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runProductionSqlVerifyParitySmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
