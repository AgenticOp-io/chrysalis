import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { test, expect } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function importGate(modulePath: string, exportName: string) {
  const abs = resolve(ROOT, modulePath).replace(/\\/g, "/");
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { pathToFileURL } from 'node:url'; const m = await import(pathToFileURL('${abs}').href); console.log(JSON.stringify(await m.${exportName}()));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 120_000 },
  );
  expect(r.status, r.stderr || r.stdout).toBe(0);
  return JSON.parse(r.stdout.trim());
}

test("strategic plan month2 fullstack scope gate (G5700)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanMonth2FullstackScopeGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.scopeOk).toBe(true);
  expect(gate.catalogOk).toBe(true);
  expect(gate.budgetOk).toBe(true);
  expect(gate.diagnoseOk).toBe(true);
});

test("strategic plan month2 fullstack scope smoke (G5703)", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-month2-fullstack-scope-smoke.mjs",
    "runStrategicPlanMonth2FullstackScopeSmoke",
  );
  expect(report.ok).toBe(true);
  expect(report.scope?.docOk).toBe(true);
  expect(report.scope?.layoutOk).toBe(true);
});
