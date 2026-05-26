#!/usr/bin/env node
/**
 * Lift + emit + in-process trace replay oracle for hub gold JS literal fixture.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const emitScript = join(scriptRoot, "scripts/hub-ingest/emit-from-hub.mjs");
const workerScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-replay-worker.mjs");

function parseArgs(argv) {
  let fixture = join(scriptRoot, "fixtures/hub-gold-js-literal");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--fixture" && argv[i + 1]) fixture = resolve(argv[++i]);
  }
  return { fixture };
}

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  return JSON.parse(text.slice(start, end + 1));
}

async function main() {
  const { fixture } = parseArgs(process.argv);
  for (const [script, args] of [
    [liftScript, [fixture, "--language", "javascript"]],
    [emitScript, [fixture, "--origin", "javascript", "--target", "hono"]],
  ]) {
    const r = spawnSync(process.execPath, [script, ...args], { cwd: scriptRoot, encoding: "utf8" });
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout);
      process.exit(1);
    }
  }

  const honoDir = join(fixture, "generated", "hono");
  if (!existsSync(join(honoDir, "node_modules", "hono"))) {
    const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
    const inst = spawnSync(npmCmd, ["install", "--no-audit", "--no-fund", "--prefer-offline"], {
      cwd: honoDir,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (inst.status !== 0) {
      console.error(inst.stderr || inst.stdout);
      process.exit(1);
    }
  }

  const replay = spawnSync(
    process.execPath,
    ["--import", "tsx", workerScript, fixture],
    { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  if (replay.status !== 0) {
    console.error(replay.stderr || replay.stdout);
    process.exit(1);
  }
  const report = parseStdoutJson(replay.stdout);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
