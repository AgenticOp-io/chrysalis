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

test("strategic plan month23 express oracle gate (G5710) skip oracle verify", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanMonth23ExpressOracleGate",
    "{ skipOracleVerify: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.expressDepthOk).toBe(true);
  expect(gate.liftOk).toBe(true);
  expect(gate.skipOracleVerify).toBe(true);
}, 300_000);

test("strategic plan month23 express oracle smoke (G5713) skip oracle verify", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-month23-express-oracle-smoke.mjs",
    "runStrategicPlanMonth23ExpressOracleSmoke",
    "{ skipOracleVerify: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.express?.docOk).toBe(true);
  expect(report.express?.expressDepthOk).toBe(true);
}, 300_000);
