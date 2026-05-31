#!/usr/bin/env node
/** Path knowledge + language compare standalone batch (G360). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPathKnowledgeSmoke } from "./hub-path-knowledge-smoke.mjs";
import { runLanguageCompareSmoke } from "./hub-language-compare-smoke.mjs";

export const HUB_PATH_KNOWLEDGE_STANDALONE_BATCH_KIND = "chrysalis.hub.path-knowledge-standalone-batch-smoke";
export const HUB_PATH_KNOWLEDGE_STANDALONE_BATCH_SCHEMA_VERSION = 1;

export function runPathKnowledgeStandaloneBatchSmoke() {
  const pathKnowledge = runPathKnowledgeSmoke();
  const languageCompare = runLanguageCompareSmoke();
  return {
    kind: HUB_PATH_KNOWLEDGE_STANDALONE_BATCH_KIND,
    schemaVersion: HUB_PATH_KNOWLEDGE_STANDALONE_BATCH_SCHEMA_VERSION,
    ok: pathKnowledge.ok && languageCompare.ok,
    pathKnowledge,
    languageCompare,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runPathKnowledgeStandaloneBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
