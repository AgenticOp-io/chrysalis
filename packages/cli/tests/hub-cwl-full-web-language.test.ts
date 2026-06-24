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

test("cwl full web language program close doc gate (G7590)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-full-web-language-close-smoke.mjs",
    "runCwlFullWebLanguageDocGate",
  );
  expect(gate.ok).toBe(true);
});

test("cwl full language charter gate (G7501)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-full-language-charter-smoke.mjs",
    "runCwlFullLanguageCharterGate",
  );
  expect(gate.ok).toBe(true);
});

test("cwl authored complete gate (G7502)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-authored-complete-smoke.mjs",
    "runCwlAuthoredCompleteGate",
  );
  expect(gate.ok).toBe(true);
}, 120_000);

test("cwl translator verify gate (G7504)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-translator-verify-smoke.mjs",
    "runCwlTranslatorVerifyGate",
    { skipGoldVerify: true, skipRoundtrip: true },
  );
  expect(gate.ok).toBe(true);
}, 300_000);
