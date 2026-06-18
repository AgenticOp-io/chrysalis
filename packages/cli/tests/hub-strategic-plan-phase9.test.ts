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
  skipArtifact: true,
});

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

function importSyncGate(modulePath: string, exportName: string, args = "{}") {
  const abs = resolve(ROOT, modulePath).replace(/\\/g, "/");
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { pathToFileURL } from 'node:url'; const m = await import(pathToFileURL('${abs}').href); console.log(JSON.stringify(m.${exportName}(${args})));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 60_000 },
  );
  expect(r.status, r.stderr || r.stdout).toBe(0);
  return JSON.parse(r.stdout.trim());
}

describe.sequential("hub strategic plan phase9 operational hardening", () => {
test("operational hardening phase9 doc gate (G6121)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runOperationalHardeningPhase9DocGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
});

test("hub completion phase8 product proof section gate (G6131)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runHubCompletionPhase8ProductProofSectionGate",
    JSON.stringify({ skipArtifact: true }),
  );
  expect(gate.ok).toBe(true);
});

test("north star metrics honesty gate (G6142)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runNorthStarMetricsHonestyGate",
  );
  expect(gate.ok).toBe(true);
});

test("capability matrix phase8 proof gate (G6141)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runCapabilityMatrixPhase8ProofGate",
    "{}",
  );
  expect(gate.ok).toBe(true);
});

test("strategic plan phase9 hub completion gate (G6130) skip artifact", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase9HubCompletionGate",
    JSON.stringify({ skipArtifact: true }),
  );
  expect(gate.ok).toBe(true);
  expect(gate.sectionOk).toBe(true);
});

test("strategic plan phase9 capability gate (G6140)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase9CapabilityGate",
    "{}",
  );
  expect(gate.ok).toBe(true);
  expect(gate.matrixOk).toBe(true);
});

test("strategic plan phase9 operational close gate (G6150) all skips", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase9OperationalCloseGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.entryOk).toBe(true);
  expect(gate.hubCompletionOk).toBe(true);
  expect(gate.capabilityOk).toBe(true);
}, 180_000);
});
