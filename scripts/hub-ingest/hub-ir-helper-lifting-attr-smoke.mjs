#!/usr/bin/env node
/** IR helper attribute metadata smoke — attr-lib + attr-class (G2288/G2289 v2). */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_IR_HELPER_LIFTING_ATTR_KIND = "chrysalis.hub.ir-helper-lifting-attr-smoke";
export const HUB_IR_HELPER_LIFTING_ATTR_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

const FIXTURES = [
  { id: "attr-lib", path: join(scriptRoot, "fixtures/lift-helper-attr-lib") },
  { id: "attr-class", path: join(scriptRoot, "fixtures/lift-helper-attr-class") },
];

function fixtureRel(absPath) {
  const root = scriptRoot.endsWith("\\") || scriptRoot.endsWith("/") ? scriptRoot : scriptRoot + "/";
  const normalized = absPath.replace(/\\/g, "/");
  const rootNorm = root.replace(/\\/g, "/");
  if (normalized.startsWith(rootNorm)) {
    return normalized.slice(rootNorm.length);
  }
  return normalized;
}

function ingestFixture(fixturePath) {
  const r = spawnSync(process.execPath, [cliBin, "ingest", fixturePath], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const holesMatch = (r.stdout ?? "").match(/^holes:\s+(\d+)/m);
  const holesAfter = holesMatch ? Number(holesMatch[1]) : null;
  return {
    ok: (r.status ?? 1) === 0 && holesAfter === 0,
    exitCode: r.status ?? 1,
    holesAfter,
  };
}

export function runIrHelperLiftingAttrSmoke() {
  if (!existsSync(cliBin)) {
    return {
      kind: HUB_IR_HELPER_LIFTING_ATTR_KIND,
      schemaVersion: HUB_IR_HELPER_LIFTING_ATTR_SCHEMA_VERSION,
      ok: false,
      skip: "no-cli-bin",
      fixture: "fixtures/lift-helper-attr-lib",
      fixtures: FIXTURES.map((f) => ({ id: f.id, fixture: fixtureRel(f.path), ok: false, skip: "no-cli-bin" })),
      generatedAt: new Date().toISOString(),
    };
  }
  const results = FIXTURES.map((f) => {
    const run = ingestFixture(f.path);
    return {
      id: f.id,
      fixture: fixtureRel(f.path),
      ...run,
    };
  });
  const ok = results.every((r) => r.ok);
  return {
    kind: HUB_IR_HELPER_LIFTING_ATTR_KIND,
    schemaVersion: HUB_IR_HELPER_LIFTING_ATTR_SCHEMA_VERSION,
    ok,
    fixture: "fixtures/lift-helper-attr-lib",
    fixtures: results,
    exitCode: ok ? 0 : (results.find((r) => !r.ok)?.exitCode ?? 1),
    holesAfter: results.find((r) => r.id === "attr-lib")?.holesAfter ?? null,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const report = runIrHelperLiftingAttrSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
