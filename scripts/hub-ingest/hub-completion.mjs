#!/usr/bin/env node
/**
 * Hub matrix completion gate: matrix smoke + gold verify + route grade summary.
 * Usage: node scripts/hub-ingest/hub-completion.mjs [--json-out reports/ci/hub-completion.json]
 */
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_ROUTES, INPUT_LANGUAGES, OUTPUT_LANGUAGES } from "../chrysalis-hub-store.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  return { jsonOut };
}

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("no JSON object in subprocess stdout");
  }
}

function runJson(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  let parsed = {};
  try {
    parsed = parseStdoutJson(r.stdout);
  } catch {
    parsed = {};
  }
  return { status: r.status ?? 1, parsed, stderr: r.stderr };
}

function summarizeRouteGrades() {
  const counts = { gold: 0, silver: 0, open: 0 };
  for (const src of INPUT_LANGUAGES) {
    for (const out of OUTPUT_LANGUAGES) {
      if (src.id === out.id) continue;
      const g = HUB_ROUTES[`${src.id}:${out.id}`]?.grade ?? "open";
      if (g === "gold") counts.gold += 1;
      else if (g === "silver") counts.silver += 1;
      else counts.open += 1;
    }
  }
  return counts;
}

async function main() {
  const { jsonOut } = parseArgs(process.argv);
  const matrix = runJson(join(scriptRoot, "scripts/hub-ingest/hub-matrix-smoke.mjs"), []);
  const gold = runJson(join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs"), []);
  const routeGrades = summarizeRouteGrades();
  const ok =
    matrix.status === 0 &&
    (matrix.parsed.failed ?? 1) === 0 &&
    gold.status === 0 &&
    gold.parsed.ok === true;

  const report = {
    kind: "chrysalis.hub.completion",
    schemaVersion: 0,
    ok,
    matrixSmoke: {
      passed: matrix.parsed.passed ?? 0,
      failed: matrix.parsed.failed ?? 0,
      skipped: matrix.parsed.skipped ?? 0,
    },
    goldVerify: { ok: gold.parsed.ok === true },
    routeGrades,
    generatedAt: new Date().toISOString(),
  };

  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
