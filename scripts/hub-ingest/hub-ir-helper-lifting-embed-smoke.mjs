#!/usr/bin/env node
/** IR helper embed smoke on lift-helper-lift-twin (B4 depth, G981). */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_IR_HELPER_LIFTING_EMBED_KIND = "chrysalis.hub.ir-helper-lifting-embed-smoke";
export const HUB_IR_HELPER_LIFTING_EMBED_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/lift-helper-lift-twin");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

export function runIrHelperLiftingEmbedSmoke() {
  if (!existsSync(cliBin)) {
    return {
      kind: HUB_IR_HELPER_LIFTING_EMBED_KIND,
      schemaVersion: HUB_IR_HELPER_LIFTING_EMBED_SCHEMA_VERSION,
      ok: false,
      skip: "no-cli-bin",
      fixture: "fixtures/lift-helper-lift-twin",
      generatedAt: new Date().toISOString(),
    };
  }
  const r = spawnSync(
    process.execPath,
    [cliBin, "ingest", fixture, "--ingest-embed-shared-helper-bodies", "--ingest-dedupe-structural-subgraphs"],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  const holesMatch = (r.stdout ?? "").match(/^holes:\s+(\d+)/m);
  const holesAfter = holesMatch ? Number(holesMatch[1]) : null;
  return {
    kind: HUB_IR_HELPER_LIFTING_EMBED_KIND,
    schemaVersion: HUB_IR_HELPER_LIFTING_EMBED_SCHEMA_VERSION,
    ok: (r.status ?? 1) === 0 && holesAfter === 0,
    fixture: "fixtures/lift-helper-lift-twin",
    exitCode: r.status ?? 1,
    holesAfter,
    flags: ["--ingest-embed-shared-helper-bodies"],
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const report = runIrHelperLiftingEmbedSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
