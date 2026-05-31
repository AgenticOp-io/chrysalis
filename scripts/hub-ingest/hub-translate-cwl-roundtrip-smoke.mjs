#!/usr/bin/env node
/** hub-translate → migration.cwl → CWL re-lift roundtrip for all 23 origins (G533). */
import { spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CWL_ORIGIN_FIXTURES, resolveCwlOriginFixturePath, CWL_ORIGIN_FIXTURES_ROOT } from "./hub-cwl-origin-fixtures.mjs";

export const HUB_TRANSLATE_CWL_ROUNDTRIP_KIND = "chrysalis.hub.translate-cwl-roundtrip-smoke";
export const HUB_TRANSLATE_CWL_ROUNDTRIP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const translateScript = join(scriptRoot, "scripts/hub-ingest/hub-translate.mjs");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

function parseTranslateJson(stdout) {
  const lines = stdout.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (parsed.origin && parsed.cwlExport) return parsed;
    } catch {
      /* continue */
    }
  }
  return null;
}

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

export function runHubTranslateCwlRoundtripSmoke() {
  const results = [];
  let ok = true;
  for (const fixture of CWL_ORIGIN_FIXTURES) {
    const origin = fixture.id;
    const src = resolveCwlOriginFixturePath(fixture, CWL_ORIGIN_FIXTURES_ROOT);
    const tmp = mkdtempSync(join(tmpdir(), `chrysalis-translate-cwl-rt-${origin}-`));
    try {
      cpSync(src, tmp, { recursive: true });
      const tr = spawnSync(
        process.execPath,
        [translateScript, tmp, "--origin", origin, "--output", "hono"],
        {
          cwd: scriptRoot,
          encoding: "utf8",
          env: { ...process.env, CHRYSALIS_HUB_PREFER_WPTP: "0" },
          maxBuffer: 20 * 1024 * 1024,
        },
      );
      const parsed = parseTranslateJson(tr.stdout ?? "");
      const exportedRoutes = parsed?.cwlExport?.routeCount ?? 0;
      const exportOk = parsed?.cwlExport?.ok === true && exportedRoutes >= 1;
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
        exportHoleCount: parsed?.cwlExport?.holeCount ?? null,
        source: parsed?.cwlExport?.source ?? null,
      });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  return {
    kind: HUB_TRANSLATE_CWL_ROUNDTRIP_KIND,
    schemaVersion: HUB_TRANSLATE_CWL_ROUNDTRIP_SCHEMA_VERSION,
    ok,
    originCount: CWL_ORIGIN_FIXTURES.length,
    results,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runHubTranslateCwlRoundtripSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
