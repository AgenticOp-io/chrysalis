import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { test, expect } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function importGate(modulePath: string, exportName: string, args = "{}") {
  const abs = resolve(ROOT, modulePath).replace(/\\/g, "/");
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { pathToFileURL } from 'node:url'; const m = await import(pathToFileURL('${abs}').href); console.log(JSON.stringify(await m.${exportName}(${args})));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 600_000 },
  );
  expect(r.status, r.stderr || r.stdout).toBe(0);
  return JSON.parse(r.stdout.trim());
}

test("strategic plan phase1 Chimera cutover gate (G5770) skip origin batch", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase1ChimeraCutoverGate",
    "{ skipOriginBatch: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.operatorFixtureOk).toBe(true);
  expect(gate.cutoverOk).toBe(true);
  expect(gate.skipOriginBatch).toBe(true);
  expect(gate.phaseCount).toBeGreaterThanOrEqual(3);
  expect(gate.operatorSchemaVersion).toBe(1);
});

test("strategic plan phase1 Chimera cutover smoke (G5773) skip origin batch", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-phase1-chimera-cutover-smoke.mjs",
    "runStrategicPlanPhase1ChimeraCutoverSmoke",
    "{ skipOriginBatch: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.cutover?.cutoverOk).toBe(true);
  expect(report.cutover?.operatorFixtureOk).toBe(true);
});
