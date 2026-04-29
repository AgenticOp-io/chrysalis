#!/usr/bin/env node
/**
 * One-screen migration debt summary from `chrysalis status --json`.
 * Forwards all argv after the script name to `chrysalis status` (must include `--project`).
 *
 *   node scripts/migration-debt.mjs --project fixtures/tiny-blog [--traces traces] ...
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = resolve(ROOT, "packages/cli/src/bin.ts");

const argv = process.argv.slice(2);
const pi = argv.indexOf("--project");
if (pi < 0 || !argv[pi + 1]) {
  console.error(
    "usage: node scripts/migration-debt.mjs --project <php-root> [...optional chrysalis status args]",
  );
  process.exit(2);
}

const r = spawnSync(process.execPath, ["--import", "tsx", CLI, "status", "--json", ...argv], {
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
