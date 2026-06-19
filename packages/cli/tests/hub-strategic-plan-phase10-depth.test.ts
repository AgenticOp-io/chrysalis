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
