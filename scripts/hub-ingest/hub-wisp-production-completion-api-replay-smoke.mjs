#!/usr/bin/env node
/** Phase 29a full API oracle replay gate (G7905). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispApiTraceReplayVerify } from "../wisp-cwl-api-trace-replay-verify.mjs";

export const WISP_PRODUCTION_COMPLETION_API_REPLAY_KIND =
  "chrysalis.wisp.production-completion-api-replay-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispProductionCompletionApiReplayDocGate() {
  const programPath = join(scriptRoot, "docs/WISP-PRODUCTION-COMPLETION-PROGRAM.md");
  if (!existsSync(programPath)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(programPath, "utf8");
  const ok =
    text.includes("Full API oracle corpus") &&
    text.includes("wisp-api-goldens") &&
    text.includes("G7905");
  return { ok, docOk: ok };
}

export async function runWispProductionCompletionApiReplayGate() {
  const doc = runWispProductionCompletionApiReplayDocGate();
  const goldensIndex = join(scriptRoot, "fixtures/hub-wisp-management/chrysalis.wisp-api-goldens.v1.json");
  let indexOk = false;
  let handlerCount = 0;
  if (existsSync(goldensIndex)) {
    const index = JSON.parse(readFileSync(goldensIndex, "utf8"));
    handlerCount = index.appliedCount ?? 0;
    indexOk = index.appliedCount === index.handlerCount && index.handlerCount >= 109;
  }
  const replay = await runWispApiTraceReplayVerify();
  const ok = doc.ok === true && indexOk === true && replay.ok === true && replay.correctness === 1;
  return {
    kind: WISP_PRODUCTION_COMPLETION_API_REPLAY_KIND,
    schemaVersion: 1,
    ok,
    doc,
    indexOk,
    handlerCount,
    replay,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispProductionCompletionApiReplayGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-completion-api-replay-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
