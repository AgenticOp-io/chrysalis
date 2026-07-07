#!/usr/bin/env node
/**
 * Trace replay for hub native emit targets (python Flask first).
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildReport, replayCorpus } from "../../packages/verify/dist/index.js";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { isHubNativeGoldEmitTarget, runNativeGoldEmit } from "./hub-gold-native-emit.mjs";
import { probeHubGoldCorpus } from "./hub-verify-probe-corpus.mjs";
import { parseHubWebirGoldenFile } from "./hub-webir-golden-walk.mjs";
import { listHubWebRoutes } from "./hub-webir-routes.mjs";
import {
  concreteProbePath,
  createPythonFlaskInProcessFetch,
  writePythonProbeRoutes,
} from "./hub-gold-python-fetch.mjs";
import {
  createJavaSpringInProcessFetch,
  writeProbeRoutes as writeJavaProbeRoutes,
} from "./hub-gold-java-fetch.mjs";
import {
  createGoGinInProcessFetch,
  writeProbeRoutes as writeGoProbeRoutes,
} from "./hub-gold-go-fetch.mjs";
import {
  createRubySinatraInProcessFetch,
  writeProbeRoutes as writeRubyProbeRoutes,
} from "./hub-gold-ruby-fetch.mjs";
import {
  createCsharpAspNetInProcessFetch,
  writeProbeRoutes as writeCsharpProbeRoutes,
} from "./hub-gold-csharp-fetch.mjs";
import {
  createPhpHubInProcessFetch,
  writePhpProbeRoutes,
} from "./hub-gold-php-fetch.mjs";
import {
  createRustActixInProcessFetch,
  writeProbeRoutes as writeRustProbeRoutes,
} from "./hub-gold-rust-fetch.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

/**
 * @param {import('./hub-gold-manifest.mjs').HUB_GOLD_SUITES[number]} suite
 */
