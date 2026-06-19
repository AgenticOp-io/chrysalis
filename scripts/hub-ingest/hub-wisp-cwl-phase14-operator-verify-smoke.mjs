#!/usr/bin/env node
/** Phase 14 operator verify smoke (G6680) — one-shot post-deploy live checks. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispOperatorVerify, WISP_OPERATOR_VERIFY_KIND } from "../wisp-cwl-operator-verify.mjs";

export const WISP_CWL_PHASE14_OPERATOR_VERIFY_SMOKE_KIND = "chrysalis.wisp-cwl-phase14-operator-verify-smoke";
export const WISP_CWL_PHASE14_OPERATOR_VERIFY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6681 — program doc records operator verify gate. */
export function runWispPhase14OperatorVerifyDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6680") &&
    text.includes("wisp:operator-verify") &&
    text.includes("wisp-cwl-operator-verify");
  return { ok, operatorVerifyDocOk: ok };
}

/** G6682 — operator verify kind exported. */
export function runWispOperatorVerifyKindGate() {
  const ok = WISP_OPERATOR_VERIFY_KIND === "chrysalis.wisp.operator-verify";
  return { ok, kindOk: ok };
}

/** G6680 composite. */
export async function runWispCwlPhase14OperatorVerifyGate(opts = {}) {
  const doc = runWispPhase14OperatorVerifyDocGate();
  const kindGate = runWispOperatorVerifyKindGate();
  const verify = await runWispOperatorVerify({
    skipLive: opts.skipLive !== false && opts.requireLive !== true,
    baseUrl: opts.baseUrl,
    skipBackend: opts.skipBackend === true,
    reportPath: opts.reportPath,
  });
  const ok = doc.ok === true && kindGate.ok === true && verify.ok === true;
  return {
    kind: WISP_CWL_PHASE14_OPERATOR_VERIFY_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE14_OPERATOR_VERIFY_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    kindGate,
    verify,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const requireLive = process.argv.includes("--require");
  const r = await runWispCwlPhase14OperatorVerifyGate({ requireLive });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase14-operator-verify-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
