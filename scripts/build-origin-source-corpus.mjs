#!/usr/bin/env node
/**
 * Build origin source corpus + convert queue (DESIGN D6444).
 *
 * Default roots (WISPTools POC):
 *   Module_Manager + backend-services
 *
 * Usage:
 *   node scripts/build-origin-source-corpus.mjs
 *   node scripts/build-origin-source-corpus.mjs --root A --root B --out-dir reports/origin-corpus
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWispModuleRoot, resolveWispBackendRoot } from "./lib/wisp-origin-paths.mjs";
import {
  buildSourceCorpus,
  writeSourceCorpusArtifacts,
} from "./lib/source-corpus.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function defaultRoots() {
  const wisp = resolveWispModuleRoot(
    process.env.CHRYSALIS_WISP_ROOT ?? process.env.WISP_MODULE_DIR,
  );
  const backend = resolveWispBackendRoot();
  const roots = [wisp];
  if (existsSync(backend)) roots.push(backend);
  return roots;
}

function parseArgs(argv) {
  /** @type {string[]} */
  const roots = [];
  let outDir = join(scriptRoot, "reports/origin-corpus");
  let label = "wisptools-origin";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) roots.push(resolve(argv[++i]));
    else if (argv[i] === "--out-dir" && argv[i + 1]) outDir = resolve(argv[++i]);
    else if (argv[i] === "--label" && argv[i + 1]) label = String(argv[++i]);
  }
  return { roots: roots.length ? roots : defaultRoots(), outDir, label };
}

function main() {
  const { roots, outDir, label } = parseArgs(process.argv);
  mkdirSync(outDir, { recursive: true });
  const corpus = buildSourceCorpus({ roots, label });
  const written = writeSourceCorpusArtifacts(corpus, {
    jsonPath: join(outDir, "chrysalis.source-corpus.v1.json"),
    sqlitePath: join(outDir, "chrysalis.source-corpus.v1.sqlite"),
    queuePath: join(outDir, "chrysalis.convert-queue.v1.json"),
  });
  const report = {
    kind: "chrysalis.origin-source-corpus.build",
    schemaVersion: 1,
    ok: corpus.stats.fileCount > 0 && corpus.stats.pieceCount > 0,
    label,
    roots: corpus.roots,
    stats: corpus.stats,
    next: written.queue.next,
    artifacts: {
      json: written.jsonPath.replace(/\\/g, "/"),
      sqlite: written.sqlitePath.replace(/\\/g, "/"),
      queue: join(outDir, "chrysalis.convert-queue.v1.json").replace(/\\/g, "/"),
    },
    generatedAt: corpus.generatedAt,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main();
