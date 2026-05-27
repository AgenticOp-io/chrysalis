#!/usr/bin/env node
/**
 * Hub ↔ core PHP oracle boundary: Chrysalis ingest + emit + verify status on tiny-blog.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");
const migrationDebtScript = join(scriptRoot, "scripts/migration-debt.mjs");
const tinyBlog = join(scriptRoot, "fixtures/tiny-blog");
const verifyReport = join(scriptRoot, "fixtures/ci/tiny-blog-verify-for-status");
const honoOut = join(tinyBlog, "generated", "hono");

function phpOnPath() {
  const r = spawnSync("php", ["-v"], { encoding: "utf8" });
  return r.status === 0;
}

function countFixtureRoutes(projectDir) {
  const routesPath = join(projectDir, "chrysalis.routes.json");
  if (!existsSync(routesPath)) return 0;
  try {
    const j = JSON.parse(readFileSync(routesPath, "utf8"));
    return Array.isArray(j.routes) ? j.routes.length : 0;
  } catch {
    return 0;
  }
}

function runMigrationDebtVerify() {
  if (!existsSync(migrationDebtScript) || !existsSync(verifyReport)) {
    return { ok: false, skip: "no-verify-report" };
  }
  const r = spawnSync(
    process.execPath,
    [migrationDebtScript, "--project", tinyBlog, "--report", verifyReport, "--min-correctness", "1"],
    { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  return { ok: r.status === 0, skip: r.status === 0 ? null : "verify-correctness-failed" };
}

function main() {
  const base = {
    kind: "chrysalis.hub.php-oracle-smoke",
    schemaVersion: 2,
    fixture: "fixtures/tiny-blog",
    ingestOk: false,
    emitHonoOk: false,
    verifyOk: false,
    routeCount: null,
    phpAvailable: phpOnPath(),
  };

  if (!existsSync(cliBin)) {
    console.log(JSON.stringify({ ...base, ok: true, skip: "no-cli-dist" }, null, 2));
    return;
  }
  if (!existsSync(tinyBlog)) {
    console.log(JSON.stringify({ ...base, ok: false, skip: "no-tiny-blog" }, null, 2));
    process.exit(1);
  }
  if (!phpOnPath()) {
    console.log(JSON.stringify({ ...base, ok: true, skip: "no-php" }, null, 2));
    return;
  }

  const progress = join(tinyBlog, ".chrysalis", "ingest.progress");
  const ingest = spawnSync(
    process.execPath,
    [cliBin, "ingest", tinyBlog, "--ingest-progress-file", progress],
    { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  const ingestOk = ingest.status === 0;
  const routeCount = ingestOk ? countFixtureRoutes(tinyBlog) : 0;

  let emitHonoOk = false;
  if (ingestOk) {
    const emit = spawnSync(
      process.execPath,
      [cliBin, "emit", tinyBlog, "--out", honoOut, "--target", "hono"],
      { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
    );
    emitHonoOk = emit.status === 0 && existsSync(honoOut);
  }

  const verify = ingestOk && emitHonoOk ? runMigrationDebtVerify() : { ok: false, skip: "skipped-before-verify" };
  const verifyOk = verify.ok === true;

  const ok = ingestOk && routeCount > 0 && emitHonoOk && verifyOk;
  console.log(
    JSON.stringify(
      {
        ...base,
        ok,
        skip: ok ? null : verify.skip ?? (ingestOk ? (emitHonoOk ? "verify-failed" : "emit-failed") : "ingest-failed"),
        ingestOk,
        emitHonoOk,
        verifyOk,
        routeCount,
        verifySkipped: verify.skip ?? null,
      },
      null,
      2,
    ),
  );
  if (!ok) process.exit(1);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
