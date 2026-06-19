#!/usr/bin/env node
/** WordPress customer sample oracle smoke (G6280). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWordPressCustomerSampleOracleGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

/** @param {Record<string, unknown>} [opts] */
export async function runWordPressCustomerSampleOracleSmoke(opts = {}) {
  const progress = createSmokeProgress("wordpress-customer-sample-oracle");
  const t0 = progress.start("WordPress customer sample oracle");
  const gate = await runWordPressCustomerSampleOracleGate(opts);
  progress.end("WordPress customer sample oracle", gate.ok === true, t0);
  return {
    kind: "chrysalis.hub.wordpress-customer-sample-oracle-smoke",
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runWordPressCustomerSampleOracleSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
