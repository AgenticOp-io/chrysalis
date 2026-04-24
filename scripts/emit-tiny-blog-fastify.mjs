#!/usr/bin/env node
/**
 * Ingest tiny-blog + archaeology + emit-fastify (mirrors run-e2e.mjs for Hono).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ingestDirectory } from "../packages/ingest/dist/index.js";
import { countByDialect, countHoles } from "../packages/webir/dist/index.js";
import { emit } from "../packages/emit-fastify/dist/index.js";
import { domainTypesByTable, emitTypes, runArchaeology } from "../packages/archaeology/dist/index.js";

const ROOT = "./fixtures/tiny-blog";
const OUT = "./generated/tiny-blog-fastify";
const SCHEMA = "./fixtures/tiny-blog/schema.sql";

const mod = await ingestDirectory(ROOT);
const dialects = countByDialect(mod);
const irHoles = countHoles(mod);

console.log(
  `[ingest]    routes=${mod.roots.length} nodes=${mod.nodes.size} holes=${irHoles} dialects=${JSON.stringify(dialects)}`,
);

const schemaReport = runArchaeology({ schemaPath: SCHEMA, phpRoots: [ROOT] });
const domainTs = emitTypes(schemaReport);
mkdirSync(join(OUT, "src"), { recursive: true });
writeFileSync(`${OUT}/src/domain.ts`, domainTs);
console.log(
  `[archaeology] ${schemaReport.entities.length} entities → ${OUT}/src/domain.ts` +
    (schemaReport.unknownDdl.length ? ` (unknown: ${schemaReport.unknownDdl.length})` : ""),
);

const res = await emit({
  module: mod,
  outDir: OUT,
  schemaReport,
  domainTypesByTable: domainTypesByTable(schemaReport),
});
console.log(
  `[emit-fastify] handlers=${res.handlerCount} files=${res.files.length} emit-holes=${res.holes.length}`,
);
