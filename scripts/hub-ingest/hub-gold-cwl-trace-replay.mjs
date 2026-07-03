#!/usr/bin/env node
/**
 * Trace replay for hub gold CWL emit targets (runtime-cwl simulate).
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildReport, replayCorpus } from "../../packages/verify/dist/index.js";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { probeHubGoldCorpus } from "./hub-verify-probe-corpus.mjs";
import { parseHubWebirGoldenFile } from "./hub-webir-golden-walk.mjs";
import { listHubWebRoutes } from "./hub-webir-routes.mjs";
import { concreteProbePath } from "./hub-gold-probe-routes.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const emitCwlScript = join(scriptRoot, "scripts/hub-ingest/emit-cwl-from-hub.mjs");

async function loadRuntime(repoRoot) {
  try {
    return await import("@chrysalis/runtime-cwl");
  } catch {
    return import(pathToFileURL(join(repoRoot, "packages/runtime-cwl/dist/index.js")).href);
  }
}

/**
 * @param {import('./hub-gold-manifest.mjs').HUB_GOLD_SUITES[number]} suite
 */
export async function runCwlTraceReplaySuite(suite) {
  const fixture = suite.fixture;
  const origin = suite.origin;
  const target = suite.emitTarget;
  if (target !== "cwl") {
    throw new Error(`not a cwl emit target: ${target}`);
  }

  if (origin === "php") {
    const phpExport = await exportPhpHubWebir(fixture);
    if (phpExport.skip || !phpExport.ok) {
      throw new Error(phpExport.skip ?? `php-export-holes:${phpExport.holeCount}`);
    }
  } else {
    const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", origin], {
      cwd: scriptRoot,
      encoding: "utf8",
    });
    if (lift.status !== 0) throw new Error(lift.stderr || lift.stdout || "lift failed");
  }

  const emit = spawnSync(process.execPath, [emitCwlScript, fixture, "--origin", origin], {
    cwd: scriptRoot,
    encoding: "utf8",
  });
  if (emit.status !== 0) throw new Error(emit.stderr || emit.stdout || "cwl emit failed");

  const cwlPath = join(fixture, "generated/cwl/routes.cwl");
  const { createCwlRuntime, loadModuleFromCwlFile } = await loadRuntime(scriptRoot);
  const module = loadModuleFromCwlFile(cwlPath, scriptRoot);
  const runtime = createCwlRuntime({ module });
  const inProcessFetch = async (url, init) => {
    const href = typeof url === "string" ? url : url.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const resp = await runtime.fetch({ url: href, method, headers: init?.headers ?? {} });
    if (resp.status === 204) {
      return new Response(null, { status: 204, headers: resp.headers });
    }
    return resp;
  };

  const webirPath = join(fixture, ".chrysalis", `hub.${origin}.webir.json`);
  const webirMod = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const mod = webirMod.moduleFromGoldenSnapshot(parseHubWebirGoldenFile(await readFile(webirPath, "utf8")));
  const routes = listHubWebRoutes(mod);
  const probeRoutes = routes.map((r) => ({
    method: r.method,
    path: concreteProbePath(r.path),
  }));

  const corpus = await probeHubGoldCorpus({
    routes: probeRoutes,
    middlewarePresets: new Set(),
    inProcessFetch,
    fixture,
    corpusId: "hub-cwl-probe",
  });

  const outcomes = await replayCorpus(corpus, {
    baseUrl: "http://127.0.0.1",
    injectDeterminismHeaders: true,
    fetch: inProcessFetch,
  });
  const report = buildReport(outcomes);
  const correctness = report.aggregate?.correctness ?? 0;
  return {
    kind: "chrysalis.hub.trace-replay",
    schemaVersion: 0,
    fixture,
    origin,
    emitTarget: target,
    routeCount: routes.length,
    traceCount: corpus.traces.length,
    correctness,
    ok: correctness >= 1,
    report,
    suiteId: suite.id ?? `${origin}-cwl`,
  };
}
