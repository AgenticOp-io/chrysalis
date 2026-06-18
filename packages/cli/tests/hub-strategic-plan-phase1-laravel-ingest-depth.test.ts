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
    { cwd: ROOT, encoding: "utf8", timeout: 600_000,
    },
  );
  expect(r.status, r.stderr || r.stdout).toBe(0);
  return JSON.parse(r.stdout.trim());
}

test("strategic plan phase1 Laravel ingest depth gate (G5750) skip live", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase1LaravelIngestDepthGate",
    "{ skipLive: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.closureOk).toBe(true);
  expect(gate.resolvedOk).toBe(true);
  expect(gate.skipLive).toBe(true);
  expect(gate.backlogCount).toBeGreaterThan(0);
  expect(gate.resolvedBacklogCount).toBe(0);
});

test("strategic plan phase1 Laravel ingest depth smoke (G5753) skip live", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-phase1-laravel-ingest-depth-smoke.mjs",
    "runStrategicPlanPhase1LaravelIngestDepthSmoke",
    "{ skipLive: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.depth?.closureOk).toBe(true);
  expect(report.depth?.resolvedOk).toBe(true);
});
