#!/usr/bin/env node
/**
 * End-to-end pipeline runner for the tiny-blog fixture.
 * Until the CLI subcommands are wired (see ROADMAP Milestone 1 cli-wire),
 * this script is how Chrysalis's pipeline is exercised.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ingestDirectory } from "../packages/ingest/dist/index.js";
import { countByDialect, countHoles } from "../packages/webir/dist/index.js";
import { emit } from "../packages/emit-hono/dist/index.js";
import { domainTypesByTable, emitTypes, runArchaeology } from "../packages/archaeology/dist/index.js";

const ROOT = "./fixtures/tiny-blog";
const OUT = "./generated/tiny-blog";
const SCHEMA = "./fixtures/tiny-blog/schema.sql";

const mod = await ingestDirectory(ROOT);
const dialects = countByDialect(mod);
const irHoles = countHoles(mod);

console.log(
  `[ingest]    routes=${mod.roots.length} nodes=${mod.nodes.size} holes=${irHoles} dialects=${JSON.stringify(dialects)}`,
);

// Archaeology before emit so `domain.ts` exists and emit can import row types.
const schemaReport = runArchaeology({ schemaPath: SCHEMA });
const domainTs = emitTypes(schemaReport);
mkdirSync(join(OUT, "src"), { recursive: true });
writeFileSync(`${OUT}/src/domain.ts`, domainTs);
console.log(
  `[archaeology] ${schemaReport.entities.length} entities → ${OUT}/src/domain.ts` +
    (schemaReport.unknownDdl.length ? ` (unknown: ${schemaReport.unknownDdl.length})` : ""),
);
for (const e of schemaReport.entities) {
  console.log(`   ${e.typescriptName.padEnd(12)} fields=${e.fields.length}`);
}

const res = await emit({
  module: mod,
  outDir: OUT,
  domainTypesByTable: domainTypesByTable(schemaReport),
});
console.log(
  `[emit]      handlers=${res.handlerCount} files=${res.files.length} emit-holes=${res.holes.length}`,
);

for (const [h, effs] of Object.entries(res.effectsByHandler)) {
  console.log(`   ${h.padEnd(25)} effects: ${effs.join(", ") || "(none)"}`);
}

const bySource = new Map();
for (const h of res.holes) {
  const key = h.reason;
  bySource.set(key, (bySource.get(key) ?? 0) + 1);
}
if (bySource.size) {
  console.log(`\n[holes by reason]`);
  for (const [r, n] of [...bySource.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(3)}  ${r}`);
  }
}

