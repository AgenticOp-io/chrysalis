#!/usr/bin/env node
/**
 * Query COBOL corpus feature index (G10120 metadata lite).
 * Reads reports/cobol/corpus-feature-index.json (built by hub:cobol-corpus-census on GCE).
 *
 * Usage:
 *   node scripts/hub-ingest/hub-cobol-corpus-query.mjs --all odo
 *   node scripts/hub-ingest/hub-cobol-corpus-query.mjs --all redefines,comp3 --corpus jrecord
 *   node scripts/hub-ingest/hub-cobol-corpus-query.mjs --any execCics,dfhmsd --limit 50
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { queryCobolFeatureIndex } from "./hub-cobol-corpus-census.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_INDEX = join(ROOT, "reports/cobol/corpus-feature-index.json");

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{ all: string[], any: string[], corpus?: string, ext?: string, limit: number, index: string, help?: boolean }} */
  const out = { all: [], any: [], limit: 100, index: DEFAULT_INDEX };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--all" && next) {
      out.all = next.split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (a === "--any" && next) {
      out.any = next.split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (a === "--corpus" && next) {
      out.corpus = next;
      i++;
    } else if (a === "--ext" && next) {
      out.ext = next.startsWith(".") ? next : `.${next}`;
      i++;
    } else if (a === "--limit" && next) {
      out.limit = Number(next) || 100;
      i++;
    } else if (a === "--index" && next) {
      out.index = resolve(next);
      i++;
    } else if (a === "--help" || a === "-h") {
      out.help = true;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`hub:cobol-corpus-query — filter corpus-feature-index.json
  --all f1,f2     require all features
  --any f1,f2     require any feature
  --corpus id     filter corpus id
  --ext .cpy      filter extension
  --limit N       max hits (default 100)
  --index path    index JSON (default reports/cobol/corpus-feature-index.json)
Features: comp3 occurs odo redefines renames copyReplacing execCics execSql execDli dfhmsd national`);
    process.exit(0);
  }
  if (!existsSync(args.index)) {
    console.error(
      JSON.stringify({
        ok: false,
        error: `missing index: ${args.index}`,
        hint: "Run on GCE: pnpm run test:gce:cobol then pnpm run test:gce:cobol:fetch (or hub:cobol-corpus-census)",
      }),
    );
    process.exit(1);
  }
  const index = JSON.parse(readFileSync(args.index, "utf8"));
  if (index.kind !== "chrysalis.hub.cobol-corpus-feature-index") {
    console.error(JSON.stringify({ ok: false, error: "bad index kind", kind: index.kind }));
    process.exit(1);
  }
  const hits = queryCobolFeatureIndex(index, {
    all: args.all,
    any: args.any,
    corpus: args.corpus,
    ext: args.ext,
    limit: args.limit,
  });
  const result = {
    ok: true,
    gate: "G10120",
    query: { all: args.all, any: args.any, corpus: args.corpus, ext: args.ext, limit: args.limit },
    indexArtifacts: index.artifactCount,
    hitCount: hits.length,
    hits,
  };
  console.log(JSON.stringify(result, null, 2));
}

main();
