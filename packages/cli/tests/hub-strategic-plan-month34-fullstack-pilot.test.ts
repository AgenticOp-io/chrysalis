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
    { cwd: ROOT, encoding: "utf8", timeout: 600_000,
    },
  );
  expect(r.status, r.stderr || r.stdout).toBe(0);
  return JSON.parse(r.stdout.trim());
}

test("strategic plan month34 fullstack pilot gate (G5730) skip gold verify", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanMonth34FullstackPilotGate",
    "{ skipGoldVerify: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.budgetOk).toBe(true);
  expect(gate.interpolationOk).toBe(true);
  expect(gate.pilotOk).toBe(true);
  expect(gate.skipGoldVerify).toBe(true);
  expect(gate.holeCount).toBe(0);
}, 120_000);

test("strategic plan month34 fullstack pilot smoke (G5733) skip gold verify", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-month34-fullstack-pilot-smoke.mjs",
    "runStrategicPlanMonth34FullstackPilotSmoke",
    "{ skipGoldVerify: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.pilot?.budgetCheckOk).toBe(true);
  expect(report.pilot?.holeCount).toBe(0);
}, 120_000);
