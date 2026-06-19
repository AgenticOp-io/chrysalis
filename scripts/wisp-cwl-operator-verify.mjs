#!/usr/bin/env node
/**
 * Post-deploy operator verify — live chimera probes + optional HSS backend + pipeline report.
 * Usage: node scripts/wisp-cwl-operator-verify.mjs [--base-url URL] [--require]
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runWispDemoManifestVerify,
  resolveWispRemoteDemoBaseUrl,
} from "./wisp-cwl-demo-manifest-verify.mjs";
import { runWispHssLiveBackendProbeGate } from "./hub-ingest/hub-wisp-cwl-phase14-hss-proxy-smoke.mjs";
import { runWispPipelineRemoteVerifyReportGate } from "./hub-ingest/hub-wisp-cwl-phase14-pipeline-remote-verify-smoke.mjs";

export const WISP_OPERATOR_VERIFY_KIND = "chrysalis.wisp.operator-verify";
export const WISP_OPERATOR_VERIFY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifest = join(scriptRoot, "fixtures/hub-wisp-management/wisp-demo-manifest.v1.json");
const defaultReport = join(scriptRoot, "reports/wisp/wisp-cwl-pipeline.json");

/** @param {object} opts */
export async function runWispOperatorVerify(opts = {}) {
  const skipLive =
    opts.skipLive === true ||
    (process.env.GITHUB_ACTIONS === "true" && process.env.CHRYSALIS_WISP_OPERATOR_VERIFY_LIVE !== "1");

  const manifestPath = resolve(opts.manifestPath ?? defaultManifest);
  const baseUrl =
    opts.baseUrl?.replace(/\/$/, "") ??
    resolveWispRemoteDemoBaseUrl(manifestPath);

  const base = {
    kind: WISP_OPERATOR_VERIFY_KIND,
    schemaVersion: WISP_OPERATOR_VERIFY_SCHEMA_VERSION,
    skipLive,
    baseUrl: baseUrl ?? null,
  };

  if (skipLive) {
    return {
      ...base,
      ok: true,
      demo: { ok: true, skip: "skip-live-operator-verify" },
      backend: { ok: true, skip: "skip-live-operator-verify" },
      pipeline: runWispPipelineRemoteVerifyReportGate({
        reportPath: opts.reportPath ?? defaultReport,
      }),
    };
  }

  if (!baseUrl) {
    return {
      ...base,
      ok: false,
      demo: { ok: false, skip: "no-remote-demo-url" },
      backend: { ok: true, skip: "no-base-url" },
      pipeline: runWispPipelineRemoteVerifyReportGate({
        reportPath: opts.reportPath ?? defaultReport,
      }),
    };
  }

  const demo = await runWispDemoManifestVerify({ baseUrl, manifestPath });
  const backend =
    opts.skipBackend === true || process.env.CHRYSALIS_WISP_LIVE_BACKEND_PROBE !== "1"
      ? { ok: true, skip: "live-backend-probe-not-requested" }
      : await runWispHssLiveBackendProbeGate();
  const pipeline = runWispPipelineRemoteVerifyReportGate({
    reportPath: opts.reportPath ?? defaultReport,
  });

  const pipelineOk = pipeline.ok === true || pipeline.skip === "no-pipeline-report";
  const ok = demo.ok === true && backend.ok === true && pipelineOk;

  return {
    ...base,
    ok,
    demo,
    backend,
    pipeline,
  };
}

function parseArgs(argv) {
  let baseUrl = "";
  let requireLive = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base-url" && argv[i + 1]) baseUrl = argv[++i].replace(/\/$/, "");
    else if (a === "--require") requireLive = true;
  }
  return { baseUrl: baseUrl || undefined, skipLive: !requireLive };
}

async function main() {
  const args = parseArgs(process.argv);
  const r = await runWispOperatorVerify(args);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok && !r.skipLive) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-operator-verify")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
