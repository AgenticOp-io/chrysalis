#!/usr/bin/env node
/**
 * Shared CWL gold runtime smoke helper (G202/G204/G206).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const traceReplayScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-trace-replay.mjs");

/**
 * @param {string} cwlPath
 */
export async function loadCwlProjection(cwlPath) {
  const webir = await loadWebir();
  const snapshot = await exportCwlFileToWebirJson(cwlPath);
  const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
  return summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
}

/**
 * @param {string[]} suiteIds
 */
export function runGoldTraceReplay(suiteIds) {
  /** @type {Record<string, boolean | string>} */
  const traceReplay = {};
  /** @type {Record<string, string | undefined>} */
  const traceSkip = {};
  let traceOk = true;
  for (const suite of suiteIds) {
    const r = spawnSync(process.execPath, ["--import", "tsx", traceReplayScript, "--suite", suite], {
      cwd: scriptRoot,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      timeout: process.env.CHRYSALIS_GCE_ALL_TESTS === "1" ? 600_000 : undefined,
    });
    let skipped = false;
    if (r.status === 0) {
      try {
        const text = (r.stdout ?? "").trim();
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start >= 0 && end > start) {
          const j = JSON.parse(text.slice(start, end + 1));
          const first = Array.isArray(j.results) ? j.results[0] : j;
          if (first?.skip === "no-wptp-emit-nextjs") {
            skipped = true;
            traceSkip[suite] = "no-wptp-emit-nextjs";
          }
        }
      } catch {
        /* ignore parse — status 0 is enough */
      }
    }
    traceReplay[suite] = r.status === 0;
    if (r.status !== 0) traceOk = false;
    if (skipped) traceReplay[suite] = "skipped-no-wptp-emit-nextjs";
  }
  return { traceReplay, traceSkip, traceOk };
}

/**
 * @param {object} opts
 * @param {string} opts.kind
 * @param {number} opts.schemaVersion
 * @param {string} opts.fixtureRel
 * @param {string} opts.rfc
 * @param {string[]} opts.suiteIds
 * @param {(projection: ReturnType<typeof summarizeCwlProjection>) => boolean} opts.projectionOk
 * @param {string} [opts.fixtureDir]
 */
export async function runCwlGoldRuntimeSmoke(opts) {
  const fixtureDir = resolve(opts.fixtureDir ?? join(scriptRoot, opts.fixtureRel));
  const cwlPath = join(fixtureDir, "routes.cwl");
  const base = {
    kind: opts.kind,
    schemaVersion: opts.schemaVersion,
    fixture: opts.fixtureRel,
    rfc: opts.rfc,
    suites: opts.suiteIds,
    ok: false,
  };
  if (!existsSync(cwlPath)) {
    return { ...base, skip: "missing-routes-cwl" };
  }

  let cwlProjection;
  try {
    cwlProjection = await loadCwlProjection(cwlPath);
  } catch (e) {
    return { ...base, skip: "cwl-ingest-failed", detail: String(e).slice(0, 200) };
  }

  const { traceReplay, traceSkip, traceOk } = runGoldTraceReplay(opts.suiteIds);
  const projectionOk = opts.projectionOk(cwlProjection);
  const ok = projectionOk && traceOk && (cwlProjection.total ?? 0) >= 1;

  return {
    ...base,
    ok,
    cwlProjection,
    traceReplay,
    traceSkip: Object.keys(traceSkip).length ? traceSkip : undefined,
    projectionOk,
    generatedAt: new Date().toISOString(),
  };
}
