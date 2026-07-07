#!/usr/bin/env node
/**
 * Trace replay for hub asset emit targets (route-manifest oracle).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildReport, replayCorpus } from "../../packages/verify/dist/index.js";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { hubWebirPath } from "./shared.mjs";
import { runAssetGoldEmit } from "./hub-gold-asset-emit.mjs";
import { probeHubGoldCorpus } from "./hub-verify-probe-corpus.mjs";
import { parseHubWebirGoldenFile } from "./hub-webir-golden-walk.mjs";
import { listHubWebRoutes } from "./hub-webir-routes.mjs";
import {
  concreteProbePath,
  createAssetManifestInProcessFetch,
  writeProbeRoutes,
} from "./hub-gold-asset-fetch.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

/**
 * @param {import('./hub-gold-manifest.mjs').HUB_GOLD_SUITES[number]} suite
 */
export async function runAssetTraceReplaySuite(suite) {
  const fixture = suite.fixture;
  const origin = suite.origin;
  const target = suite.emitTarget;

  if (origin === "php") {
    const phpExport = await exportPhpHubWebir(fixture);
    if (phpExport.skip || !phpExport.ok) {
      throw new Error(phpExport.skip ?? `php-export-holes:${phpExport.holeCount}`);
    }
  } else if (origin === "cwl") {
    const webirPath = hubWebirPath(fixture, origin);
    if (!existsSync(webirPath)) {
      const cwlPath = join(fixture, "routes.cwl");
      const snapshot = await exportCwlFileToWebirJson(cwlPath);
      mkdirSync(join(fixture, ".chrysalis"), { recursive: true });
      writeFileSync(
        webirPath,
        typeof snapshot === "string" ? snapshot : `${JSON.stringify(snapshot, null, 2)}\n`,
        "utf8",
      );
    }
  } else {
    const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", origin], {
      cwd: scriptRoot,
      encoding: "utf8",
    });
    if (lift.status !== 0) throw new Error(lift.stderr || lift.stdout || "lift failed");
  }

  const emit = runAssetGoldEmit(fixture, origin, target);
  if (emit.status !== 0) throw new Error(emit.stderr || emit.stdout || "asset emit failed");

  const webirPath = join(fixture, ".chrysalis", `hub.${origin}.webir.json`);
  const webirMod = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const mod = webirMod.moduleFromGoldenSnapshot(parseHubWebirGoldenFile(await readFile(webirPath, "utf8")));
  const routes = listHubWebRoutes(mod);
  const probeRoutes = routes.map((r) => ({
    method: r.method,
    path: concreteProbePath(r.path),
  }));
  await writeProbeRoutes(fixture, probeRoutes);

  const inProcessFetch = createAssetManifestInProcessFetch(scriptRoot, fixture, target);
  const corpus = await probeHubGoldCorpus({
    routes: probeRoutes,
    middlewarePresets: new Set(),
    inProcessFetch,
    fixture,
    corpusId: "hub-asset-manifest-probe",
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
    suiteId: suite.id,
  };
}
