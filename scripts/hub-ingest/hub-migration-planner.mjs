#!/usr/bin/env node
/**
 * Migration planner: language compare + web database catalog context.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compareHubLanguages } from "./hub-language-compare.mjs";
import { buildWebDatabaseCatalogReport, databasesForMigrationContext } from "./hub-web-databases.mjs";
import { detectDatabasesFromOriginServices } from "./hub-detect-databases.mjs";
import { queryPathKnowledge } from "./hub-path-knowledge.mjs";

export const HUB_MIGRATION_PLANNER_KIND = "chrysalis.hub.migration-plan";
export const HUB_MIGRATION_PLANNER_SCHEMA_VERSION = 1;

/**
 * @param {object} opts
 * @param {string} opts.origin
 * @param {string[]} opts.outputs
 * @param {string[]} [opts.detectedDatabases]
 * @param {Record<string, unknown>} [opts.originServices]
 */
export function buildMigrationPlan(opts) {
  const { origin, outputs, detectedDatabases = [], originServices } = opts;
  const fromServices = originServices ? detectDatabasesFromOriginServices(originServices) : [];
  const mergedDbIds = [...detectedDatabases];
  for (const id of fromServices) {
    if (!mergedDbIds.includes(id)) mergedDbIds.push(id);
  }
  const compare = compareHubLanguages(origin, outputs);
  const primary = outputs[0] ?? compare.recommended;
  const pair = primary ? queryPathKnowledge(origin, primary) : null;
  const databases = databasesForMigrationContext(mergedDbIds);

  const steps = [
    "Capture oracle traces on staging (or upload traces to Translation Hub).",
    `Run Chrysalis ingest on origin (${origin}) when lane is chrysalis-ingest.`,
    `Emit to recommended output (${compare.recommended ?? primary}) and run verify replay.`,
    "Review hole report; delegate legacy via chimera until correctness threshold met.",
  ];
  if (databases.detected.length > 0) {
    steps.push(
      `Validate SQL/data effects for: ${databases.detected.map((d) => d.label).join(", ")}.`,
    );
  } else {
    steps.push(`Inventory datastore against tier-1 catalog (${databases.recommendedTier1.slice(0, 5).join(", ")}, …).`);
  }

  return {
    kind: HUB_MIGRATION_PLANNER_KIND,
    schemaVersion: HUB_MIGRATION_PLANNER_SCHEMA_VERSION,
    origin,
    outputs,
    detectedDatabaseIds: mergedDbIds,
    recommendedOutput: compare.recommended,
    compare,
    pairSummary: pair
      ? {
          riskLevel: pair.pair.riskLevel,
          verifyExpectation: pair.pair.verifyExpectation,
          canonicalWebIrPattern: pair.pair.canonicalWebIrPattern,
        }
      : null,
    databases,
    steps,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let origin = null;
  let outputs = [];
  let detectedDatabases = [];
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--outputs" && argv[i + 1]) {
      outputs = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (argv[i] === "--databases" && argv[i + 1]) {
      detectedDatabases = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  if (!origin || outputs.length === 0) {
    throw new Error(
      "usage: hub-migration-planner.mjs --origin <lang> --outputs a,b [--databases postgres,redis] [--json-out path]",
    );
  }
  return { origin, outputs, detectedDatabases, jsonOut };
}

async function main() {
  const { origin, outputs, detectedDatabases, jsonOut } = parseArgs(process.argv);
  const plan = buildMigrationPlan({ origin, outputs, detectedDatabases });
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(plan, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
