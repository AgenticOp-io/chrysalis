#!/usr/bin/env node
/**
 * Agent-era substrate composite (G10116 / D6541).
 * Hole Type System + CWL-Above-Code + Dispose Plane entry.
 */
import { runHoleTypeSystemSmoke } from "./hub-hole-type-system-smoke.mjs";
import { runCwlAboveCodeSmoke } from "./hub-cwl-above-code-smoke.mjs";
import { runDisposePlaneSmoke } from "./hub-dispose-plane-smoke.mjs";

export const AGENT_ERA_SUBSTRATE_SMOKE_KIND = "chrysalis.hub.agent-era-substrate-smoke";
export const AGENT_ERA_SUBSTRATE_SMOKE_SCHEMA_VERSION = 1;

export async function runAgentEraSubstrateSmoke(opts = {}) {
  const holeTypes = runHoleTypeSystemSmoke();
  const cwlAbove = await runCwlAboveCodeSmoke(opts);
  const dispose = await runDisposePlaneSmoke();

  const parts = [
    { id: "hole-type-system", ok: holeTypes.ok === true, report: holeTypes },
    { id: "cwl-above-code", ok: cwlAbove.ok === true, report: cwlAbove },
    { id: "dispose-plane", ok: dispose.ok === true, report: dispose },
  ];
  const ok = parts.every((p) => p.ok);

  return {
    kind: AGENT_ERA_SUBSTRATE_SMOKE_KIND,
    schemaVersion: AGENT_ERA_SUBSTRATE_SMOKE_SCHEMA_VERSION,
    ok,
    gate: "G10116",
    decision: "D6541",
    parts: parts.map((p) => ({ id: p.id, ok: p.ok })),
    failed: parts.filter((p) => !p.ok).map((p) => p.id),
    holeTypes,
    cwlAbove,
    dispose,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runAgentEraSubstrateSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1] && /hub-agent-era-substrate-smoke\.mjs$/.test(process.argv[1].replace(/\\/g, "/"))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
