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

test("strategic plan phase1 PHP emit parity gate (G5760) skip flagships", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase1PhpEmitParityGate",
    "{ skipFlagships: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.microOk).toBe(true);
  expect(gate.skipFlagships).toBe(true);
  expect(gate.routeCount).toBeGreaterThanOrEqual(5);
  expect(gate.honoFastifyCorrectness).toBeGreaterThanOrEqual(1);
});

test("strategic plan phase1 PHP emit parity smoke (G5763) skip flagships", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-phase1-php-emit-parity-smoke.mjs",
    "runStrategicPlanPhase1PhpEmitParitySmoke",
    "{ skipFlagships: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.parity?.microOk).toBe(true);
  expect(report.parity?.nextjsOk).toBe(true);
});
