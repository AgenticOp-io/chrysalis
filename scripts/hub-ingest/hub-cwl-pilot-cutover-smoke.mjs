#!/usr/bin/env node
/** Pilot cutover evidence smoke (G7404) — HTTP oracle verify hono + fastify. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlFullstackVerifyHttpSmoke } from "./hub-cwl-fullstack-verify-http-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PILOT_CUTOVER_SMOKE_KIND = "chrysalis.cwl.pilot-cutover-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runCwlPilotCutoverDocGate() {
  const path = join(scriptRoot, "docs/CWL-CUSTOMER-PILOT-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok = text.includes("Phase 24d") && text.includes("G7404") && text.includes("Cutover evidence");
  return { ok, docOk: ok };
}

export async function runCwlPilotCutoverGate(opts = {}) {
  const doc = runCwlPilotCutoverDocGate();
  const http = await runCwlFullstackVerifyHttpSmoke(opts);
  const ok = doc.ok === true && http.ok === true;
  return {
    kind: CWL_PILOT_CUTOVER_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    http,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlPilotCutoverSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-pilot-cutover");
  const t0 = progress.start("CWL pilot cutover (G7404)");
  const gate = await runCwlPilotCutoverGate(opts);
  progress.end("CWL pilot cutover (G7404)", gate.ok === true, t0);
  return { kind: CWL_PILOT_CUTOVER_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPilotCutoverSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-pilot-cutover-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
