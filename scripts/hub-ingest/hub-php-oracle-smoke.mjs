#!/usr/bin/env node
/**
 * Hub ↔ core PHP oracle boundary: Chrysalis ingest on tiny-blog (no hub lift).
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");
const tinyBlog = join(scriptRoot, "fixtures/tiny-blog");

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

function main() {
  if (!existsSync(cliBin)) {
    console.log(
      JSON.stringify({
        kind: "chrysalis.hub.php-oracle-smoke",
        schemaVersion: 1,
        ok: true,
        skip: "no-cli-dist",
        ingestOk: false,
        routeCount: null,
      }),
    );
    return;
  }
  if (!existsSync(tinyBlog)) {
    console.log(
      JSON.stringify({
        kind: "chrysalis.hub.php-oracle-smoke",
        schemaVersion: 1,
        ok: false,
        skip: "no-tiny-blog",
        ingestOk: false,
        routeCount: null,
      }),
    );
    process.exit(1);
  }
  if (!phpOnPath()) {
    console.log(
      JSON.stringify({
        kind: "chrysalis.hub.php-oracle-smoke",
        schemaVersion: 1,
        ok: true,
        skip: "no-php",
        ingestOk: false,
        routeCount: null,
        phpAvailable: false,
      }),
    );
    return;
  }

  const progress = join(tinyBlog, ".chrysalis", "ingest.progress");
  const r = spawnSync(
    process.execPath,
    [cliBin, "ingest", tinyBlog, "--ingest-progress-file", progress],
    { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  const ingestOk = r.status === 0;
  const routeCount = ingestOk ? countFixtureRoutes(tinyBlog) : 0;
  const ok = ingestOk && routeCount > 0;
  console.log(
    JSON.stringify(
      {
        kind: "chrysalis.hub.php-oracle-smoke",
        schemaVersion: 1,
        ok,
        skip: ok ? null : "ingest-failed",
        ingestOk,
        routeCount,
        phpAvailable: true,
        fixture: "fixtures/tiny-blog",
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
