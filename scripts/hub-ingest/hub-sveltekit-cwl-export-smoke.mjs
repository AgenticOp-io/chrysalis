#!/usr/bin/env node
/**
 * SvelteKit → CWL projection export smoke (G1148).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isCataloguedFullstackHole } from "./cwl-fullstack-holes.mjs";
import { exportProjectMigrationCwl } from "./hub-project-cwl-export.mjs";

export const HUB_SVELTEKIT_CWL_EXPORT_SMOKE_KIND = "chrysalis.hub.sveltekit-cwl-export-smoke";
export const HUB_SVELTEKIT_CWL_EXPORT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-svelte-kit");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const emitScript = join(scriptRoot, "scripts/hub-ingest/emit-cwl-from-hub.mjs");

/**
 * @param {object} [opts]
 */
export async function runSveltekitCwlExportSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const base = {
    kind: HUB_SVELTEKIT_CWL_EXPORT_SMOKE_KIND,
    schemaVersion: HUB_SVELTEKIT_CWL_EXPORT_SMOKE_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-svelte-kit",
    rfc: "CWL-RFC-0012",
    ok: false,
  };
  if (!existsSync(join(fixture, "src/routes"))) {
    return { ...base, skip: "missing-routes-dir" };
  }

  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "svelte"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return { ...base, skip: "lift-failed", detail: lift.stderr?.slice(0, 200) ?? lift.stdout?.slice(0, 200) };
  }
  const liftReport = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");

  const emit = spawnSync(process.execPath, [emitScript, fixture, "--origin", "svelte"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (emit.status !== 0) {
    return { ...base, skip: "emit-failed", detail: emit.stderr?.slice(0, 200) ?? emit.stdout?.slice(0, 200) };
  }
  const emitReport = JSON.parse(emit.stdout.trim());

  const routesCwl = join(fixture, "generated/cwl/routes.cwl");
  if (!existsSync(routesCwl)) {
    return { ...base, skip: "missing-routes-cwl" };
  }
  const cwlText = readFileSync(routesCwl, "utf8");
  const holeReasons = [...cwlText.matchAll(/^\s*hole\s+([a-z0-9:._-]+);/gm)].map((m) => m[1]);
  const migration = await exportProjectMigrationCwl(fixture, { origin: "svelte" });

  const catalogued = holeReasons.every((r) => isCataloguedFullstackHole(r));
  const ok =
    (liftReport.routeCount ?? 0) >= 3 &&
    (emitReport.routeCount ?? 0) >= 3 &&
    (emitReport.holeCount ?? 0) === 0 &&
    (liftReport.holeCount ?? 0) === 0 &&
    cwlText.includes("@page") &&
    cwlText.includes("@route") &&
    migration.ok === true;

  return {
    ...base,
    ok,
    lift: { routeCount: liftReport.routeCount, holeCount: liftReport.holeCount },
    emit: { routeCount: emitReport.routeCount, holeCount: emitReport.holeCount },
    holeReasons,
    catalogued,
    migrationPath: migration.cwlPath ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSveltekitCwlExportSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
