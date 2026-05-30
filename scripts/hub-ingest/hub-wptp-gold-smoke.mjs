#!/usr/bin/env node
/**
 * WPTP contract-first gold smoke: any origin with OpenAPI → hono compose when wptp-matrix sibling exists.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_WPTP_GOLD_SMOKE_KIND = "chrysalis.hub.wptp-gold-smoke";
export const HUB_WPTP_GOLD_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-contract-first");
const composeScript = join(scriptRoot, "scripts/hub-ingest/wptp-compose-site.mjs");
const matrixRoot = process.env.WPTP_MATRIX_ROOT ?? join(scriptRoot, "..", "wptp-matrix");

export function runWptpGoldSmoke() {
  if (!existsSync(composeScript)) {
    return { kind: HUB_WPTP_GOLD_SMOKE_KIND, schemaVersion: HUB_WPTP_GOLD_SMOKE_SCHEMA_VERSION, ok: false, skip: "no-compose-script" };
  }
  if (!existsSync(matrixRoot)) {
    return {
      kind: HUB_WPTP_GOLD_SMOKE_KIND,
      schemaVersion: HUB_WPTP_GOLD_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: "no-wptp-matrix",
      matrixRoot,
    };
  }

  const r = spawnSync(
    process.execPath,
    [composeScript, fixture, "--output", "hono", "--origin", "python"],
    {
      cwd: scriptRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        CHRYSALIS_ROOT: scriptRoot,
        WPTP_MATRIX_ROOT: matrixRoot,
        WPTP_EMIT_NEXTJS_ROOT: process.env.WPTP_EMIT_NEXTJS_ROOT ?? join(scriptRoot, "..", "wptp-emit-nextjs"),
      },
    },
  );
  return {
    kind: HUB_WPTP_GOLD_SMOKE_KIND,
    schemaVersion: HUB_WPTP_GOLD_SMOKE_SCHEMA_VERSION,
    ok: r.status === 0,
    matrixRoot,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const report = runWptpGoldSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
