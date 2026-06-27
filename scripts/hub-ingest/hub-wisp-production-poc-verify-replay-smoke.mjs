#!/usr/bin/env node
/** Phase 28d verify replay pilot gate (G7805). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispApiTraceReplayVerify } from "../wisp-cwl-api-trace-replay-verify.mjs";

export const WISP_PRODUCTION_POC_VERIFY_REPLAY_KIND = "chrysalis.wisp.production-poc-verify-replay-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispProductionPocVerifyReplayDocGate() {
  const programPath = join(scriptRoot, "docs/WISP-PRODUCTION-POC-PROGRAM.md");
  if (!existsSync(programPath)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(programPath, "utf8");
  const ok =
    text.includes("Trace capture playbook") &&
    text.includes("chrysalis.wisp-api-trace-pilot") &&
    text.includes("wisp-api-pilot-traces") &&
    text.includes("G7805");
  return { ok, docOk: ok };
}

export function runWispProductionPocVerifyReplayPilotGate() {
  const manifestPath = join(scriptRoot, "fixtures/hub-wisp-management/chrysalis.wisp-api-trace-pilot.v1.json");
  if (!existsSync(manifestPath)) return { ok: false, skip: "missing-pilot-manifest" };
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const routes = manifest.pilotRoutes ?? [];
  const hasPilot = routes.some((r) => r.path === "/api/tenants" && r.method === "GET");
  const captured = manifest.status === "captured" || manifest.status === "replay-green";
  const replayReady = routes.some((r) => r.replayOk === true);
  const ok =
    manifest.kind === "chrysalis.wisp.api-trace-pilot" &&
    hasPilot &&
    captured &&
    (replayReady || manifest.status === "captured");
  return {
    ok,
    pilotManifestOk: ok,
    status: manifest.status,
    replayReady,
    pendingCapture: !captured,
  };
}

export async function runWispProductionPocVerifyReplayGate() {
  const doc = runWispProductionPocVerifyReplayDocGate();
  let replay = { ok: false, skip: "replay-not-run" };
  if (existsSync(join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-pilot-traces"))) {
    replay = await runWispApiTraceReplayVerify();
  }
  const pilot = runWispProductionPocVerifyReplayPilotGate();
  const okWithReplay = doc.ok === true && pilot.ok === true && replay.ok === true;
  return {
    kind: WISP_PRODUCTION_POC_VERIFY_REPLAY_KIND,
    schemaVersion: 1,
    ok: okWithReplay,
    doc,
    pilot,
    replay,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispProductionPocVerifyReplayGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-poc-verify-replay-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
