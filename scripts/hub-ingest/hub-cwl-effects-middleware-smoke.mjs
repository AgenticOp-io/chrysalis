#!/usr/bin/env node
/** Phase 21 CWL Effects middleware smoke (G7330). */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_EFFECTS_MIDDLEWARE_SMOKE_KIND = "chrysalis.cwl.effects-middleware-smoke";
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(scriptRoot, "fixtures/hub-gold-cwl-auth-middleware");
const SUITE_IDS = ["cwl-auth-middleware-hono", "cwl-auth-middleware-fastify"];

export function runCwlEffectsMiddlewareRfcGate() {
  const path = join(scriptRoot, "docs/CWL-RFC-0020-effects-middleware.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-rfc-0020" };
  const ok = readFileSync(path, "utf8").includes("auth.require") && readFileSync(path, "utf8").includes("G7330");
  return { ok, rfcOk: ok };
}

export async function runCwlEffectsMiddlewareGate(opts = {}) {
  const rfc = runCwlEffectsMiddlewareRfcGate();
  const cwlPath = join(opts.fixture ?? FIXTURE, "routes.cwl");
  if (!existsSync(cwlPath)) return { ok: false, skip: "missing-middleware-fixture", rfc };
  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const json = typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot);
  const hasCors = json.includes("__cwl_middleware_cors");
  const hasCsrf = json.includes("__cwl_middleware_csrf");
  const hasAuth = json.includes("cwl:executable-auth-require");
  if (!hasCors || !hasCsrf || !hasAuth) {
    return { ok: false, skip: "missing-middleware-lowering", hasCors, hasCsrf, hasAuth, rfc };
  }
  const goldVerify = {};
  let goldOk = true;
  for (const suite of SUITE_IDS) {
    const gv = spawnSync(process.execPath, [join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs"), "--suite", suite], {
      cwd: scriptRoot,
      encoding: "utf8",
      timeout: 180_000,
    });
    goldVerify[suite] = gv.status === 0;
    if (!goldVerify[suite]) goldOk = false;
  }
  const ok = rfc.ok === true && hasCors && hasCsrf && hasAuth && goldOk;
  return { ok, rfc, hasCors, hasCsrf, hasAuth, goldVerify, generatedAt: new Date().toISOString() };
}

export async function runCwlEffectsMiddlewareSmoke(opts = {}) {
  const progress = createSmokeProgress("cwl-effects-middleware");
  const t0 = progress.start("CWL Effects middleware (G7330)");
  const gate = await runCwlEffectsMiddlewareGate(opts);
  progress.end("CWL Effects middleware (G7330)", gate.ok === true, t0);
  return { kind: CWL_EFFECTS_MIDDLEWARE_SMOKE_KIND, schemaVersion: 1, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runCwlEffectsMiddlewareSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-effects-middleware-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
