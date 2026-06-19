#!/usr/bin/env node
/** Maintenance-mode governance smoke (G6160). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMaintenanceModeGovernanceGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

/** @param {Record<string, unknown>} [opts] */
export async function runMaintenanceModeGovernanceSmoke(opts = {}) {
  const progress = createSmokeProgress("maintenance-mode-governance");
  const t0 = progress.start("Maintenance mode governance");
  const gate = await runMaintenanceModeGovernanceGate(opts);
  progress.end("Maintenance mode governance", gate.ok === true, t0);
  return {
    kind: "chrysalis.hub.maintenance-mode-governance-smoke",
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runMaintenanceModeGovernanceSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
