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

test("strategic plan month3 project-to-cwl gate (G5720) skip roundtrip", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanMonth3ProjectToCwlGate",
    "{ skipRoundtrip: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.diffOk).toBe(true);
  expect(gate.oracleOk).toBe(true);
  expect(gate.skipRoundtrip).toBe(true);
  expect(gate.changedRoutes).toBeGreaterThanOrEqual(1);
}, 300_000);

test("strategic plan month3 project-to-cwl smoke (G5723) skip roundtrip", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-month3-project-to-cwl-smoke.mjs",
    "runStrategicPlanMonth3ProjectToCwlSmoke",
    "{ skipRoundtrip: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.projectToCwl?.oracleOk).toBe(true);
  expect(report.projectToCwl?.diffOk).toBe(true);
}, 300_000);
