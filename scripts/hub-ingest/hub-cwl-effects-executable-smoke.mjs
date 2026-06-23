#!/usr/bin/env node
/** Phase 17 CWL Effects executable smoke (G7130) — RFC-0007 runtime parity. */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runCwlAuthEffectsSmoke } from "./hub-cwl-auth-effects-smoke.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_EFFECTS_EXECUTABLE_SMOKE_KIND = "chrysalis.cwl.effects-executable-smoke";
export const CWL_EFFECTS_EXECUTABLE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUTH_FIXTURE = join(scriptRoot, "fixtures/hub-gold-cwl-auth-effects/routes.cwl");

async function loadRuntime(repoRoot) {
  try {
    return await import("@chrysalis/runtime-cwl");
  } catch {
    return import(pathToFileURL(join(repoRoot, "packages/runtime-cwl/dist/index.js")).href);
  }
}

/** G7131 — WebIR contains executable session.read for declared effects. */
export async function runCwlEffectsExecutableWebirGate() {
  const snapshot = await exportCwlFileToWebirJson(AUTH_FIXTURE);
  const mod = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  const nodes = Object.values(mod.nodes ?? {});
  const hasSessionReadOp = nodes.some((n) => n.dialect === "effect" && n.op === "session.read");
  const hasSessionWriteOp = nodes.some((n) => n.dialect === "effect" && n.op === "session.write");
  const ok = hasSessionReadOp && hasSessionWriteOp;
  return { ok, hasSessionReadOp, hasSessionWriteOp };
}

/** G7132 — runtime-cwl touches session on /login POST (session.write). */
export async function runCwlEffectsRuntimeGate(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const { createCwlRuntime, loadModuleFromCwlFile } = await loadRuntime(repoRoot);
  const runtime = createCwlRuntime({
    module: loadModuleFromCwlFile(AUTH_FIXTURE, repoRoot),
    session: {},
  });
  const res = await runtime.fetch({ method: "POST", url: "http://127.0.0.1/login" });
  const ok = res.status === 200;
  return { ok, status: res.status };
}

/** G7130 — Effects executable composite. */
export async function runCwlEffectsExecutableGate(opts = {}) {
  const auth = await runCwlAuthEffectsSmoke(opts);
  const webir = await runCwlEffectsExecutableWebirGate();
  const runtime = await runCwlEffectsRuntimeGate(opts);
  const ok = auth.ok === true && webir.ok === true && runtime.ok === true;
  return {
    kind: CWL_EFFECTS_EXECUTABLE_SMOKE_KIND,
    schemaVersion: CWL_EFFECTS_EXECUTABLE_SMOKE_SCHEMA_VERSION,
    ok,
    auth,
    webir,
    runtime,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCwlEffectsExecutableSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-effects-executable");
  const t0 = progress.start("CWL Effects executable (G7130)");
  const gate = await runCwlEffectsExecutableGate(opts);
  progress.end("CWL Effects executable (G7130)", gate.ok === true, t0);
  return {
    kind: CWL_EFFECTS_EXECUTABLE_SMOKE_KIND,
    schemaVersion: CWL_EFFECTS_EXECUTABLE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlEffectsExecutableSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-effects-executable-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
