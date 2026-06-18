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

test("strategic plan phase2 Migration OS entry gate (G5780) skip standalone batch", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase2MigrationOsEntryGate",
    "{ skipStandaloneBatch: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.siteIntelligenceOk).toBe(true);
  expect(gate.migrationOsOk).toBe(true);
  expect(gate.evidenceOk).toBe(true);
  expect(gate.pathAdviceOk).toBe(true);
  expect(gate.skipStandaloneBatch).toBe(true);
  expect(gate.templateCount).toBeGreaterThanOrEqual(3);
  expect(gate.programId).toBe("api-slice");
});

test("strategic plan phase2 Migration OS entry smoke (G5783) skip standalone batch", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-phase2-migration-os-entry-smoke.mjs",
    "runStrategicPlanPhase2MigrationOsEntrySmoke",
    "{ skipStandaloneBatch: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.entry?.migrationOsOk).toBe(true);
  expect(report.entry?.evidenceOk).toBe(true);
});
