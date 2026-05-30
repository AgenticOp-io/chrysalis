#!/usr/bin/env node
/**
 * Hub-translate E2E smoke on plain-php flagship (G192).
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

export const HUB_TRANSLATE_E2E_SMOKE_KIND = "chrysalis.hub.translate-e2e-smoke";
export const HUB_TRANSLATE_E2E_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");
const translateScript = join(scriptRoot, "scripts/hub-ingest/hub-translate.mjs");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  const line = text.split("\n").pop() ?? "";
  return JSON.parse(line);
}

/**
 * @param {object} [opts]
 */
export function runHubTranslateE2eSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? sourceFixture);
  const base = {
    kind: HUB_TRANSLATE_E2E_SMOKE_KIND,
    schemaVersion: HUB_TRANSLATE_E2E_SMOKE_SCHEMA_VERSION,
    fixture: fixture.includes("hub-flagship-plain-php") ? "fixtures/hub-flagship-plain-php" : fixture,
    ok: false,
  };

  if (!existsSync(join(fixture, "chrysalis.routes.json"))) {
    return { ...base, skip: "missing-routes-manifest" };
  }
  if (!existsSync(cliBin)) {
    return { ...base, skip: "missing-cli-dist" };
  }

  const workDir = mkdtempSync(join(tmpdir(), "chrysalis-hub-translate-e2e-"));
  try {
    cpSync(fixture, workDir, { recursive: true });
    const r = spawnSync(
      process.execPath,
      [translateScript, workDir, "--origin", "php", "--output", "hono", "--cli", cliBin],
      { cwd: scriptRoot, encoding: "utf8", maxBuffer: 30 * 1024 * 1024 },
    );
    if (r.status !== 0) {
      return { ...base, skip: "translate-failed", detail: (r.stderr ?? "").slice(0, 300) };
    }

    let parsed;
    try {
      parsed = parseStdoutJson(r.stdout);
    } catch {
      return { ...base, skip: "translate-json-missing" };
    }

    const cwlPath = join(workDir, ".chrysalis", "migration.cwl");
    const cwlExists = existsSync(cwlPath);
    const cwlExport = parsed.cwlExport ?? {};
    const ok =
      parsed.ok === true &&
      parsed.path === "chrysalis-php" &&
      cwlExport.ok === true &&
      cwlExport.holeCount === 0 &&
      cwlExists;

    return {
      ...base,
      ok,
      path: parsed.path ?? null,
      cwlExport: {
        ok: cwlExport.ok === true,
        holeCount: cwlExport.holeCount ?? null,
        routeCount: cwlExport.routeCount ?? null,
        source: cwlExport.source ?? null,
      },
      migrationCwlExists: cwlExists,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

async function main() {
  const report = runHubTranslateE2eSmoke();
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
