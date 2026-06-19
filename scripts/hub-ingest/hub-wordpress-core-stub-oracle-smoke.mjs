#!/usr/bin/env node
/** WordPress core stub oracle smoke (G6224). */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runWordPressVerticalCoreStubOracleGate } from "./hub-cwl-fullstack-gates.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @param {Record<string, unknown>} [opts] */
export async function runWordPressCoreStubOracleSmoke(opts = {}) {
  const progress = createSmokeProgress("wordpress-core-stub-oracle");
  const t0 = progress.start("WordPress core stub oracle");
  const gate = await runWordPressVerticalCoreStubOracleGate(opts);
  if (gate.ok === true) {
    const corpusPath = resolve(scriptRoot, "fixtures/wordpress-core-stub/chrysalis.oracle-corpus.json");
    const existing = JSON.parse(readFileSync(corpusPath, "utf8"));
    const updated = {
      ...existing,
      routeCount: gate.routeCount ?? existing.routeCount,
      traceCount: gate.traceCount ?? existing.traceCount,
      correctness: gate.correctness ?? 1,
      capturedAt: new Date().toISOString(),
    };
    writeFileSync(corpusPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  }
  progress.end("WordPress core stub oracle", gate.ok === true, t0);
  return {
    kind: "chrysalis.hub.wordpress-core-stub-oracle-smoke",
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  runWordPressCoreStubOracleSmoke()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exit(report.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