export async function runNativeTraceReplaySuite(suite) {
  const fixture = suite.fixture;
  const origin = suite.origin;
  const target = suite.emitTarget;
  if (!isHubNativeGoldEmitTarget(target)) {
    throw new Error(`not a native emit target: ${target}`);
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

  const emit = runNativeGoldEmit(fixture, origin, target);
  if (emit.status !== 0) throw new Error(emit.stderr || emit.stdout || "native emit failed");

  if (target === "python") {
    return runPythonFlaskTraceReplay(fixture, origin, target, suite.id);
  }
  if (target === "java") {
    return runJavaSpringTraceReplay(fixture, origin, target, suite.id);
  }
  if (target === "go") {
    return runGoGinTraceReplay(fixture, origin, target, suite.id);
  }
  if (target === "ruby") {
    return runRubySinatraTraceReplay(fixture, origin, target, suite.id);
  }
  if (target === "csharp") {
    return runCsharpAspNetTraceReplay(fixture, origin, target, suite.id);
  }
  if (target === "php") {
    return runPhpHubTraceReplay(fixture, origin, target, suite.id);
  }
  if (target === "rust") {
    return runRustActixTraceReplay(fixture, origin, target, suite.id);
  }
  throw new Error(`native trace replay not implemented for ${target}`);
}

/**
 * @param {string} fixture
 * @param {string} origin
 * @param {string} target
 * @param {string} [suiteId]
 */
async function runPythonFlaskTraceReplay(fixture, origin, target, suiteId) {
  const webirPath = join(fixture, ".chrysalis", `hub.${origin}.webir.json`);
  const webirMod = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const mod = webirMod.moduleFromGoldenSnapshot(parseHubWebirGoldenFile(await readFile(webirPath, "utf8")));
  const routes = listHubWebRoutes(mod);
  const probeRoutes = routes.map((r) => ({
    method: r.method,
    path: concreteProbePath(r.path),
  }));
  await writePythonProbeRoutes(fixture, probeRoutes, scriptRoot);

  const inProcessFetch = createPythonFlaskInProcessFetch(scriptRoot, fixture);
  const corpus = await probeHubGoldCorpus({
    routes: probeRoutes,
    middlewarePresets: new Set(),
    inProcessFetch,
    fixture,
    corpusId: "hub-native-python-probe",
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
    suiteId: suiteId ?? `${origin}-native-${target}`,
  };
}

/**
 * @param {string} fixture
 * @param {string} origin
 * @param {string} target
 * @param {string} [suiteId]
 */
async function runJavaSpringTraceReplay(fixture, origin, target, suiteId) {
  const webirPath = join(fixture, ".chrysalis", `hub.${origin}.webir.json`);
  const webirMod = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const mod = webirMod.moduleFromGoldenSnapshot(parseHubWebirGoldenFile(await readFile(webirPath, "utf8")));
  const routes = listHubWebRoutes(mod);
  const probeRoutes = routes.map((r) => ({
    method: r.method,
    path: concreteProbePath(r.path),
  }));
  await writeJavaProbeRoutes(fixture, probeRoutes);

  const inProcessFetch = createJavaSpringInProcessFetch(scriptRoot, fixture);
  const corpus = await probeHubGoldCorpus({
    routes: probeRoutes,
    middlewarePresets: new Set(),
    inProcessFetch,
    fixture,
    corpusId: "hub-native-java-probe",
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
    suiteId: suiteId ?? `${origin}-native-${target}`,
  };
}

/**
 * @param {string} fixture
 * @param {string} origin
 * @param {string} target
 * @param {string} [suiteId]
 */
async function runGoGinTraceReplay(fixture, origin, target, suiteId) {
  const webirPath = join(fixture, ".chrysalis", `hub.${origin}.webir.json`);
  const webirMod = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const mod = webirMod.moduleFromGoldenSnapshot(parseHubWebirGoldenFile(await readFile(webirPath, "utf8")));
  const routes = listHubWebRoutes(mod);
  const probeRoutes = routes.map((r) => ({
    method: r.method,
    path: concreteProbePath(r.path),
  }));
  await writeGoProbeRoutes(fixture, probeRoutes);

  const inProcessFetch = createGoGinInProcessFetch(scriptRoot, fixture);
  const corpus = await probeHubGoldCorpus({
    routes: probeRoutes,
    middlewarePresets: new Set(),
    inProcessFetch,
    fixture,
    corpusId: "hub-native-go-probe",
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
    suiteId: suiteId ?? `${origin}-native-${target}`,
  };
}

/**
 * @param {string} fixture
 * @param {string} origin
 * @param {string} target
 * @param {string} [suiteId]
 */
async function runRubySinatraTraceReplay(fixture, origin, target, suiteId) {
  const webirPath = join(fixture, ".chrysalis", `hub.${origin}.webir.json`);
  const webirMod = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const mod = webirMod.moduleFromGoldenSnapshot(parseHubWebirGoldenFile(await readFile(webirPath, "utf8")));
  const routes = listHubWebRoutes(mod);
  const probeRoutes = routes.map((r) => ({
    method: r.method,
    path: concreteProbePath(r.path),
  }));
  await writeRubyProbeRoutes(fixture, probeRoutes);

  const inProcessFetch = createRubySinatraInProcessFetch(scriptRoot, fixture);
  const corpus = await probeHubGoldCorpus({
    routes: probeRoutes,
    middlewarePresets: new Set(),
    inProcessFetch,
    fixture,
    corpusId: "hub-native-ruby-probe",
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
    suiteId: suiteId ?? `${origin}-native-${target}`,
  };
}

/**
 * @param {string} fixture
 * @param {string} origin
 * @param {string} target
 * @param {string} [suiteId]
 */
async function runCsharpAspNetTraceReplay(fixture, origin, target, suiteId) {
  const webirPath = join(fixture, ".chrysalis", `hub.${origin}.webir.json`);
  const webirMod = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const mod = webirMod.moduleFromGoldenSnapshot(parseHubWebirGoldenFile(await readFile(webirPath, "utf8")));
  const routes = listHubWebRoutes(mod);
  const probeRoutes = routes.map((r) => ({
    method: r.method,
    path: concreteProbePath(r.path),
  }));
  await writeCsharpProbeRoutes(fixture, probeRoutes);

  const inProcessFetch = createCsharpAspNetInProcessFetch(scriptRoot, fixture);
  const corpus = await probeHubGoldCorpus({
    routes: probeRoutes,
    middlewarePresets: new Set(),
    inProcessFetch,
    fixture,
    corpusId: "hub-native-csharp-probe",
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
    suiteId: suiteId ?? `${origin}-native-${target}`,
  };
}

/**
 * @param {string} fixture
 * @param {string} origin
 * @param {string} target
 * @param {string} [suiteId]
 */
async function runPhpHubTraceReplay(fixture, origin, target, suiteId) {
  const webirPath = join(fixture, ".chrysalis", `hub.${origin}.webir.json`);
  const webirMod = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const mod = webirMod.moduleFromGoldenSnapshot(parseHubWebirGoldenFile(await readFile(webirPath, "utf8")));
  const routes = listHubWebRoutes(mod);
  const probeRoutes = routes.map((r) => ({
    method: r.method,
    path: concreteProbePath(r.path),
  }));
  await writePhpProbeRoutes(fixture, probeRoutes);

  const inProcessFetch = createPhpHubInProcessFetch(scriptRoot, fixture);
  const corpus = await probeHubGoldCorpus({
    routes: probeRoutes,
    middlewarePresets: new Set(),
    inProcessFetch,
    fixture,
    corpusId: "hub-native-php-probe",
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
    suiteId: suiteId ?? `${origin}-native-${target}`,
  };
}

/**
 * @param {string} fixture
 * @param {string} origin
 * @param {string} target
 * @param {string} [suiteId]
 */
async function runRustActixTraceReplay(fixture, origin, target, suiteId) {
  const webirPath = join(fixture, ".chrysalis", `hub.${origin}.webir.json`);
  const webirMod = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const mod = webirMod.moduleFromGoldenSnapshot(parseHubWebirGoldenFile(await readFile(webirPath, "utf8")));
  const routes = listHubWebRoutes(mod);
  const probeRoutes = routes.map((r) => ({
    method: r.method,
    path: concreteProbePath(r.path),
  }));
  await writeRustProbeRoutes(fixture, probeRoutes);

  const inProcessFetch = createRustActixInProcessFetch(scriptRoot, fixture);
  const corpus = await probeHubGoldCorpus({
    routes: probeRoutes,
    middlewarePresets: new Set(),
    inProcessFetch,
    fixture,
    corpusId: "hub-native-rust-probe",
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
    suiteId: suiteId ?? `${origin}-native-${target}`,
  };
}
