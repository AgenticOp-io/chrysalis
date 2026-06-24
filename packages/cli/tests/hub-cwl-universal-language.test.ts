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

test("cwl universal language program doc gate (G7390)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-cwl-universal-language-close-smoke.mjs",
    "runCwlUniversalLanguageDocGate",
  );
  expect(gate.ok).toBe(true);
});

test("cwl data v2 framework ingest gate (G7321)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-data-v2-smoke.mjs",
    "runCwlDataV2FrameworkIngestGate",
  );
  expect(gate.ok).toBe(true);
}, 120_000);

test("cwl phase 19 close smoke (G7310)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-phase19-close-smoke.mjs",
    "runCwlPhase19CloseGate",
  );
  expect(gate.ok).toBe(true);
}, 300_000);

test("cwl universal language close smoke (G7390)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-universal-language-close-smoke.mjs",
    "runCwlUniversalLanguageCloseGate",
  );
  expect(gate.ok).toBe(true);
}, 600_000);
