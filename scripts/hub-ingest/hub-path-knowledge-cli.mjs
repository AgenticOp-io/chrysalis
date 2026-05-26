#!/usr/bin/env node
/**
 * Export the hub path knowledge base (all pairs + similarities + best practices).
 * Usage:
 *   pnpm run hub:path-knowledge
 *   node scripts/hub-ingest/hub-path-knowledge-cli.mjs --origin python --output java
 *   node scripts/hub-ingest/hub-path-knowledge-cli.mjs --json-out reports/ci/hub-path-knowledge.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHubPathKnowledgeBase, queryPathKnowledge } from "./hub-path-knowledge.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  let origin = null;
  let output = null;
  let jsonOut = null;
  let includeMatrix = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--include-matrix") includeMatrix = true;
  }
  return { origin, output, jsonOut, includeMatrix };
}

async function main() {
  const { origin, output, jsonOut, includeMatrix } = parseArgs(process.argv);

  const payload =
    origin && output
      ? queryPathKnowledge(origin, output)
      : buildHubPathKnowledgeBase({ origin: origin ?? undefined, output: output ?? undefined, includeMatrix });

  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
