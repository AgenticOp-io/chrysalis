import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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

function importGate(relPath: string, fn: string, opts: Record<string, unknown> = {}) {
  const r = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { ${fn} as gate } from "./${relPath.replace(/\\/g, "/")}"; console.log(JSON.stringify(await gate(${JSON.stringify(opts)})));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 600_000, env: { ...process.env, CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD: "1" } },
  );
  return JSON.parse(r.trim());
}

test("cwl universal translator program close doc gate (G7690)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-universal-translator-close-smoke.mjs",
    "runCwlUniversalTranslatorDocGate",
  );
  expect(gate.ok).toBe(true);
});

test("cwl translator composer charter gate (G7601)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-translator-composer-charter-smoke.mjs",
    "runCwlTranslatorComposerCharterGate",
  );
  expect(gate.ok).toBe(true);
});

test("cwl translator cross-edge gate (G7604)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-translator-cross-edge-smoke.mjs",
    "runCwlTranslatorCrossEdgeGate",
  );
  expect(gate.ok).toBe(true);
}, 300_000);
