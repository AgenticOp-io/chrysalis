#!/usr/bin/env node
/**
 * Move oracle trace day-bucket directories older than N days to an archive root.
 * Day buckets are matched as direct child directory names YYYY-MM-DD under --traces-root.
 *
 * Usage:
 *   node scripts/corpus-rotate-archive.mjs --traces-root <dir> --archive-root <dir> --older-than-days <n> [--dry-run]
 */

import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseArgs(argv) {
  let tracesRoot = "";
  let archiveRoot = "";
  let olderThanDays = -1;
  let dryRun = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === undefined) break;
    if (a === "--traces-root") {
      const v = argv[++i];
      if (v) tracesRoot = resolve(v);
    } else if (a === "--archive-root") {
      const v = argv[++i];
      if (v) archiveRoot = resolve(v);
    } else if (a === "--older-than-days") {
      const v = argv[++i];
      if (v) olderThanDays = Number.parseInt(v, 10);
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--help" || a === "-h") {
      console.log(
        "usage: node scripts/corpus-rotate-archive.mjs --traces-root <dir> --archive-root <dir> --older-than-days <n> [--dry-run]",
      );
      process.exit(0);
    }
  }
  return { tracesRoot, archiveRoot, olderThanDays, dryRun };
}

function main() {
  const { tracesRoot, archiveRoot, olderThanDays, dryRun } = parseArgs(process.argv);
  if (!tracesRoot || !archiveRoot || !Number.isFinite(olderThanDays) || olderThanDays < 0) {
    console.error(
      "error: require --traces-root <dir> --archive-root <dir> --older-than-days <non-negative int>",
    );
    process.exit(2);
  }
  if (!existsSync(tracesRoot)) {
    console.error(`error: traces root not found: ${tracesRoot}`);
    process.exit(2);
  }
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const entries = readdirSync(tracesRoot, { withFileTypes: true });
  let moved = 0;
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const name = ent.name;
    if (!DAY_RE.test(name)) continue;
    const full = join(tracesRoot, name);
    const st = statSync(full);
    if (st.mtimeMs > cutoff) continue;
    const destDir = join(archiveRoot, name);
    if (dryRun) {
      console.log(`[dry-run] would move ${full} -> ${destDir}`);
      moved += 1;
      continue;
    }
    mkdirSync(archiveRoot, { recursive: true });
    renameSync(full, destDir);
    console.log(`moved ${full} -> ${destDir}`);
    moved += 1;
  }
  console.log(`corpus-rotate-archive: ${dryRun ? "dry-run " : ""}processed ${moved} day-bucket(s)`);
}

main();
