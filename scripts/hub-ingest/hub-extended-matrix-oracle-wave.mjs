#!/usr/bin/env node
/** Shared extended-matrix wave gate — reads charter waveN config. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLanguageReadinessReport } from "../chrysalis-hub-store.mjs";
import { describeHubGoldPairCoverage } from "./hub-gold-coverage.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const EXTENDED_MATRIX_CHARTER_PATH = join(
  scriptRoot,
  "fixtures/hub-extended-matrix-oracle/chrysalis.extended-matrix-charter.v1.json",
);

/** @param {string} waveKey e.g. "wave1" | "wave2" */
export function loadExtendedMatrixWaveCharter(waveKey = "wave1") {
  if (!existsSync(EXTENDED_MATRIX_CHARTER_PATH)) return null;
  const charter = JSON.parse(readFileSync(EXTENDED_MATRIX_CHARTER_PATH, "utf8"));
  const wave = charter[waveKey];
  if (!wave || typeof wave !== "object") return null;
  return { charter, wave, waveKey };
}

/** @param {string} waveKey */
export function runExtendedMatrixOracleWaveGate(waveKey = "wave1") {
  const loaded = loadExtendedMatrixWaveCharter(waveKey);
  if (!loaded) return { ok: false, skip: "missing-charter-or-wave", waveKey };
  const { wave } = loaded;
  const originSet = new Set(wave.originIds ?? []);
  const outputSet = new Set(wave.outputIds ?? []);
  const minOracle = wave.minOraclePairs ?? 24;
  const report = buildLanguageReadinessReport();
  const wavePairs = (report.pairs ?? []).filter(
    (p) => originSet.has(p.origin) && outputSet.has(p.output) && p.origin !== p.output,
  );
  let oracleInWave = 0;
  /** @type {Array<{ origin: string, output: string }>} */
  const oraclePairs = [];
  for (const p of wavePairs) {
    const cov = describeHubGoldPairCoverage(p.origin, p.output);
    if ((cov.traceReplaySuiteIds?.length ?? 0) > 0) {
      oracleInWave += 1;
      oraclePairs.push({ origin: p.origin, output: p.output });
    }
  }
  const ok = wavePairs.length > 0 && oracleInWave >= minOracle;
  return {
    ok,
    waveKey,
    waveId: wave.id ?? waveKey,
    waveLabel: wave.label ?? waveKey,
    wavePairCount: wavePairs.length,
    oracleInWave,
    minOracle,
    oraclePairs: oraclePairs.slice(0, 12),
    generatedAt: new Date().toISOString(),
  };
}
