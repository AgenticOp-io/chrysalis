#!/usr/bin/env node
/** Phase 14 live HSS backend smoke (G6700) — optional reachability to hss.wisptools.io. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispHssLiveBackendProbeGate } from "./hub-wisp-cwl-phase14-hss-proxy-smoke.mjs";

export const WISP_CWL_PHASE14_LIVE_BACKEND_SMOKE_KIND = "chrysalis.wisp-cwl-phase14-live-backend-smoke";
export const WISP_CWL_PHASE14_LIVE_BACKEND_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6701 — program doc records live backend gate. */
export function runWispPhase14LiveBackendDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6700") &&
    text.includes("CHRYSALIS_WISP_LIVE_BACKEND_PROBE") &&
    text.includes("hss.wisptools.io");
  return { ok, liveBackendDocOk: ok };
}

/** G6700 — live HSS backend probe (skip in CI unless CHRYSALIS_WISP_LIVE_BACKEND_PROBE=1). */
export async function runWispCwlPhase14LiveBackendGate(opts = {}) {
  const doc = runWispPhase14LiveBackendDocGate();
  const skipLive =
    opts.skipLive === true ||
    (process.env.GITHUB_ACTIONS === "true" && process.env.CHRYSALIS_WISP_LIVE_BACKEND_PROBE !== "1");

  if (skipLive) {
    return {
      kind: WISP_CWL_PHASE14_LIVE_BACKEND_SMOKE_KIND,
      schemaVersion: WISP_CWL_PHASE14_LIVE_BACKEND_SMOKE_SCHEMA_VERSION,
      ok: doc.ok === true,
      doc,
      probe: { ok: true, skip: "skip-live-backend-probe" },
      generatedAt: new Date().toISOString(),
    };
  }

  const probe = await runWispHssLiveBackendProbeGate();
  const ok = doc.ok === true && probe.ok === true;
  return {
    kind: WISP_CWL_PHASE14_LIVE_BACKEND_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE14_LIVE_BACKEND_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    probe,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const requireLive = process.argv.includes("--require");
  const r = await runWispCwlPhase14LiveBackendGate({ skipLive: !requireLive });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase14-live-backend-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
