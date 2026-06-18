import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { test, expect } from "vitest";
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

test("strategic plan phase8 product proof entry gate (G6050) all skips", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase8ProductProofEntryGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.phase7CloseOk).toBe(true);
}, 300_000);

test("hub evidence ui proof gate (G6092)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runHubEvidenceUiProofGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.uiOk).toBe(true);
  expect(gate.apiOk).toBe(true);
  expect(gate.reportOk).toBe(true);
});

test("runtime session sql honesty gate (G6102)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runRuntimeSessionSqlHonestyGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.honestyOk).toBe(true);
});

test("strategic plan phase8 oracle proof gate (G6060) all skips", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase8OracleProofGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.expressOk).toBe(true);
  expect(gate.laravelOk).toBe(true);
  expect(gate.phpWedgeOk).toBe(true);
  expect(gate.emitParityOk).toBe(true);
}, 120_000);

test("strategic plan phase8 http emit proof gate (G6070) all skips", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase8HttpEmitProofGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.runtimeParityOk).toBe(true);
  expect(gate.emitMegaOk).toBe(true);
  expect(gate.graduationOk).toBe(true);
  expect(gate.fullstackEntryOk).toBe(true);
}, 300_000);

test("strategic plan phase8 cwl interchange proof gate (G6080) all skips", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase8CwlInterchangeProofGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.projectToCwlOk).toBe(true);
  expect(gate.rfcOk).toBe(true);
}, 120_000);

test("strategic plan phase8 hub operator proof gate (G6090) mega batch skipped", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase8HubOperatorProofGate",
    JSON.stringify({
      skipMigrationOsMegaBatch: true,
      skipMigrationOsStandaloneBatch: true,
    }),
  );
  expect(gate.ok).toBe(true);
  expect(gate.uiOk).toBe(true);
  expect(gate.migrationOsCloseOk).toBe(true);
  expect(gate.evidenceMvpOk).toBe(true);
}, 180_000);

test("strategic plan phase8 cutover proof gate (G6100) origin batch skipped", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase8CutoverProofGate",
    JSON.stringify({ skipChimeraOriginBatch: true }),
  );
  expect(gate.ok).toBe(true);
  expect(gate.honestyOk).toBe(true);
  expect(gate.chimeraOk).toBe(true);
  expect(gate.sessionStubOk).toBe(true);
  expect(gate.productionSearchOk).toBe(true);
}, 120_000);

test("strategic plan phase8 product proof close gate (G6110) all skips", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase8ProductProofCloseGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.entryOk).toBe(true);
  expect(gate.oracleOk).toBe(true);
  expect(gate.httpEmitOk).toBe(true);
  expect(gate.cwlOk).toBe(true);
  expect(gate.hubOk).toBe(true);
  expect(gate.cutoverOk).toBe(true);
}, 600_000);

test("strategic plan skips strict resolver", () => {
  const abs = resolve(ROOT, "scripts/hub-ingest/strategic-plan-skips.mjs").replace(/\\/g, "/");
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { pathToFileURL } from 'node:url'; const m = await import(pathToFileURL('${abs}').href); console.log(JSON.stringify(m.resolveStrategicPlanSkips({ strict: true })));`,
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  expect(r.status).toBe(0);
  const skips = JSON.parse(r.stdout.trim());
  expect(skips.strict).toBe(true);
  expect(skips.skipOracleVerify).toBe(false);
  expect(skips.skipEmitHttp).toBe(false);
  expect(skips.skipGoldVerify).toBe(false);
});
