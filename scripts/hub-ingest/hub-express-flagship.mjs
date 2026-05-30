#!/usr/bin/env node
/**
 * Express 10-route flagship smoke (G110/G161): lift, emit parity, OpenAPI export.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";
import { runNodeExpressOracleVerify } from "./hub-node-express-oracle-verify.mjs";

export const HUB_EXPRESS_FLAGSHIP_KIND = "chrysalis.hub.express-flagship";
// v3: emit parity hono=fastify=nextjs + optional live oracle depth (G161).
export const HUB_EXPRESS_FLAGSHIP_SCHEMA_VERSION = 3;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-flagship-express");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const goldVerifyScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs");
const traceReplayScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-trace-replay.mjs");

function runJson(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return { status: r.status ?? 1, stdout: r.stdout, stderr: r.stderr };
}

function runEmitParitySuites(suitePrefix) {
  /** @type {Record<string, boolean>} */
  const gold = {};
  /** @type {Record<string, boolean>} */
  const traceReplay = {};
  let emitParityOk = true;
  for (const target of ["hono", "fastify", "nextjs"]) {
    const suite = `${suitePrefix}-${target}`;
    const g = runJson(goldVerifyScript, ["--suite", suite]);
    const tr = runJson(traceReplayScript, ["--suite", suite]);
    gold[target] = g.status === 0;
    traceReplay[target] = tr.status === 0;
    if (g.status !== 0 || tr.status !== 0) emitParityOk = false;
  }
  return { gold, traceReplay, emitParityOk };
}

async function main() {
  const lift = runJson(liftScript, [fixture, "--language", "javascript"]);
  let liftOk = false;
  let routeCount = null;
  let holeCount = null;
  if (lift.status === 0) {
    try {
      const report = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");
      routeCount = report.routeCount ?? null;
      holeCount = report.holeCount ?? null;
      liftOk = report.holeCount === 0 && report.routeCount === 20;
    } catch {
      liftOk = false;
    }
  }

  let cwlProjection = null;
  const webirPath = join(fixture, ".chrysalis", "hub.javascript.webir.json");
  if (existsSync(webirPath)) {
    try {
      const { summarizeCwlProjection } = await import(
        pathToFileURL(join(scriptRoot, "scripts/hub-ingest/hub-webir-routes.mjs")).href
      );
      const webir = await import(
        pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href
      );
      const raw = JSON.parse(readFileSync(webirPath, "utf8"));
      cwlProjection = summarizeCwlProjection(webir.moduleFromGoldenSnapshot(raw));
    } catch {
      cwlProjection = null;
    }
  }

  const emitParity = runEmitParitySuites("express-flagship");

  let nodeOracle = null;
  if (process.env.CHRYSALIS_HUB_EXPRESS_ORACLE === "1") {
    try {
      nodeOracle = await runNodeExpressOracleVerify();
    } catch (e) {
      nodeOracle = { ok: false, skip: "oracle-threw", detail: e instanceof Error ? e.message : String(e) };
    }
  }

  let openapiExport = null;
  try {
    openapiExport = await exportProjectOpenApi(fixture, { origin: "javascript" });
  } catch {
    openapiExport = { ok: false, reason: "openapi-export-failed" };
  }

  const oracleOk = nodeOracle === null || nodeOracle.ok === true || Boolean(nodeOracle.skip);

  const report = {
    kind: HUB_EXPRESS_FLAGSHIP_KIND,
    schemaVersion: HUB_EXPRESS_FLAGSHIP_SCHEMA_VERSION,
    ok:
      liftOk &&
      emitParity.emitParityOk &&
      oracleOk &&
      openapiExport?.ok === true &&
      existsSync(openapiExport.openapiPath ?? ""),
    fixture: "fixtures/hub-flagship-express",
    lift: { ok: liftOk, routeCount, holeCount },
    cwlProjection,
    gold: emitParity.gold,
    traceReplay: emitParity.traceReplay,
    emitParity: { ok: emitParity.emitParityOk, targets: ["hono", "fastify", "nextjs"] },
    nodeOracle,
    openapi: openapiExport,
    generatedAt: new Date().toISOString(),
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
