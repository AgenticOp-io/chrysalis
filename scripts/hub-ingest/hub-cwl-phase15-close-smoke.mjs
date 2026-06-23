#!/usr/bin/env node
/** Phase 15 close smoke (G7110) — UI v0 + components + login bridge policy. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlUiV0Gate } from "./hub-cwl-ui-v0-smoke.mjs";
import { parseCwlModule } from "./cwl-parser.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_PHASE15_CLOSE_SMOKE_KIND = "chrysalis.cwl.phase15-close-smoke";
export const CWL_PHASE15_CLOSE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G7113 — login bridge policy doc. */
export function runCwlUiLoginBridgeDocGate() {
  const path = join(scriptRoot, "docs/CWL-UI-LOGIN-BRIDGE.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-login-bridge-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("hub-svelte:firebase-auth") &&
    text.includes("G7110") &&
    text.includes("G6410") &&
    text.includes("chimera");
  return { ok, loginBridgeDocOk: ok };
}

/** G7113 — @component present in UI v0 gold fixture. */
export function runCwlUiComponentFixtureGate() {
  const path = join(scriptRoot, "fixtures/hub-gold-cwl-ui-v0/routes.cwl");
  if (!existsSync(path)) return { ok: false, skip: "missing-ui-v0-fixture" };
  const parsed = parseCwlModule(readFileSync(path, "utf8"), "routes.cwl");
  const components = parsed.components ?? [];
  const uses = parsed.routes.filter((r) => r.body?.kind === "ui" && r.body.componentRef);
  const ok = components.length >= 1 && uses.length >= 2;
  return { ok, componentCount: components.length, componentUseCount: uses.length };
}

/** G7110 — Phase 15 UI v0 program close. */
export async function runCwlPhase15CloseGate(opts = {}) {
  const uiV0 = await runCwlUiV0Gate(opts);
  const loginBridge = runCwlUiLoginBridgeDocGate();
  const components = runCwlUiComponentFixtureGate();
  const rfcPath = join(scriptRoot, "docs/CWL-RFC-0018-native-ui-components.md");
  const rfcOk = existsSync(rfcPath) && readFileSync(rfcPath, "utf8").includes("@component");
  const ok = uiV0.ok === true && loginBridge.ok === true && components.ok === true && rfcOk;
  return {
    kind: CWL_PHASE15_CLOSE_SMOKE_KIND,
    schemaVersion: CWL_PHASE15_CLOSE_SMOKE_SCHEMA_VERSION,
    ok,
    uiV0,
    loginBridge,
    components,
    rfc0018Ok: rfcOk,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlPhase15CloseSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-phase15-close");
  const t0 = progress.start("CWL Phase 15 close (G7110)");
  const gate = await runCwlPhase15CloseGate(opts);
  progress.end("CWL Phase 15 close (G7110)", gate.ok === true, t0);
  return {
    kind: CWL_PHASE15_CLOSE_SMOKE_KIND,
    schemaVersion: CWL_PHASE15_CLOSE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlPhase15CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-phase15-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
