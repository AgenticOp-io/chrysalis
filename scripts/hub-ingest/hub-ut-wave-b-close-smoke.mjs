#!/usr/bin/env node
/**
 * G9975 — UT Wave B composite (composer strength).
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runUtWaveBG7690Gate } from "./hub-ut-wave-b-g7690-smoke.mjs";
import { runUtWaveBCharterAuditGate } from "./hub-ut-wave-b-charter-audit-smoke.mjs";
import { runUtWaveBCrossEdgeGate } from "./hub-ut-wave-b-cross-edge-smoke.mjs";
import { runUtWaveBRoundtripWorkItemsGate } from "./hub-ut-wave-b-roundtrip-work-items-smoke.mjs";
import { runUtWaveBOutboundGate } from "./hub-ut-wave-b-outbound-smoke.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const UT_WAVE_B_CLOSE_KIND = "chrysalis.ut.wave-b-close-smoke";

export async function runUtWaveBCloseGate(opts = {}) {
  const g9970 = await runUtWaveBG7690Gate(opts);
  const g9971 = runUtWaveBCharterAuditGate();
  const g9972 = await runUtWaveBCrossEdgeGate();
  const g9973 = await runUtWaveBRoundtripWorkItemsGate(opts);
  const g9974 = await runUtWaveBOutboundGate(opts);

  const ok =
    g9970.ok === true &&
    g9971.ok === true &&
    g9972.ok === true &&
    g9973.ok === true &&
    g9974.ok === true;

  return {
    kind: UT_WAVE_B_CLOSE_KIND,
    schemaVersion: 1,
    gate: "G9975",
    ok,
    g9970,
    g9971,
    g9972,
    g9973,
    g9974,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const gate = await runUtWaveBCloseGate();
  console.log(JSON.stringify(gate, null, 2));
  process.exit(gate.ok ? 0 : 1);
}

if (process.argv[1]?.includes("hub-ut-wave-b-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

/** CLI helper used by package.json alias without dynamic import of gates. */
export function runUtWaveBCloseSmokeCli() {
  const r = spawnSync(process.execPath, [join(root, "scripts/hub-ingest/hub-ut-wave-b-close-smoke.mjs")], {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}
