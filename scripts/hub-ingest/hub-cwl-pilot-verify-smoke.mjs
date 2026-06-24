#!/usr/bin/env node
/** Pilot verify replay smoke (G7403) — flagship gold + hole budget. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPilotCharter, resolvePilotCwlFixture } from "./hub-cwl-pilot-charter.mjs";
import { runCwlFullstackFlagshipSmoke } from "./hub-cwl-fullstack-flagship-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PILOT_VERIFY_SMOKE_KIND = "chrysalis.cwl.pilot-verify-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlPilotVerifyDocGate() {
  const path = join(scriptRoot, "docs/CWL-CUSTOMER-PILOT-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok = text.includes("Phase 24c") && text.includes("G7403") && text.includes("Verify replay");
  return { ok, docOk: ok };
}

export async function runCwlPilotVerifyGate(opts = {}) {
  const doc = runCwlPilotVerifyDocGate();
  const loaded = loadPilotCharter();
  if (!loaded.ok) {
    return { ok: false, doc, charter: loaded, generatedAt: new Date().toISOString() };
  }
  const fixture = resolvePilotCwlFixture(loaded.charter);
  const skipGoldVerify =
    opts.skipGoldVerify === true || process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD === "1";
  const flagship = await runCwlFullstackFlagshipSmoke({ ...opts, fixture, skipGoldVerify });
  const ok = doc.ok === true && flagship.ok === true;
  return {
    kind: CWL_PILOT_VERIFY_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    flagship,
    skipGoldVerify,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlPilotVerifySmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-pilot-verify");
  const t0 = progress.start("CWL pilot verify (G7403)");
  const gate = await runCwlPilotVerifyGate(opts);
  progress.end("CWL pilot verify (G7403)", gate.ok === true, t0);
  return { kind: CWL_PILOT_VERIFY_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPilotVerifySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-pilot-verify-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
