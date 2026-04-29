#!/usr/bin/env node
/**
 * One-screen migration debt summary from `chrysalis status --json`.
 * Forwards argv (minus this script) to `chrysalis status` (must include `--project`).
 *
 * Optional **`--json-out <path>`** or **`--json-out=<path>`** writes a small summary
 * artifact (same fields as the human view, plus **`generatedAt`**) for CI or trends.
 *
 *   node scripts/migration-debt.mjs --project fixtures/tiny-blog [--traces traces] ...
 *   node scripts/migration-debt.mjs --project fixtures/tiny-blog --json-out reports/migration-debt.json
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = resolve(ROOT, "packages/cli/src/bin.ts");

/** @param {string[]} argv */
function stripJsonOut(argv) {
  const forward = [...argv];
  let jsonPath = null;
  for (let i = 0; i < forward.length; i++) {
    const a = forward[i];
    if (a === "--json-out") {
      jsonPath = forward[i + 1];
      if (!jsonPath) {
        console.error("migration-debt: --json-out requires a path");
        process.exit(2);
      }
      forward.splice(i, 2);
      break;
    }
    if (a.startsWith("--json-out=")) {
      jsonPath = a.slice("--json-out=".length);
      if (!jsonPath) {
        console.error("migration-debt: --json-out= requires a non-empty path");
        process.exit(2);
      }
      forward.splice(i, 1);
      break;
    }
  }
  return { forward, jsonPath };
}

const argv = process.argv.slice(2);
const { forward, jsonPath } = stripJsonOut(argv);
const pi = forward.indexOf("--project");
if (pi < 0 || !forward[pi + 1]) {
  console.error(
    "usage: node scripts/migration-debt.mjs --project <php-root> [--json-out <path> | --json-out=<path>] [...optional chrysalis status args]",
  );
  process.exit(2);
}

const r = spawnSync(process.execPath, ["--import", "tsx", CLI, "status", "--json", ...forward], {
  cwd: ROOT,
  encoding: "utf8",
});
if (r.error) {
  console.error(r.error);
  process.exit(1);
}
if ((r.status ?? 1) !== 0) {
  process.stderr.write(r.stderr || "");
  process.stdout.write(r.stdout || "");
  process.exit(r.status ?? 1);
}

let s;
try {
  s = JSON.parse((r.stdout ?? "").trim());
} catch {
  console.error("migration-debt: expected JSON from chrysalis status --json");
  process.exit(1);
}

console.log("migration debt (from chrysalis status --json)");
console.log("────────────────────────────────────────────");

if (s.corpus) {
  console.log(`corpus:        ${s.corpus.traces} traces, ${s.corpus.routes} routes`);
} else {
  console.log("corpus:        (none)");
}

if (s.correctness) {
  const c = s.correctness;
  const pct = (c.aggregate * 100).toFixed(1);
  console.log(`correctness:   ${pct}%  (${c.framesPassed}/${c.framesTotal} frames)`);
} else {
  console.log("correctness:   (none — run chrysalis verify)");
}

if (s.residualLegacy) {
  const rL = s.residualLegacy;
  console.log(`holes (ingest): ${rL.holeCount}`);
  if (typeof rL.dynamicNewHoleCount === "number" && rL.dynamicNewHoleCount > 0) {
    console.log(`  dynamic new: ${rL.dynamicNewHoleCount}`);
  }
  if (typeof rL.dynamicNewWebIrCount === "number" && rL.dynamicNewWebIrCount > 0) {
    console.log(`  WebIR __new_dynamic sites: ${rL.dynamicNewWebIrCount}`);
  }
} else {
  console.log("holes (ingest): (none — need --project)");
}

const m = s.migration;
if (m) {
  if (m.coverage?.authHoles != null) {
    console.log(`auth ingest holes (count): ${m.coverage.authHoles}`);
  }
  if (m.authEmitHoleMax != null) {
    console.log(`auth emit hole max:        ${m.authEmitHoleMax}`);
  }
  if (m.authIngestHoleMax != null) {
    console.log(`auth ingest hole max:      ${m.authIngestHoleMax}`);
  }
}

if (s.oracleFootprint?.routes?.length) {
  console.log(`oracle routes: ${s.oracleFootprint.routes.length} (see status --json oracleFootprint)`);
}

if (jsonPath) {
  const abs = resolve(ROOT, jsonPath);
  mkdirSync(dirname(abs), { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    corpus: s.corpus ?? null,
    correctness: s.correctness ?? null,
    residualLegacy: s.residualLegacy ?? null,
    migration: s.migration ?? null,
    oracleFootprintRouteCount: Array.isArray(s.oracleFootprint?.routes)
      ? s.oracleFootprint.routes.length
      : 0,
  };
  writeFileSync(abs, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log("");
  console.log(`wrote JSON summary: ${abs}`);
}
