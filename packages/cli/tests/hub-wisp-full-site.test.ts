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
    { cwd: ROOT, encoding: "utf8", timeout: 120_000, env: { ...process.env, CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD: "1" } },
  );
  return JSON.parse(r.trim());
}

test("wisp full site program doc closed (G7790 doc slice)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-wisp-full-site-close-smoke.mjs",
    "runWispFullSiteDocGate",
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

test("wisp full site api inventory baseline (G7702)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-wisp-full-site-api-inventory-smoke.mjs",
    "runWispFullSiteApiInventoryGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.nativeOk).toBe(true);
  expect(gate.upstreamProxyRefs).toBe(0);
});

test("wisp full site ui baseline inventory (G7703)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-wisp-full-site-ui-baseline-smoke.mjs",
    "runWispFullSiteUiBaselineGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.nativeOk).toBe(true);
  expect(gate.pageComponentRefs).toBe(0);
});

test("wisp full site auth policy (G7704)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-wisp-full-site-auth-policy-smoke.mjs",
    "runWispFullSiteAuthPolicyGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.nativeOk).toBe(true);
});

test("wisp full site cutover policy (G7706)", () => {
  const gate = importSyncGate(
    "scripts/hub-ingest/hub-wisp-full-site-cutover-smoke.mjs",
    "runWispFullSiteCutoverGate",
  );
  expect(gate.ok).toBe(true);
  expect(gate.nativeOk).toBe(true);
});

// G7790 composite runs G7690→G7590 regression (~6+ min). CI runs hub:wisp-full-site-close-smoke directly.
