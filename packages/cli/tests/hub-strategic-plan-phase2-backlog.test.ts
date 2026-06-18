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

test("strategic plan phase2 multi-origin gate (G5800) skip mega batch", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase2MigrationOsMultiOriginGate",
    "{ skipMegaBatch: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.skipMegaBatch).toBe(true);
});

test("strategic plan phase2 delivery dashboard gate (G5810)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase2DeliveryDashboardGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.dashboardOk).toBe(true);
  expect(gate.sectionGateOk).toBe(true);
  expect(gate.artifactCount).toBeGreaterThan(0);
});

test("strategic plan phase2 Migration OS close gate (G5820) skip heavy batches", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase2MigrationOsCloseGate",
    "{ skipMegaBatch: true, skipStandaloneBatch: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.entryOk).toBe(true);
  expect(gate.licenseTierOk).toBe(true);
  expect(gate.multiOriginOk).toBe(true);
  expect(gate.deliveryDashboardOk).toBe(true);
});

test("strategic plan phase2 Migration OS close smoke (G5823) skip heavy batches", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-phase2-migration-os-close-smoke.mjs",
    "runStrategicPlanPhase2MigrationOsCloseSmoke",
    "{ skipMegaBatch: true, skipStandaloneBatch: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.close?.deliveryDashboardOk).toBe(true);
});

test("hub completion phase2 section builder (G5812)", async () => {
  const mod = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-completion-phase2-migration-os.mjs")
  );
  const section = mod.buildHubCompletionPhase2MigrationOsSection({
    deliveryDashboardSmoke: { ok: true },
    migrationOsMegaBatch: { ok: true },
    strategicPlanPhase2Entry: { ok: true },
    strategicPlanPhase2LicenseTier: { ok: true },
  });
  expect(mod.validateHubCompletionPhase2MigrationOsSection(section)).toBe(true);
  expect(section.ok).toBe(true);
  expect(section.deliveryDashboard.script).toContain("delivery-dashboard-smoke");
});
