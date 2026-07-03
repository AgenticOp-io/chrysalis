#!/usr/bin/env node
/** Shared lift + footprint gate for hub native origin fixtures. */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

function parseLiftStdout(stdout) {
  const line = stdout.trim().split("\n").pop() ?? "{}";
  return JSON.parse(line);
}

/**
 * @param {object} opts
 * @param {string} opts.fixtureRel
 * @param {string} opts.language
 * @param {number} [opts.minRoutes]
 * @param {string} [opts.sourceFile] — relative path inside fixture for bridge parse smoke
 */
export async function runHubNativeLiftGate(opts) {
  const { fixtureRel, language, minRoutes = 2, sourceFile } = opts;
  const fixture = join(scriptRoot, fixtureRel);
  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", language], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return { ok: false, skip: "lift-failed", stderr: lift.stderr?.slice(0, 400) };
  }
  let report;
  try {
    report = parseLiftStdout(lift.stdout);
  } catch {
    return { ok: false, skip: "lift-json" };
  }
  const holeCount = report.holeCount ?? 1;
  const routeCount = report.routeCount ?? 0;
  const webirPath = join(fixture, `.chrysalis/hub.${language}.webir.json`);
  let footprintOk = false;
  try {
    const webir = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
    const mod = webir.moduleFromGoldenSnapshot(JSON.parse(readFileSync(webirPath, "utf8")));
    footprintOk = webir.computeOracleFootprint(mod).totalHoleCount === 0;
  } catch {
    footprintOk = false;
  }
  return {
    ok: holeCount === 0 && routeCount >= minRoutes && footprintOk,
    holeCount,
    routeCount,
    footprintOk,
    fixtureRel,
    ...(sourceFile ? { sourceFile } : {}),
  };
}

/**
 * @param {object} opts
 * @param {string} opts.gateId
 * @param {() => unknown} opts.parseSample
 * @param {string} opts.parseExportName
 */
export async function runHubNativeBridgeAdapterGate(opts) {
  const bridge = await import(pathToFileURL(join(scriptRoot, "packages/hub-native-bridge/dist/index.js")).href);
  const ingest = await import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  const sample = opts.parseSample();
  const bridgeOk = Array.isArray(sample) && sample.length >= 1;
  const adapterOk = typeof ingest[opts.parseExportName] === "function";
  return { bridgeOk, adapterOk, gateId: opts.gateId, sampleRouteCount: Array.isArray(sample) ? sample.length : 0 };
}
