#!/usr/bin/env node
/** Path knowledge smoke (G269). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hubDirectedPairCount } from "./language-catalog.mjs";
import { buildHubPathKnowledgeBase, queryPathKnowledge } from "./hub-path-knowledge.mjs";

export const HUB_PATH_KNOWLEDGE_SMOKE_KIND = "chrysalis.hub.path-knowledge-smoke";
export const HUB_PATH_KNOWLEDGE_SMOKE_SCHEMA_VERSION = 1;

export function runPathKnowledgeSmoke() {
  const base = buildHubPathKnowledgeBase();
  const pair = queryPathKnowledge("php", "hono");
  return {
    kind: HUB_PATH_KNOWLEDGE_SMOKE_KIND,
    schemaVersion: HUB_PATH_KNOWLEDGE_SMOKE_SCHEMA_VERSION,
    ok: (base.pairCount ?? 0) >= hubDirectedPairCount() && pair.pair?.grade != null,
    pairCount: base.pairCount ?? null,
    phpHonoGrade: pair.pair?.grade ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runPathKnowledgeSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
