#!/usr/bin/env node
/** Smoke: hub emit runtime-cwl scaffold on gold fixtures (G9200). */
import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const EMIT_RUNTIME_CWL_SMOKE_KIND = "chrysalis.hub.emit-runtime-cwl-smoke";
export const EMIT_RUNTIME_CWL_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const emitScript = join(scriptRoot, "scripts/hub-ingest/emit-runtime-cwl-from-hub.mjs");

const FIXTURES = [
  { fixture: "fixtures/hub-gold-cwl", origin: "cwl" },
  { fixture: "fixtures/tiny-blog", origin: "php" },
];

async function existsDir(p) {
  try {
    await access(p, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function runEmitRuntimeCwlSmoke() {
  const results = [];
  for (const { fixture, origin } of FIXTURES) {
    const dir = join(scriptRoot, fixture);
    if (!(await existsDir(dir))) {
      results.push({ fixture, origin, ok: false, skip: "missing-fixture" });
      continue;
    }
    const r = spawnSync(process.execPath, [emitScript, dir, "--origin", origin], {
      cwd: scriptRoot,
      encoding: "utf8",
    });
    let report = {};
    try {
      report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
    } catch {
      report = {};
    }
    results.push({
      fixture,
      origin,
      ok: r.status === 0 && (report.routeCount ?? 0) > 0,
      routeCount: report.routeCount ?? 0,
      holeCount: report.holeCount ?? 0,
    });
  }
  const ok = results.every((row) => row.ok === true || row.skip);
  return {
    kind: EMIT_RUNTIME_CWL_SMOKE_KIND,
    schemaVersion: EMIT_RUNTIME_CWL_SMOKE_SCHEMA_VERSION,
    ok,
    results,
    generatedAt: new Date().toISOString(),
  };
}

export async function runEmitRuntimeCwlSmokeCli() {
  const progress = createSmokeProgress("emit-runtime-cwl");
  const t0 = progress.start("Emit runtime-cwl scaffold (G9200)");
  const gate = await runEmitRuntimeCwlSmoke();
  progress.end("Emit runtime-cwl scaffold (G9200)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runEmitRuntimeCwlSmokeCli();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-emit-runtime-cwl-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
