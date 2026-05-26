#!/usr/bin/env node
/**
 * Smoke native hub emitters (kotlin/scala/swift + existing native targets).
 */
import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

const NATIVE_EMITS = [
  { language: "python", output: "python", emit: "emit-python-from-hub.mjs" },
  { language: "java", output: "java", emit: "emit-java-from-hub.mjs" },
  { language: "go", output: "go", emit: "emit-go-from-hub.mjs" },
  { language: "ruby", output: "ruby", emit: "emit-ruby-from-hub.mjs" },
  { language: "csharp", output: "csharp", emit: "emit-csharp-from-hub.mjs" },
  { language: "rust", output: "rust", emit: "emit-rust-from-hub.mjs" },
  { language: "kotlin", output: "kotlin", emit: "emit-kotlin-from-hub.mjs" },
  { language: "scala", output: "scala", emit: "emit-scala-from-hub.mjs" },
  { language: "swift", output: "swift", emit: "emit-swift-from-hub.mjs" },
];

async function existsDir(p) {
  try {
    await access(p, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const root = join(scriptRoot, "fixtures/hub-pattern-lift");
  const results = [];

  for (const { language, output, emit } of NATIVE_EMITS) {
    const dir = join(root, language);
    if (!(await existsDir(dir))) {
      results.push({ language, output, ok: false, skip: "no fixture" });
      continue;
    }
    const lift = spawnSync(process.execPath, [liftScript, dir, "--language", language], {
      cwd: scriptRoot,
      encoding: "utf8",
    });
    if (lift.status !== 0) {
      results.push({ language, output, ok: false, stage: "lift" });
      continue;
    }
    const emitR = spawnSync(
      process.execPath,
      [join(scriptRoot, "scripts/hub-ingest", emit), dir, "--origin", language],
      { cwd: scriptRoot, encoding: "utf8" },
    );
    let report = {};
    try {
      report = JSON.parse(emitR.stdout.trim().split("\n").pop() ?? "{}");
    } catch {
      report = {};
    }
    results.push({
      language,
      output,
      ok: emitR.status === 0 && (report.routeCount ?? 0) > 0,
      routeCount: report.routeCount ?? 0,
      holeCount: report.holeCount ?? 0,
    });
  }

  const failed = results.filter((r) => !r.ok && !r.skip);
  console.log(
    JSON.stringify(
      {
        kind: "chrysalis.hub.native-emit-smoke",
        schemaVersion: 0,
        passed: results.filter((r) => r.ok).length,
        failed: failed.length,
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
