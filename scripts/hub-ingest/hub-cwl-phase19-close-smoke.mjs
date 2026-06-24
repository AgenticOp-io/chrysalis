#!/usr/bin/env node
/** Phase 19 close smoke (G7310) — CWL UI v1. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlUiV1Gate } from "./hub-cwl-ui-v1-smoke.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE19_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase19-close-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlFlagshipHoleBudgetGate() {
  const path = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack/routes.cwl");
  if (!existsSync(path)) return { ok: false, skip: "missing-flagship" };
  const webir = await loadWebir();
  const snapshot = await exportCwlFileToWebirJson(path);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  const p = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
  const ok = p.holeFree === p.total && p.total >= 3;
  return { ok, holeFree: p.holeFree, total: p.total };
}

export async function runCwlPhase19CloseGate(opts = {}) {
  const uiV1 = await runCwlUiV1Gate(opts);
  const flagship = await runCwlFlagshipHoleBudgetGate();
  const rfcPath = join(scriptRoot, "docs/CWL-RFC-0019-native-ui-v1.md");
  const rfcOk = existsSync(rfcPath) && readFileSync(rfcPath, "utf8").includes("G7310");
  const ok = uiV1.ok === true && flagship.ok === true && rfcOk;
  return {
    kind: CWL_PHASE19_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    uiV1,
    flagship,
    rfc0019Ok: rfcOk,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlPhase19CloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase19-close");
  const t0 = progress.start("CWL Phase 19 close (G7310)");
  const gate = await runCwlPhase19CloseGate(opts);
  progress.end("CWL Phase 19 close (G7310)", gate.ok === true, t0);
  return { kind: CWL_PHASE19_CLOSE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlPhase19CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase19-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
