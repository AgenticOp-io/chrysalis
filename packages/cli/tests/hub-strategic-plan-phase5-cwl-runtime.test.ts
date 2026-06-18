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

test("strategic plan phase5 CWL runtime entry gate (G5930) skip emit http", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase5CwlRuntimeEntryGate",
    "{ skipEmitHttp: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.runtimeParityOk).toBe(true);
  expect(gate.authoringBootstrapOk).toBe(true);
  expect(gate.skipEmitHttp).toBe(true);
  expect(gate.parityOk).toBe(true);
}, 300_000);

test("strategic plan phase5 production search gate (G5940)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase5ProductionSearchGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.searchOk).toBe(true);
});

test("strategic plan phase5 session stub gate (G5950)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase5SessionStubGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.sessionOk).toBe(true);
});

test("strategic plan phase5 CWL runtime close gate (G5960) skip emit http", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase5CwlRuntimeCloseGate",
    "{ skipEmitHttp: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.entryOk).toBe(true);
  expect(gate.productionSearchOk).toBe(true);
  expect(gate.sessionStubOk).toBe(true);
}, 300_000);

test("strategic plan phase5 CWL runtime close smoke (G5963) skip emit http", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-phase5-cwl-runtime-close-smoke.mjs",
    "runStrategicPlanPhase5CwlRuntimeCloseSmoke",
    "{ skipEmitHttp: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.close?.productionSearchOk).toBe(true);
}, 300_000);
