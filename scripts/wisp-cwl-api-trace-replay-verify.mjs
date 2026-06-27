#!/usr/bin/env node
/**
 * Replay WISP API pilot traces against runtime-cwl native handlers (Phase 28d).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readCorpus } from "../packages/oracle/dist/index.js";
import { replayCorpus, buildReport } from "../packages/verify/dist/index.js";
import { resolveWispPreviewSession } from "./wisp-cwl-post-g7790.mjs";

export const WISP_API_TRACE_REPLAY_KIND = "chrysalis.wisp.api-trace-replay";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wispFixture = join(scriptRoot, "fixtures/hub-wisp-management");
const tracesRoot = join(wispFixture, "wisp-api-pilot-traces");
const apiProxyPath = join(wispFixture, "api-proxy.cwl");
const pilotManifestPath = join(wispFixture, "chrysalis.wisp-api-trace-pilot.v1.json");

async function loadRuntimeCwl(repoRoot) {
  try {
    return await import("@chrysalis/runtime-cwl");
  } catch {
    return import(pathToFileURL(join(repoRoot, "packages/runtime-cwl/dist/index.js")).href);
  }
}

export async function runWispApiTraceReplayVerify(_opts = {}) {
  const base = {
    kind: WISP_API_TRACE_REPLAY_KIND,
    schemaVersion: 1,
    ok: false,
  };

  if (!existsSync(tracesRoot)) {
    return { ...base, skip: "missing-traces-root", tracesRoot };
  }
  if (!existsSync(apiProxyPath)) {
    return { ...base, skip: "missing-api-proxy" };
  }
  if (!existsSync(pilotManifestPath)) {
    return { ...base, skip: "missing-pilot-manifest" };
  }

  const corpus = readCorpus({ root: tracesRoot });
  if (!corpus.traces?.length) {
    return { ...base, skip: "empty-corpus" };
  }

  const runtimeMod = await loadRuntimeCwl(scriptRoot);
  const { createCwlRuntime, loadModuleFromCwlFile } = runtimeMod;
  const module = loadModuleFromCwlFile(apiProxyPath, scriptRoot);
  const runtime = createCwlRuntime({ module, resolveSession: resolveWispPreviewSession });

  const outcomes = await replayCorpus(corpus, {
    baseUrl: "http://127.0.0.1",
    injectDeterminismHeaders: true,
    fetch: (url, init) =>
      runtime.fetch({
        method: init?.method ?? "GET",
        url: String(url),
        headers: init?.headers,
        body: typeof init?.body === "string" ? init.body : undefined,
      }),
  });
  const report = buildReport(outcomes);
  const correctness = report.aggregate?.correctness ?? 0;
  const replayOk = correctness >= 1;

  const manifest = JSON.parse(readFileSync(pilotManifestPath, "utf8"));
  manifest.status = replayOk ? "replay-green" : manifest.status === "replay-green" ? "replay-green" : "captured";
  manifest.pilotRoutes = (manifest.pilotRoutes ?? []).map((r) => {
    const outcome = outcomes.find((o) => o.route === `${r.method} ${r.path}`);
    return outcome ? { ...r, replayOk: outcome.ok === true } : r;
  });
  manifest.replayCorrectness = correctness;
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(pilotManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    ...base,
    ok: replayOk,
    correctness,
    framesTotal: report.aggregate?.framesTotal ?? null,
    framesPassed: report.aggregate?.framesPassed ?? null,
    traceCount: corpus.traces.length,
    tracesRoot,
  };
}

async function main() {
  const r = await runWispApiTraceReplayVerify();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-api-trace-replay-verify")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
