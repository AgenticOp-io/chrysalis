#!/usr/bin/env node
/**
 * One-screen migration debt summary from `chrysalis status --json`.
 * Forwards argv (minus script-only flags) to `chrysalis status` (must include `--project`).
 *
 * Script-only flags (stripped before `status`):
 *   --json-out <path> | --json-out=<path>   write compact JSON summary
 *   --max-holes <n>     exit 4 if residualLegacy.holeCount > n (requires residualLegacy in JSON)
 *   --min-correctness <0..1>  exit 4 if correctness.aggregate < value (requires correctness in JSON)
 *
 *   node scripts/migration-debt.mjs --project fixtures/tiny-blog --json-out reports/migration-debt.json
 *   node scripts/migration-debt.mjs --project fixtures/tiny-blog --max-holes 50 --min-correctness 0.5
 *
 * `--json-out` writes **`kind`**, **`schemaVersion`**, **`toolVersion`** (repo root package.json) plus
 * status slices — same machine-consumer idea as **`chrysalis verify --json-summary`** (D226).
 *
 * CI mirrors the same thresholds via `pnpm run migration-debt:gate:ingest` (ingest-only; no verify reports)
 * and `pnpm run migration-debt:gate:post-verify` after `pnpm run verify:e2e` (needs `reports/verify`).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = resolve(ROOT, "packages/cli/src/bin.ts");

function repoToolVersion(root) {
  try {
    const raw = readFileSync(resolve(root, "package.json"), "utf8");
    const j = JSON.parse(raw);
    if (typeof j.version === "string" && j.version.length > 0) return j.version;
  } catch {
    /* keep default */
  }
  return "0.0.0";
}

/** @param {string[]} argv */
function stripScriptOnlyFlags(argv) {
  const forward = [...argv];
  let jsonPath = null;
  let maxHoles = null;
  let minCorrectness = null;
  for (let i = 0; i < forward.length; ) {
    const a = forward[i];
    if (a === "--json-out") {
      jsonPath = forward[i + 1];
      if (!jsonPath) {
        console.error("migration-debt: --json-out requires a path");
        process.exit(2);
      }
      forward.splice(i, 2);
      continue;
    }
    if (a.startsWith("--json-out=")) {
      jsonPath = a.slice("--json-out=".length);
      if (!jsonPath) {
        console.error("migration-debt: --json-out= requires a non-empty path");
        process.exit(2);
      }
      forward.splice(i, 1);
      continue;
    }
    if (a === "--max-holes") {
      const v = forward[i + 1];
      if (v === undefined || !/^\d+$/.test(v)) {
        console.error("migration-debt: --max-holes requires a non-negative integer");
        process.exit(2);
      }
      maxHoles = Number.parseInt(v, 10);
      forward.splice(i, 2);
      continue;
    }
    if (a.startsWith("--max-holes=")) {
      const rest = a.slice("--max-holes=".length);
      if (!/^\d+$/.test(rest)) {
        console.error("migration-debt: --max-holes= requires a non-negative integer");
        process.exit(2);
      }
      maxHoles = Number.parseInt(rest, 10);
      forward.splice(i, 1);
      continue;
    }
    if (a === "--min-correctness") {
      const v = forward[i + 1];
      const x = v === undefined ? NaN : Number.parseFloat(v);
      if (!Number.isFinite(x) || x < 0 || x > 1) {
        console.error("migration-debt: --min-correctness requires a number in [0, 1]");
        process.exit(2);
      }
      minCorrectness = x;
      forward.splice(i, 2);
      continue;
    }
    if (a.startsWith("--min-correctness=")) {
      const rest = a.slice("--min-correctness=".length);
      const x = Number.parseFloat(rest);
      if (!Number.isFinite(x) || x < 0 || x > 1) {
        console.error("migration-debt: --min-correctness= requires a number in [0, 1]");
        process.exit(2);
      }
      minCorrectness = x;
      forward.splice(i, 1);
      continue;
    }
    i += 1;
  }
  return { forward, jsonPath, maxHoles, minCorrectness };
}

const argv = process.argv.slice(2);
const { forward, jsonPath, maxHoles, minCorrectness } = stripScriptOnlyFlags(argv);
const pi = forward.indexOf("--project");
if (pi < 0 || !forward[pi + 1]) {
  console.error(
    "usage: node scripts/migration-debt.mjs --project <php-root> [--json-out <path>] [--max-holes N] [--min-correctness 0..1] [... chrysalis status args]",
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
    kind: "chrysalis.migration-debt.summary",
    schemaVersion: 1,
    toolVersion: repoToolVersion(ROOT),
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

if (maxHoles !== null) {
  const hc = s.residualLegacy?.holeCount;
  if (typeof hc !== "number") {
    console.error("migration-debt: --max-holes requires residualLegacy.holeCount in status JSON");
    process.exit(4);
  }
  if (hc > maxHoles) {
    console.error(`migration-debt: holeCount ${hc} exceeds --max-holes ${maxHoles}`);
    process.exit(4);
  }
}

if (minCorrectness !== null) {
  const agg = s.correctness?.aggregate;
  if (typeof agg !== "number") {
    console.error("migration-debt: --min-correctness requires correctness.aggregate in status JSON");
    process.exit(4);
  }
  if (agg + 1e-9 < minCorrectness) {
    console.error(
      `migration-debt: aggregate correctness ${agg.toFixed(4)} is below --min-correctness ${minCorrectness}`,
    );
    process.exit(4);
  }
}
