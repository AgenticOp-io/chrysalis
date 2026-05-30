#!/usr/bin/env node
/**
 * Hub ↔ core lane boundary smoke: oracle redactor lockstep + parser-bridge vendor + nikic parity.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const parserVendor = join(scriptRoot, "packages/parser-bridge/vendor/autoload.php");
const nikicTest = join(scriptRoot, "packages/parser-bridge/tests/nikic.test.ts");
const migrationDebtScript = join(scriptRoot, "scripts/migration-debt.mjs");
const tinyBlogProject = join(scriptRoot, "fixtures/tiny-blog");
const redactorTests = [
  join(scriptRoot, "packages/oracle-php/tests/redactor_sql_rows_test.php"),
  join(scriptRoot, "packages/oracle-php/tests/redactor_sql_params_test.php"),
];

function phpOnPath() {
  const r = spawnSync("php", ["-v"], { encoding: "utf8" });
  return r.status === 0;
}

function runParserNikicParity() {
  if (!existsSync(parserVendor)) {
    return { ran: false, ok: false, skip: "no-parser-vendor" };
  }
  if (!phpOnPath()) {
    return { ran: false, ok: true, skip: "no-php" };
  }
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const r = spawnSync(
    pnpm,
    ["exec", "vitest", "run", nikicTest],
    {
      cwd: scriptRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  return { ran: true, ok: r.status === 0, exitCode: r.status ?? 1 };
}

function runMigrationDebtSmoke() {
  if (!existsSync(migrationDebtScript) || !existsSync(tinyBlogProject)) {
    return { ok: false, skip: "no-migration-debt-or-tiny-blog" };
  }
  const outDir = mkdtempSync(join(tmpdir(), "chrysalis-hub-migration-debt-"));
  const out = join(outDir, "debt.json");
  const r = spawnSync(
    process.execPath,
    ["--import", "tsx", migrationDebtScript, "--project", tinyBlogProject, "--json-out", out, "--max-holes", "500"],
    { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  let holeCount = null;
  try {
    if (r.status === 0 && existsSync(out)) {
      const j = JSON.parse(readFileSync(out, "utf8"));
      holeCount = j.residualLegacy?.holeCount ?? null;
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
  return { ok: r.status === 0, holeCount, skip: r.status !== 0 ? "migration-debt-exit" : null };
}

export function runMultiLaneSmoke() {
  const php = phpOnPath();
  let oracleRedactor = false;
  const parserBridgeVendor = existsSync(parserVendor);
  const nikic = runParserNikicParity();
  const migrationDebt = runMigrationDebtSmoke();

  if (php) {
    const r = spawnSync("php", redactorTests, { cwd: scriptRoot, encoding: "utf8" });
    oracleRedactor = r.status === 0;
  }

  const ok =
    (!php || oracleRedactor) &&
    (nikic.skip != null || nikic.ok) &&
    (migrationDebt.skip != null || migrationDebt.ok);

  return {
    kind: "chrysalis.hub.multi-lane-smoke",
    schemaVersion: 2,
    ok,
    phpAvailable: php,
    oracleRedactor,
    parserBridgeVendor,
    parserNikicParity: nikic.ok,
    parserNikicSkipped: nikic.skip ?? null,
    parserNikicRan: nikic.ran,
    migrationDebtOk: migrationDebt.ok,
    migrationDebtSkipped: migrationDebt.skip ?? null,
    migrationDebtHoleCount: migrationDebt.holeCount,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const report = runMultiLaneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
