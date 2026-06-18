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

test("strategic plan phase3 CWL interchange entry gate (G5830) skip roundtrip", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-fullstack-gates.mjs",
    "runStrategicPlanPhase3CwlInterchangeEntryGate",
    "{ skipRoundtrip: true }",
  );
  expect(gate.ok).toBe(true);
  expect(gate.docOk).toBe(true);
  expect(gate.projectToCwlOk).toBe(true);
  expect(gate.authoringBootstrapOk).toBe(true);
  expect(gate.skipRoundtrip).toBe(true);
  expect(gate.diffOk).toBe(true);
  expect(gate.templatesOk).toBe(true);
});

test("strategic plan phase3 CWL interchange entry smoke (G5833) skip roundtrip", () => {
  const report = importGate(
    "scripts/hub-ingest/hub-strategic-plan-phase3-cwl-interchange-entry-smoke.mjs",
    "runStrategicPlanPhase3CwlInterchangeEntrySmoke",
    "{ skipRoundtrip: true }",
  );
  expect(report.ok).toBe(true);
  expect(report.entry?.authoringBootstrapOk).toBe(true);
});
