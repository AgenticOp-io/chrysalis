import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { describe, test, expect } from "vitest";
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

describe.sequential("hub strategic plan phase10 depth slices", () => {
  test("wordpress observe manifest gate (G6213)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWordPressVerticalObserveManifestGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("wordpress admin route ingest gate (G6214)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWordPressVerticalAdminRouteIngestGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("wordpress oracle live capture gate (G6218)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWordPressVerticalOracleLiveCaptureGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.replayOk).toBe(true);
  }, 120_000);

  test("wordpress verify replay gate (G6219)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWordPressVerticalVerifyReplayGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.correctness).toBe(1);
  }, 120_000);

  test("wordpress wp effect lowering gate (G6225)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWordPressVerticalWpEffectLoweringGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.declaredCount).toBeGreaterThanOrEqual(9);
  });

  test("wordpress core stub oracle gate (G6224)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWordPressVerticalCoreStubOracleGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.correctness).toBe(1);
  }, 120_000);

  test("runtime-cwl session resolve probe gate (G6226)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runRuntimeCwlSessionResolveProbeGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("wordpress wp call verify replay gate (G6227)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWordPressVerticalWpCallVerifyReplayGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.correctness).toBe(1);
  }, 120_000);

  test("wordpress wp call fastify parity gate (G6228)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWordPressVerticalWpCallFastifyParityGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.correctness).toBe(1);
  }, 120_000);

  test("runtime-cwl session resolve strict gate (G6211+)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runRuntimeCwlSessionResolveStrictGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("runtime-cwl session bridge gate (G6209)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runRuntimeCwlProductionSessionBridgeGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("runtime-cwl resolveSession bridge gate (G6210+)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runRuntimeCwlResolveSessionBridgeGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("wordpress oracle capture gate (G6217)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWordPressVerticalOracleCaptureGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.captureRouteCount).toBe(2);
  });

  test("matrix customer route oracle pair gate (G6223)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runMatrixCustomerRouteOraclePairGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.correctness).toBe(1);
  }, 120_000);

  test("runtime-cwl session honesty gate (G6204)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runRuntimeCwlProductionSessionHonestyGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("mysqli probe ingest sql gate (G6206)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runMysqliProbeIngestSqlGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("matrix customer route registry gate (G6221)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runMatrixCustomerRouteRegistryGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.customerRouteCount).toBe(2);
  });

  test("multi-language express oracle pair gate (G6231)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runMultiLanguageExpressOraclePairGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("phase10 depth gate (G6241)", async () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runStrategicPlanPhase10DepthGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.wordpressOk).toBe(true);
    expect(gate.runtimeOk).toBe(true);
    expect(gate.matrixOk).toBe(true);
    expect(gate.expressOk).toBe(true);
  }, 600_000);
});
