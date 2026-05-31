#!/usr/bin/env node
/** hub-translate CWL coverage: lift path exports migration.cwl for all 23 origins (G524). */
import { spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CWL_ORIGIN_FIXTURES, resolveCwlOriginFixturePath, CWL_ORIGIN_FIXTURES_ROOT } from "./hub-cwl-origin-fixtures.mjs";

export const HUB_TRANSLATE_CWL_COVERAGE_KIND = "chrysalis.hub.translate-cwl-coverage-smoke";
export const HUB_TRANSLATE_CWL_COVERAGE_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const translateScript = join(scriptRoot, "scripts/hub-ingest/hub-translate.mjs");

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

export function runHubTranslateCwlCoverageSmoke() {
  const results = [];
  let ok = true;
  for (const fixture of CWL_ORIGIN_FIXTURES) {
    const origin = fixture.id;
    const src = resolveCwlOriginFixturePath(fixture, CWL_ORIGIN_FIXTURES_ROOT);
    const tmp = mkdtempSync(join(tmpdir(), `chrysalis-translate-cwl-${origin}-`));
    try {
      cpSync(src, tmp, { recursive: true });
      const r = spawnSync(
        process.execPath,
        [translateScript, tmp, "--origin", origin, "--output", "hono"],
        {
          cwd: scriptRoot,
          encoding: "utf8",
          env: { ...process.env, CHRYSALIS_HUB_PREFER_WPTP: "0" },
          maxBuffer: 20 * 1024 * 1024,
        },
      );
      const parsed = parseTranslateJson(r.stdout ?? "");
      const cwlOk = parsed?.cwlExport?.ok === true && (parsed.cwlExport?.routeCount ?? 0) >= 1;
      if (!cwlOk) ok = false;
      results.push({
        origin,
        ok: cwlOk,
        routeCount: parsed?.cwlExport?.routeCount ?? null,
        source: parsed?.cwlExport?.source ?? null,
      });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  return {
    kind: HUB_TRANSLATE_CWL_COVERAGE_KIND,
    schemaVersion: HUB_TRANSLATE_CWL_COVERAGE_SCHEMA_VERSION,
    ok,
    originCount: CWL_ORIGIN_FIXTURES.length,
    results,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runHubTranslateCwlCoverageSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
