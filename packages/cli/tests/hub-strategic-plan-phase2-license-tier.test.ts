import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { test, expect } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function importGate(modulePath: string, exportName: string, args = "") {
  const abs = resolve(ROOT, modulePath).replace(/\\/g, "/");
  const call = args ? `await m.${exportName}(${args})` : `await m.${exportName}()`;
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { pathToFileURL } from 'node:url'; const m = await import(pathToFileURL('${abs}').href); console.log(JSON.stringify(${call}));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 120_000 },
  );
  expect(r.status, r.stderr || r.stdout).toBe(0);
  return JSON.parse(r.stdout.trim());
}

test("strategic plan phase2 license tier gate (G5790)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase2LicenseTierGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.tierSmokeOk).toBe(true);
  expect(gate.featureCount).toBeGreaterThanOrEqual(7);
  expect(gate.tiersOk).toBe(true);
  expect(gate.ossDefaultOk).toBe(true);
});

test("strategic plan phase2 license tier smoke (G5793)", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-phase2-license-tier-smoke.mjs",
    "runStrategicPlanPhase2LicenseTierSmoke",
  );
  expect(report.ok).toBe(true);
  expect(report.license?.tierSmokeOk).toBe(true);
});
