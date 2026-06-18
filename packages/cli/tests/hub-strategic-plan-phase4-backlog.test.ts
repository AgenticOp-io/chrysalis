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

test("strategic plan phase4 live oracle verify gate (G5890) skip oracle verify", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase4LiveOracleVerifyGate",
    "{ skipOracleVerify: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.skipOracleVerify).toBe(true);
});

test("strategic plan phase4 express depth batch gate (G5900)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase4ExpressDepthBatchGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.depthOk).toBe(true);
  expect(gate.routeCount).toBe(20);
  expect(gate.holeFree).toBe(20);
});

test("strategic plan phase4 express delivery batch gate (G5910)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase4ExpressDeliveryBatchGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.deliveryOk).toBe(true);
  expect(gate.phaseCount).toBeGreaterThanOrEqual(3);
});

test("strategic plan phase4 second oracle origin close gate (G5920) skip oracle verify", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase4SecondOracleOriginCloseGate",
    "{ skipOracleVerify: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.entryOk).toBe(true);
  expect(gate.liveVerifyOk).toBe(true);
  expect(gate.depthOk).toBe(true);
  expect(gate.deliveryOk).toBe(true);
}, 300_000);

test("strategic plan phase4 second oracle origin close smoke (G5923) skip oracle verify", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-phase4-second-oracle-origin-close-smoke.mjs",
    "runStrategicPlanPhase4SecondOracleOriginCloseSmoke",
    "{ skipOracleVerify: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.close?.depthOk).toBe(true);
  expect(report.close?.deliveryOk).toBe(true);
}, 300_000);
