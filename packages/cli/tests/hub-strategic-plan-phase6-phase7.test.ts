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

test("strategic plan phase6 runtime scale entry gate (G5970) skip emit http", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase6RuntimeScaleEntryGate",
    "{ skipEmitHttp: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.phase5CloseOk).toBe(true);
  expect(gate.graduationOk).toBe(true);
}, 300_000);

test("strategic plan phase6 emit verify mega gate (G5980) skip emit http", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase6EmitVerifyMegaGate",
    "{ skipEmitHttp: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.skipEmitHttp).toBe(true);
});

test("strategic plan phase6 production graduation gate (G5990) skip emit http", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase6ProductionGraduationGate",
    "{ skipEmitHttp: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.searchOk).toBe(true);
  expect(gate.sessionOk).toBe(true);
  expect(gate.diagnoseOk).toBe(true);
});

test("strategic plan phase6 runtime scale close gate (G6000) skip emit http", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase6RuntimeScaleCloseGate",
    "{ skipEmitHttp: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.entryOk).toBe(true);
  expect(gate.emitMegaOk).toBe(true);
  expect(gate.graduationOk).toBe(true);
}, 300_000);

test("strategic plan phase7 fullstack entry gate (G6010) skip gold verify", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase7FullstackEntryGate",
    "{ skipGoldVerify: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.scopeOk).toBe(true);
  expect(gate.pilotOk).toBe(true);
  expect(gate.holeCount).toBe(0);
}, 120_000);

test("strategic plan phase7 hole budget gate (G6020)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase7HoleBudgetGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.budgetOk).toBe(true);
  expect(gate.interpolationOk).toBe(true);
});

test("strategic plan phase7 fullstack close gate (G6040) skip gold verify", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase7FullstackCloseGate",
    "{ skipGoldVerify: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.entryOk).toBe(true);
  expect(gate.holeBudgetOk).toBe(true);
}, 120_000);

test("strategic plan phase7 fullstack close smoke (G6043) skip gold verify", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-phase7-fullstack-close-smoke.mjs",
    "runStrategicPlanPhase7FullstackCloseSmoke",
    "{ skipGoldVerify: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.close?.holeBudgetOk).toBe(true);
}, 120_000);
