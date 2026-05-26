#!/usr/bin/env node
/**
 * Smoke: lift-to-webir for every hub web origin language (fixture per language).
 * Usage: node scripts/hub-ingest/hub-matrix-smoke.mjs [--root fixtures/hub-pattern-lift]
 */
import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_WEB_ORIGIN_LANGUAGE_IDS } from "./language-catalog.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

function parseArgs(argv) {
  let root = join(scriptRoot, "fixtures/hub-pattern-lift");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) root = resolve(argv[++i]);
  }
  return { root };
}

async function existsDir(p) {
  try {
    await access(p, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { root } = parseArgs(process.argv);
  const results = [];

  for (const lang of HUB_WEB_ORIGIN_LANGUAGE_IDS) {
    if (lang === "php") continue;
    const dir = join(root, lang);
    if (!(await existsDir(dir))) {
      results.push({ language: lang, ok: false, skip: "no fixture dir" });
      continue;
    }
    const r = spawnSync(process.execPath, [liftScript, dir, "--language", lang], {
      cwd: scriptRoot,
      encoding: "utf8",
    });
    let report = {};
    try {
      report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
    } catch {
      report = {};
    }
    const ok = r.status === 0 && (report.routeCount ?? 0) > 0;
    results.push({
      language: lang,
      ok,
      routeCount: report.routeCount ?? 0,
      astRouteCount: report.astRouteCount ?? 0,
      holeCount: report.holeCount ?? 0,
    });
  }

  const failed = results.filter((r) => !r.ok && !r.skip);
  const skipped = results.filter((r) => r.skip);
  const passed = results.filter((r) => r.ok);

  console.log(
    JSON.stringify(
      {
        kind: "chrysalis.hub.matrix-smoke",
        schemaVersion: 0,
        root,
        passed: passed.length,
        failed: failed.length,
        skipped: skipped.length,
        results,
      },
      null,
      2,
    ),
  );

  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
