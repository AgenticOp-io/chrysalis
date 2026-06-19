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

function importGate(modulePath: string, exportName: string, opts: { apply?: boolean } = {}) {
  const abs = resolve(ROOT, modulePath).replace(/\\/g, "/");
  const optsArg = JSON.stringify(opts);
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { pathToFileURL } from 'node:url'; const m = await import(pathToFileURL('${abs}').href); console.log(JSON.stringify(await m.${exportName}(${optsArg})));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 600_000 },
  );
  expect(r.status, r.stderr || r.stdout).toBe(0);
  return JSON.parse(r.stdout.trim());
}

const gateOpts = { apply: false as const };

describe.sequential("hub strategic plan phase12 wisp cwl", () => {
  test("wisp program doc gate (G6300)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWispCwlProgramDocGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("wisp api paths manifest gate (G6301)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWispCwlApiPathsManifestGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("wisp phase12 phase0 entry gate (G6304)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runWispCwlPhase12Phase0EntryGate",
      gateOpts,
    );
    expect(gate.ok).toBe(true);
  });

  test("phase12 phase0 close gate (G6310)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase12-phase0-close-smoke.mjs",
      "runWispCwlPhase12Phase0CloseGate",
      gateOpts,
    );
    expect(gate.ok).toBe(true);
  });

  test("wisp phase13 m0 gate (G6350)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase13-m0-smoke.mjs",
      "runWispCwlPhase13M0Gate",
      gateOpts,
    );
    expect(gate.ok).toBe(true);
    expect(gate.chimera.ok).toBe(true);
  });

  test("wisp phase13 m1 gate (G6360)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase13-m1-smoke.mjs",
      "runWispCwlPhase13M1Gate",
      gateOpts,
    );
    expect(gate.ok).toBe(true);
    expect(gate.load.ok).toBe(true);
  });

  test("wisp phase13 m2 gate (G6370)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase13-m2-smoke.mjs",
      "runWispCwlPhase13M2Gate",
      gateOpts,
    );
    expect(gate.ok).toBe(true);
    expect(gate.load.ok).toBe(true);
    expect(gate.api.ok).toBe(true);
  });

  test("wisp phase13 m3 gate (G6380)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase13-m3-smoke.mjs",
      "runWispCwlPhase13M3Gate",
      gateOpts,
    );
    expect(gate.ok).toBe(true);
    expect(gate.load.ok).toBe(true);
    expect(gate.manifest.arcgisHole).toBe(true);
  });

  test("wisp phase13 m4 gate (G6390)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase13-m4-smoke.mjs",
      "runWispCwlPhase13M4Gate",
      gateOpts,
    );
    expect(gate.ok).toBe(true);
    expect(gate.load.ok).toBe(true);
  });

  test("wisp phase13 m5 gate (G6400)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase13-m5-smoke.mjs",
      "runWispCwlPhase13M5Gate",
      gateOpts,
    );
    expect(gate.ok).toBe(true);
    expect(gate.coverage.ok).toBe(true);
    expect(gate.preview.uiHoleCount).toBe(1);
  });

  test("wisp phase13 m6 effects gate (G6420)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase13-m6-smoke.mjs",
      "runWispCwlPhase13M6Gate",
      gateOpts,
    );
    expect(gate.ok).toBe(true);
    expect(gate.routes.protectedCount).toBeGreaterThanOrEqual(10);
  });

  test("phase13 close gate (G6410)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase13-close-smoke.mjs",
      "runWispCwlPhase13CloseGate",
      gateOpts,
    );
    expect(gate.ok).toBe(true);
    expect(gate.m5.ok).toBe(true);
    expect(gate.m6.ok).toBe(true);
  });

  test("phase14 client redirect gate (G6510)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase14-client-redirect-smoke.mjs",
      "runWispCwlPhase14ClientRedirectGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.routes.deadEnds).toEqual([]);
  });

  test("phase14 operator close gate (G6520)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase14-operator-close-smoke.mjs",
      "runWispCwlPhase14OperatorCloseGate",
      gateOpts,
    );
    expect(gate.ok).toBe(true);
    expect(gate.bundleSync.ok).toBe(true);
    expect(gate.phase13.ok).toBe(true);
  });

  test("phase14 hss proxy gate (G6530)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase14-hss-proxy-smoke.mjs",
      "runWispCwlPhase14HssProxyGate",
      { skipLive: true },
    );
    expect(gate.ok).toBe(true);
    expect(gate.contract.ok).toBe(true);
    expect(gate.chimera.ok).toBe(true);
  });

  test("phase14 demo manifest gate (G6540)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase14-demo-manifest-smoke.mjs",
      "runWispCwlPhase14DemoManifestGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.manifest.probeCount).toBeGreaterThanOrEqual(5);
  });

  test("phase14 remote demo gate (G6600)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase14-remote-demo-smoke.mjs",
      "runWispCwlPhase14RemoteDemoGate",
      { skipLive: true },
    );
    expect(gate.ok).toBe(true);
    expect(gate.doc.ok).toBe(true);
    expect(gate.verify.skip).toBe("skip-live-remote-demo");
  });

  test("phase14 pipeline remote verify gate (G6650)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase14-pipeline-remote-verify-smoke.mjs",
      "runWispCwlPhase14PipelineRemoteVerifyGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.contract.ok).toBe(true);
  });

  test("phase14 operator verify gate (G6680)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase14-operator-verify-smoke.mjs",
      "runWispCwlPhase14OperatorVerifyGate",
      { skipLive: true },
    );
    expect(gate.ok).toBe(true);
    expect(gate.doc.ok).toBe(true);
    expect(gate.verify.skipLive).toBe(true);
  });

  test("phase14 live backend gate (G6700)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase14-live-backend-smoke.mjs",
      "runWispCwlPhase14LiveBackendGate",
      { skipLive: true },
    );
    expect(gate.ok).toBe(true);
    expect(gate.probe.skip).toBe("skip-live-backend-probe");
  });

  test("phase14 close gate (G6590)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-wisp-cwl-phase14-close-smoke.mjs",
      "runWispCwlPhase14CloseGate",
      { ...gateOpts, skipPipeline: true },
    );
    expect(gate.ok).toBe(true);
    expect(gate.hssProxy.ok).toBe(true);
    expect(gate.demoManifest.ok).toBe(true);
    expect(gate.remoteDemo.ok).toBe(true);
    expect(gate.pipelineRemoteVerify.ok).toBe(true);
    expect(gate.operatorVerify.ok).toBe(true);
    expect(gate.liveBackend.ok).toBe(true);
  });

  test("phase13 closed governance gate (G6413)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runPhase13ClosedGovernanceGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.mode).toBe("phase14-operator");
    expect(gate.phase13CloseOk).toBe(true);
    expect(gate.phase14DocOk).toBe(true);
    expect(gate.m6Ok).toBe(true);
  });

  test("maintenance mode governance routes to phase14-operator (G6160)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runMaintenanceModeGovernanceGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.mode).toBe("phase14-operator");
    expect(gate.clientRedirectOk).toBe(true);
    expect(gate.hssProxyOk).toBe(true);
    expect(gate.demoManifestOk).toBe(true);
    expect(gate.bundleSyncOk).toBe(true);
    expect(gate.phase13CloseOk).toBe(true);
  });

  test("cwl surface taxonomy gate (G6340)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-surface-taxonomy-smoke.mjs",
      "runCwlSurfaceTaxonomyDocGate",
    );
    expect(gate.ok).toBe(true);
  });

  test("phase13 surface queue gate (G6341)", () => {
    const gate = importSyncGate(
      "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
      "runStrategicPlanPhase13SurfaceQueueGate",
    );
    expect(gate.ok).toBe(true);
  });
});
