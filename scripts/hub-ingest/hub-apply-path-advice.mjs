#!/usr/bin/env node
/**
 * Apply path explorer pair advice to a project workspace (G145).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describeHubGoldPairCoverage } from "./hub-gold-coverage.mjs";
import { buildMigrationPlan } from "./hub-migration-planner.mjs";
import { buildMigrationProgram } from "./hub-migration-programs.mjs";
import { queryPathKnowledge } from "./hub-path-knowledge.mjs";
import { buildSiteIntelligenceReport } from "./hub-site-intelligence.mjs";
import { recommendMigrationProgram } from "./hub-migration-assessment.mjs";

export const HUB_APPLY_PATH_ADVICE_KIND = "chrysalis.hub.apply-path-advice";
export const HUB_APPLY_PATH_ADVICE_SCHEMA_VERSION = 1;

/**
 * @param {object} opts
 * @param {string} opts.projectDir
 * @param {string} opts.origin
 * @param {string} opts.output
 * @param {string} [opts.programId]
 * @param {string[]} [opts.detectedDatabases]
 */
export async function applyPathAdviceToProject(opts) {
  const root = resolve(opts.projectDir);
  const origin = opts.origin;
  const output = opts.output;
  const siteIntel = await buildSiteIntelligenceReport(root);
  const pathKnowledge = queryPathKnowledge(origin, output);
  const goldCoverage = describeHubGoldPairCoverage(origin, output);
  const programId = opts.programId ?? recommendMigrationProgram(siteIntel);
  const detectedDatabases = opts.detectedDatabases ?? siteIntel.databases.detectedIds;
  const migrationPlan = buildMigrationPlan({
    origin,
    outputs: [output],
    detectedDatabases,
    originServices: siteIntel.services,
  });
  const migrationProgram = buildMigrationProgram({
    origin,
    outputs: [output],
    programId,
    detectedDatabases,
    originServices: siteIntel.services,
  });

  const pipelineSteps = [
    "Prep origin (SSH scan or local site intelligence).",
    "Capture oracle traces for the migration program route patterns.",
    `Run hub translate (${origin} → ${output}).`,
    "Run verify replay; require correctness 1.0 before cutover.",
    "Export migration contract and review CWL diff on contract changes.",
  ];

  return {
    kind: HUB_APPLY_PATH_ADVICE_KIND,
    schemaVersion: HUB_APPLY_PATH_ADVICE_SCHEMA_VERSION,
    projectDir: root,
    origin,
    output,
    appliedAt: new Date().toISOString(),
    path: pathKnowledge.path,
    pair: {
      grade: pathKnowledge.pair.grade,
      riskLevel: pathKnowledge.pair.riskLevel,
      verifyExpectation: pathKnowledge.pair.verifyExpectation,
      canonicalWebIrPattern: pathKnowledge.pair.canonicalWebIrPattern,
      similarities: pathKnowledge.pair.similarities,
      differences: pathKnowledge.pair.differences,
      bestPracticeIds: pathKnowledge.pair.bestPracticeIds,
    },
    bestPractices: pathKnowledge.bestPractices,
    goldCoverage: {
      suiteIds: goldCoverage.suiteIds,
      suiteCount: goldCoverage.suiteCount,
      traceReplaySuiteIds: goldCoverage.traceReplaySuiteIds,
      verifyTier: goldCoverage.verifyTier,
      coverageGap: goldCoverage.coverageGap,
    },
    migrationPlan,
    migrationProgram: {
      id: programId,
      title: migrationProgram.program.title,
      routePatterns: migrationProgram.routePatterns,
      steps: migrationProgram.steps,
    },
    siteIntelligence: {
      primaryOrigin: siteIntel.primaryOrigin,
      routeEstimate: siteIntel.routeEstimate,
      risk: siteIntel.risk,
    },
    pipelineSteps,
    artifactPath: join(root, ".chrysalis", "path-advice.json"),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {string} projectDir
 * @param {object} opts
 * @param {string} opts.origin
 * @param {string} opts.output
 * @param {string} [opts.programId]
 */
export async function writePathAdviceArtifacts(projectDir, opts) {
  const report = await applyPathAdviceToProject({ projectDir, ...opts });
  const outDir = join(resolve(projectDir), ".chrysalis");
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "path-advice.json");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { jsonPath, report };
}

function parseArgs(argv) {
  let projectDir = null;
  let origin = null;
  let output = null;
  let programId = null;
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
    else if (argv[i] === "--program" && argv[i + 1]) programId = argv[++i];
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  if (!projectDir || !origin || !output) {
    throw new Error(
      "usage: hub-apply-path-advice.mjs --project <dir> --origin php --output hono [--program api-slice]",
    );
  }
  return { projectDir, origin, output, programId, jsonOut };
}

async function main() {
  const { projectDir, origin, output, programId, jsonOut } = parseArgs(process.argv);
  const { report, jsonPath } = await writePathAdviceArtifacts(projectDir, { origin, output, programId });
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({ ...report, writtenPath: jsonPath }, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
