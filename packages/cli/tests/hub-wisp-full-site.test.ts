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
      `import { ${fn} as gate } from "./${relPath.replace(/\\/g, "/")}"; console.log(JSON.stringify(await gate()));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 60_000 },
  );
  return JSON.parse(r.trim());
}

test("wisp full site program entry doc gate (G7700)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-wisp-full-site-program-entry-smoke.mjs",
    "runWispFullSiteProgramEntryGate",
  );
  expect(gate.ok).toBe(true);
});

test("wisp full site charter gate (G7701)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-wisp-full-site-charter-smoke.mjs",
    "runWispFullSiteCharterGate",
  );
  expect(gate.ok).toBe(true);
});

test("wisp full site api inventory baseline (G7702 inventory)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-wisp-full-site-api-inventory-smoke.mjs",
    "runWispFullSiteApiInventoryGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.nativeOk).toBe(false);
});
