#!/usr/bin/env node
/**
 * Canonical PHP oracle micro-fixture metadata (G176).
 * The micro surface is fixtures/tiny-blog — ingest, hono/fastify/nextjs emit, verify.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ORACLE_MICRO_FIXTURE = "fixtures/tiny-blog";
export const HUB_ORACLE_MICRO_KIND = "chrysalis.hub.oracle-micro-fixture";
export const HUB_ORACLE_MICRO_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {string} [fixtureRel]
 */
export function buildOracleMicroFixtureReport(fixtureRel = ORACLE_MICRO_FIXTURE) {
  const fixturePath = join(scriptRoot, fixtureRel);
  let routeCount = 0;
  const routesPath = join(fixturePath, "chrysalis.routes.json");
  if (existsSync(routesPath)) {
    try {
      const j = JSON.parse(readFileSync(routesPath, "utf8"));
      routeCount = Array.isArray(j.routes) ? j.routes.length : 0;
    } catch {
      routeCount = 0;
    }
  }
  return {
    kind: HUB_ORACLE_MICRO_KIND,
    schemaVersion: HUB_ORACLE_MICRO_SCHEMA_VERSION,
    fixture: fixtureRel,
    fixturePath,
    exists: existsSync(fixturePath),
    routeCount,
    verifyContract: {
      ingest: "chrysalis ingest",
      emit: ["hono", "fastify", "nextjs"],
      verify: "migration-debt + hub-php-nextjs-verify trace replay",
    },
    env: "CHRYSALIS_ORACLE_MICRO_FIXTURE",
    doc: "docs/CAPABILITY-MATRIX.md",
    smokeScript: "pnpm run hub:php-oracle-smoke",
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  console.log(JSON.stringify(buildOracleMicroFixtureReport(), null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
