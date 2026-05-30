#!/usr/bin/env node
/**
 * Node/Express oracle spike (Phase 4 / G103): record smoke + hub literal gold path.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const nodeSmoke = join(scriptRoot, "packages/oracle-node/record-smoke.mjs");
const outNdjson = join(scriptRoot, "reports/ci/hub-oracle-node-spike.ndjson");
const literalFixture = join(scriptRoot, "fixtures/hub-gold-js-literal");
const flagshipFixture = join(scriptRoot, "fixtures/hub-flagship-express");

// v3: express flagship verify replay cross-check (G199).
export const HUB_NODE_ORACLE_SPIKE_KIND = "chrysalis.hub.node-oracle-spike";
export const HUB_NODE_ORACLE_SPIKE_SCHEMA_VERSION = 3;

function runJson(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return { status: r.status ?? 1, stdout: r.stdout, stderr: r.stderr };
}

function liftFixture(fixture) {
  const lift = runJson(join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs"), [
    fixture,
    "--language",
    "javascript",
  ]);
  if (lift.status !== 0) return { ok: false, holeCount: null, routeCount: null };
  try {
    const report = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");
    return {
      ok: report.holeCount === 0,
      holeCount: report.holeCount ?? null,
      routeCount: report.routeCount ?? null,
    };
  } catch {
    return { ok: false, holeCount: null, routeCount: null };
  }
}

async function flagshipProjection() {
  const webirPath = join(flagshipFixture, ".chrysalis", "hub.javascript.webir.json");
  if (!existsSync(webirPath)) return null;
  const { summarizeCwlProjection } = await import(
    pathToFileURL(join(scriptRoot, "scripts/hub-ingest/hub-webir-routes.mjs")).href
  );
  const webir = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const raw = JSON.parse(readFileSync(webirPath, "utf8"));
  return summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
}

async function main() {
  const recorderOk = existsSync(nodeSmoke) ? runJson(nodeSmoke, [outNdjson]).status === 0 : false;

  const literalLift = liftFixture(literalFixture);
  const flagshipLift = liftFixture(flagshipFixture);
  const projection = await flagshipProjection();
  const projectionOk =
    projection !== null && projection.total > 0 && projection.holeFree === projection.total;

  let expressVerify = { ok: false, skip: "not-run" };
  try {
    const { runNodeExpressOracleVerify } = await import("./hub-node-express-oracle-verify.mjs");
    expressVerify = await runNodeExpressOracleVerify();
  } catch {
    expressVerify = { ok: false, skip: "express-verify-threw" };
  }
  const expressVerifyOk = expressVerify.ok === true;

  const report = {
    kind: HUB_NODE_ORACLE_SPIKE_KIND,
    schemaVersion: HUB_NODE_ORACLE_SPIKE_SCHEMA_VERSION,
    ok: recorderOk && literalLift.ok && flagshipLift.ok && projectionOk && expressVerifyOk,
    nodeRecorder: { ok: recorderOk, script: "packages/oracle-node/record-smoke.mjs", out: outNdjson },
    expressLiteralLift: {
      ok: literalLift.ok,
      fixture: "fixtures/hub-gold-js-literal",
      holeCount: literalLift.holeCount,
    },
    expressFlagship: {
      ok: flagshipLift.ok && projectionOk,
      fixture: "fixtures/hub-flagship-express",
      script: "pnpm run hub:express-flagship",
      routeCount: flagshipLift.routeCount,
      holeCount: flagshipLift.holeCount,
      cwlProjection: projection,
    },
    expressOracleVerify: {
      ok: expressVerifyOk,
      correctness: expressVerify.correctness ?? null,
      skip: expressVerify.skip ?? null,
      script: "pnpm run hub:node-express-oracle-verify",
    },
    generatedAt: new Date().toISOString(),
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
