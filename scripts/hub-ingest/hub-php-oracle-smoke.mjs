#!/usr/bin/env node
/**
 * Hub ↔ core PHP oracle boundary: Chrysalis ingest + emit (hono/fastify/nextjs) + verify on tiny-blog.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");
const migrationDebtScript = join(scriptRoot, "scripts/migration-debt.mjs");
const exportWebirScript = join(scriptRoot, "scripts/hub-ingest/export-project-webir.mjs");
const exportBundleScript = join(scriptRoot, "scripts/export-webir-bundle.mjs");
const emitNextjsScript = join(scriptRoot, "scripts/emit-webir-bundle-nextjs.mjs");
const tinyBlog = join(scriptRoot, "fixtures/tiny-blog");
const verifyReport = join(scriptRoot, "fixtures/ci/tiny-blog-verify-for-status");

const EMIT_TARGETS = ["hono", "fastify"];

function phpOnPath() {
  const r = spawnSync("php", ["-v"], { encoding: "utf8" });
  return r.status === 0;
}

function wptpEmitNextjsAvailable() {
  const root = resolve(process.env.WPTP_EMIT_NEXTJS_ROOT ?? join(scriptRoot, "..", "wptp-emit-nextjs"));
  return existsSync(join(root, "package.json"));
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

function tryEmitNextjs(projectDir) {
  if (!wptpEmitNextjsAvailable()) {
    return { ok: false, skip: "no-wptp-emit-nextjs" };
  }
  const webirOut = join(projectDir, ".chrysalis", "ingested.webir.json");
  const bundleOut = join(projectDir, ".chrysalis", "ingested.webir.bundle.json");
  const out = join(projectDir, "generated", "nextjs");
  const exportR = spawnSync(process.execPath, [exportWebirScript, projectDir, "--out", webirOut], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (exportR.status !== 0) {
    return { ok: false, skip: "export-webir-failed" };
  }
  const bundleR = spawnSync(process.execPath, [exportBundleScript, "--in", webirOut, "--out", bundleOut], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (bundleR.status !== 0) {
    return { ok: false, skip: "export-bundle-failed" };
  }
  const emitR = spawnSync(process.execPath, [emitNextjsScript, "--bundle", bundleOut, "--out", out], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return { ok: emitR.status === 0 && existsSync(out), skip: emitR.status === 0 ? null : "nextjs-emit-failed" };
}

function main() {
  const base = {
    kind: "chrysalis.hub.php-oracle-smoke",
    schemaVersion: 4,
    fixture: "fixtures/tiny-blog",
    ingestOk: false,
    emit: {},
    verifyOk: false,
    routeCount: null,
    phpAvailable: phpOnPath(),
    wptpEmitNextjsAvailable: wptpEmitNextjsAvailable(),
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

  /** @type {Record<string, boolean>} */
  const emit = {};
  if (ingestOk) {
    for (const target of EMIT_TARGETS) {
      const out = join(tinyBlog, "generated", target);
      const r = spawnSync(
        process.execPath,
        [cliBin, "emit", tinyBlog, "--out", out, "--target", target],
        { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
      );
      emit[target] = r.status === 0 && existsSync(out);
    }
  }

  const emitHonoOk = emit.hono === true;
  const emitFastifyOk = emit.fastify === true;
  const nextjs = ingestOk ? tryEmitNextjs(tinyBlog) : { ok: false, skip: "skipped-before-nextjs" };
  const emitNextjsOk = nextjs.ok === true;
  emit.nextjs = emitNextjsOk;

  const verify =
    ingestOk && emitHonoOk && emitFastifyOk ? runMigrationDebtVerify() : { ok: false, skip: "skipped-before-verify" };
  const verifyOk = verify.ok === true;

  const ok = ingestOk && routeCount > 0 && emitHonoOk && emitFastifyOk && verifyOk;
  console.log(
    JSON.stringify(
      {
        ...base,
        ok,
        skip: ok ? null : verify.skip ?? (ingestOk ? "emit-or-verify-failed" : "ingest-failed"),
        ingestOk,
        emit,
        emitHonoOk,
        emitFastifyOk,
        emitNextjsOk,
        nextjsSkipped: nextjs.skip ?? null,
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

main();
