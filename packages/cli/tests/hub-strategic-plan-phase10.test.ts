import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { describe, test, expect } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const ALL_SKIPS = JSON.stringify({
  strict: false,
  skipOracleVerify: true,
  skipEmitHttp: true,
  skipGoldVerify: true,
  skipProjectCwlRoundtrip: true,
  skipCwlRfcRoundtrip: true,
  skipLaravelLiveGaps: true,
  skipMigrationOsMegaBatch: true,
  skipMigrationOsStandaloneBatch: true,
  skipPhpWedgeFlagships: true,
  skipEmitParityFlagships: true,
  skipChimeraOriginBatch: true,
});

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

function importGate(modulePath: string, exportName: string, args = ALL_SKIPS) {
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

describe.sequential("hub strategic plan phase10 production parity", () => {
  test("production parity phase10 doc gate (G6201)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runProductionParityPhase10DocGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("wordpress vertical phase10 entry gate (G6210)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWordPressVerticalPhase10EntryGate",
      "{}",
    );
    expect(gate.ok).toBe(true);
  });

  test("matrix expansion phase10 gate (G6220)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runMatrixExpansionPhase10Gate",
      "{}",
    );
    expect(gate.ok).toBe(true);
  });

  test("runtime session sql honesty gate phase C active (G6102)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runRuntimeSessionSqlHonestyGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.phase10Active).toBe(true);
  });

  test("phase10 production parity close gate (G6250) all skips", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runStrategicPlanPhase10ProductionParityCloseGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.wordpressOk).toBe(true);
    expect(gate.matrixOk).toBe(true);
  }, 300_000);
});
