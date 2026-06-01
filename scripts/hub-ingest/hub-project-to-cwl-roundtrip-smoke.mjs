#!/usr/bin/env node
/** project-to-CWL export → migration.cwl → CWL re-lift route-surface roundtrip (G561). */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportOriginToCwl } from "./hub-project-to-cwl-all-origins.mjs";
import { CWL_ORIGIN_FIXTURES, resolveCwlOriginFixturePath, CWL_ORIGIN_FIXTURES_ROOT } from "./hub-cwl-origin-fixtures.mjs";

export const HUB_PROJECT_TO_CWL_ROUNDTRIP_KIND = "chrysalis.hub.project-to-cwl-roundtrip-smoke";
export const HUB_PROJECT_TO_CWL_ROUNDTRIP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

function parseLiftJson(stdout) {
  const text = (stdout ?? "").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return {};
      }
    }
  }
  return {};
}

export async function runProjectToCwlRoundtripSmoke() {
  const results = [];
  let ok = true;
  for (const fixture of CWL_ORIGIN_FIXTURES) {
    const origin = fixture.id;
    const src = resolveCwlOriginFixturePath(fixture, CWL_ORIGIN_FIXTURES_ROOT);
    if (!existsSync(src)) {
      results.push({ origin, ok: true, skip: "missing-fixture" });
      continue;
    }
    const tmp = mkdtempSync(join(tmpdir(), `chrysalis-project-cwl-rt-${origin}-`));
    try {
      cpSync(src, tmp, { recursive: true });
      const exported = await exportOriginToCwl(
        {
          id: origin,
          origin: fixture.origin,
          rel: ".",
          requireHoleFree: fixture.requireHoleFree,
          minRoutes: fixture.minRoutes,
        },
        tmp,
      );
      const exportedRoutes = exported.routeCount ?? 0;
      const exportOk = exported.ok === true && exportedRoutes >= (fixture.minRoutes ?? 1);
      if (!exportOk) {
        ok = false;
        results.push({ origin, ok: false, skip: "cwl-export-failed", exportedRoutes });
        continue;
      }
      const lift = spawnSync(
        process.execPath,
        [liftScript, join(tmp, ".chrysalis"), "--language", "cwl"],
        { cwd: scriptRoot, encoding: "utf8" },
      );
      const liftReport = parseLiftJson(lift.stdout);
      const roundRoutes = liftReport.routeCount ?? 0;
      const roundOk = lift.status === 0 && roundRoutes === exportedRoutes;
      if (!roundOk) ok = false;
      results.push({
        origin,
        ok: roundOk,
        exportedRoutes,
        roundRoutes,
        roundHoleCount: liftReport.holeCount ?? null,
        exportHoleCount: exported.holeCount ?? null,
      });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  return {
    kind: HUB_PROJECT_TO_CWL_ROUNDTRIP_KIND,
    schemaVersion: HUB_PROJECT_TO_CWL_ROUNDTRIP_SCHEMA_VERSION,
    ok,
    originCount: CWL_ORIGIN_FIXTURES.length,
    results,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runProjectToCwlRoundtripSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
