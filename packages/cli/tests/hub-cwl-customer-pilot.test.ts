import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function importGate(relPath: string, fn: string, opts: Record<string, unknown> = {}) {
  const r = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { ${fn} as gate } from "./${relPath.replace(/\\/g, "/")}"; console.log(JSON.stringify(await gate(${JSON.stringify(opts)})));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 600_000 },
  );
  return JSON.parse(r.trim());
}

function importSyncGate(relPath: string, fn: string) {
  const r = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { ${fn} as gate } from "./${relPath.replace(/\\/g, "/")}"; console.log(JSON.stringify(gate()));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 60_000 },
  );
  return JSON.parse(r.trim());
}

test("cwl customer pilot program doc gate (G7490)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-customer-pilot-close-smoke.mjs",
    "runCwlCustomerPilotDocGate",
  );
  expect(gate.ok).toBe(true);
});

test("cwl pilot charter gate (G7401)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-pilot-charter-smoke.mjs",
    "runCwlPilotCharterGate",
  );
  expect(gate.ok).toBe(true);
});

test("cwl phase 24a close smoke (G7401)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-phase24a-close-smoke.mjs",
    "runCwlPhase24aCloseGate",
  );
  expect(gate.ok).toBe(true);
}, 120_000);

test("cwl customer pilot close smoke (G7490)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-customer-pilot-close-smoke.mjs",
    "runCwlCustomerPilotCloseGate",
    { skipGoldVerify: true },
  );
  expect(gate.ok).toBe(true);
}, 900_000);
