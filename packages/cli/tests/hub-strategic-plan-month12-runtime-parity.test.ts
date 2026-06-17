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

test("strategic plan month12 runtime parity gate (G5690) skip emit HTTP", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanMonth12RuntimeParityGate",
    "{ skipEmitHttp: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.planOk).toBe(true);
  expect(gate.parityOk).toBe(true);
  expect(gate.skipEmitHttp).toBe(true);
  expect(gate.goldParityOk).toBe(true);
  expect(gate.productionOk).toBe(true);
}, 300_000);

test("strategic plan month12 runtime parity smoke (G5693) skip emit HTTP", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-month12-runtime-parity-smoke.mjs",
    "runStrategicPlanMonth12RuntimeParitySmoke",
    "{ skipEmitHttp: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.parity?.parityOk).toBe(true);
  expect(report.parity?.planOk).toBe(true);
}, 300_000);
