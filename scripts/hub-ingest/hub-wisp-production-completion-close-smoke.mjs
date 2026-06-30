#!/usr/bin/env node
/** WISP production completion program close (G7990). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispProductionCompletionApiReplayGate } from "./hub-wisp-production-completion-api-replay-smoke.mjs";
import { runWispProductionCompletionStaticExportGate } from "./hub-wisp-production-completion-static-export-smoke.mjs";
import { runWispProductionCompletionOperatorGate } from "./hub-wisp-production-completion-operator-smoke.mjs";
import { runWispProductionPocCloseGate } from "./hub-wisp-production-poc-close-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_PRODUCTION_COMPLETION_CLOSE_KIND = "chrysalis.wisp.production-completion-close-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispProductionCompletionDocGate() {
  const path = join(scriptRoot, "docs/WISP-PRODUCTION-COMPLETION-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("Program closed") ||
    (text.includes("**Status:** **active**") && text.includes("G7900") && text.includes("G7990"));
  return { ok, programDocOk: ok };
}

export async function runWispProductionCompletionCloseGate(opts = {}) {
  const progress = createSmokeProgress("wisp-production-completion-close-gates");
  const doc = runWispProductionCompletionDocGate();
  progress.info(`doc ${doc.ok === true ? "ok" : "FAIL"}`);
  let t0 = progress.start("phase29a-api");
  const phase29a = await runWispProductionCompletionApiReplayGate();
  progress.end("phase29a-api", phase29a.ok === true, t0);
  t0 = progress.start("phase29b-static");
  const phase29b = await runWispProductionCompletionStaticExportGate();
  progress.end("phase29b-static", phase29b.ok === true, t0);
  t0 = progress.start("phase29c-operator");
  const phase29c = await runWispProductionCompletionOperatorGate();
  progress.end("phase29c-operator", phase29c.ok === true, t0);
  t0 = progress.start("g7890-regression");
  const g7890 = await runWispProductionPocCloseGate({ ...opts, skipMaintenance: true });
  progress.end("g7890-regression", g7890.ok === true, t0);
  const ok =
    doc.ok === true &&
    phase29a.ok === true &&
    phase29b.ok === true &&
    phase29c.ok === true &&
    g7890.ok === true;
  return {
    kind: WISP_PRODUCTION_COMPLETION_CLOSE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    phase29a,
    phase29b,
    phase29c,
    g7890,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispProductionCompletionCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-production-completion-close");
  const t0 = progress.start("WISP production completion close (G7990)");
  const gate = await runWispProductionCompletionCloseGate(opts);
  progress.end("WISP production completion close (G7990)", gate.ok === true, t0);
  return {
    kind: WISP_PRODUCTION_COMPLETION_CLOSE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispProductionCompletionCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-completion-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
