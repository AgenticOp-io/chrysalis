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
    { cwd: ROOT, encoding: "utf8", timeout: 300_000 },
  );
  expect(r.status, r.stderr || r.stdout).toBe(0);
  return JSON.parse(r.stdout.trim());
}

test("strategic plan month1 bootstrap hardening gate (G5680)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runCwlAuthoringBootstrapHardeningGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.templatesOk).toBe(true);
  expect(gate.previewOk).toBe(true);
  expect(gate.diagnoseOk).toBe(true);
}, 300_000);

test("strategic plan month1 hardening smoke (G5683)", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-month1-hardening-smoke.mjs",
    "runStrategicPlanMonth1HardeningSmoke",
  );
  expect(report.ok).toBe(true);
  expect(report.bootstrap?.ok).toBe(true);
  expect(report.parityPlan?.docOk).toBe(true);
  expect(report.parityPlan?.goldParityOk).toBe(true);
}, 300_000);
