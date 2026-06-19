import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { test, expect } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function importSyncGate(modulePath: string, exportName: string) {
  const abs = resolve(ROOT, modulePath).replace(/\\/g, "/");
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { pathToFileURL } from 'node:url'; const m = await import(pathToFileURL('${abs}').href); console.log(JSON.stringify(m.${exportName}()));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 60_000 },
  );
  expect(r.status, r.stderr || r.stdout).toBe(0);
  return JSON.parse(r.stdout.trim());
}

test("paused and maintenance doc gate (G6161)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runPausedAndMaintenanceDocGate",
  );
  expect(gate.ok).toBe(true);
});

test("strategic plan maintenance default queue gate (G6162)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanMaintenanceDefaultQueueGate",
  );
  expect(gate.ok).toBe(true);
});

test("roadmap maintenance default queue gate (G6163)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runRoadmapMaintenanceDefaultQueueGate",
  );
  expect(gate.ok).toBe(true);
});

test("maintenance mode governance gate routes to phase10 (G6160)", () => {
  const abs = resolve(ROOT, "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs").replace(/\\/g, "/");
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { pathToFileURL } from 'node:url'; const m = await import(pathToFileURL('${abs}').href); console.log(JSON.stringify(await m.runMaintenanceModeGovernanceGate({})));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 120_000 },
  );
  expect(r.status, r.stderr || r.stdout).toBe(0);
  const gate = JSON.parse(r.stdout.trim());
  expect(gate.ok).toBe(true);
  expect(gate.mode).toBe("phase10");
  expect(gate.phaseCActive).toBe(true);
});
