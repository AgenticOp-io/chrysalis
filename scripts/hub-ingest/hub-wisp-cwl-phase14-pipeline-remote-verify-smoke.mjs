#!/usr/bin/env node
/** Phase 14 pipeline remote verify smoke (G6650) — deploy report includes manifest + poc verify. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validatePipelineRemoteVerifyDetail,
  WISP_DEMO_MANIFEST_VERIFY_KIND,
} from "../wisp-cwl-demo-manifest-verify.mjs";
import { WISP_CWL_PIPELINE_KIND } from "../wisp-cwl-pipeline.mjs";

export const WISP_CWL_PHASE14_PIPELINE_REMOTE_VERIFY_SMOKE_KIND =
  "chrysalis.wisp-cwl-phase14-pipeline-remote-verify-smoke";
export const WISP_CWL_PHASE14_PIPELINE_REMOTE_VERIFY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultReport = join(scriptRoot, "reports/wisp/wisp-cwl-pipeline.json");

/** G6651 — program doc records pipeline manifest remote verify gate. */
export function runWispPhase14PipelineRemoteVerifyDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6650") &&
    text.includes("validatePipelineRemoteVerifyDetail") &&
    text.includes("wisp:verify:demo");
  return { ok, pipelineRemoteVerifyDocOk: ok };
}

/** G6652 — manifest verify kind exported for pipeline artifact contract. */
export function runWispPipelineRemoteVerifyContractGate() {
  const ok =
    WISP_DEMO_MANIFEST_VERIFY_KIND === "chrysalis.wisp.demo-manifest.verify" &&
    WISP_CWL_PIPELINE_KIND === "chrysalis.wisp-cwl-pipeline";
  return { ok, contractOk: ok };
}

/** G6650 — optional: validate last deploy pipeline report remoteVerify block. */
export function runWispPipelineRemoteVerifyReportGate(opts = {}) {
  const reportPath = resolve(opts.reportPath ?? defaultReport);
  if (!existsSync(reportPath)) {
    return { ok: true, skip: "no-pipeline-report", reportPath };
  }
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  if (!report.remoteVerify) {
    return { ok: true, skip: "no-remote-verify-in-report", reportPath };
  }
  const validation = validatePipelineRemoteVerifyDetail(report.remoteVerify);
  return {
    ok: validation.ok === true,
    reportPath,
    validation,
    reportOk: report.ok === true,
    mode: report.mode ?? null,
  };
}

/** G6650 composite. */
export function runWispCwlPhase14PipelineRemoteVerifyGate(opts = {}) {
  const doc = runWispPhase14PipelineRemoteVerifyDocGate();
  const contract = runWispPipelineRemoteVerifyContractGate();
  const report = runWispPipelineRemoteVerifyReportGate(opts);
  const ok = doc.ok === true && contract.ok === true && report.ok === true;
  return {
    kind: WISP_CWL_PHASE14_PIPELINE_REMOTE_VERIFY_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE14_PIPELINE_REMOTE_VERIFY_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    contract,
    report,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispCwlPhase14PipelineRemoteVerifyGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase14-pipeline-remote-verify-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
