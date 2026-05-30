#!/usr/bin/env node
/**
 * Migration assessment: scan + readiness + path recommendation (G144).
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHubEvidenceReport } from "./hub-evidence.mjs";
import { compareHubLanguages } from "./hub-language-compare.mjs";
import { buildMigrationProgram } from "./hub-migration-programs.mjs";
import { queryPathKnowledge } from "./hub-path-knowledge.mjs";
import { buildSiteIntelligenceReport } from "./hub-site-intelligence.mjs";
import { buildProjectVerifyGapsIngestReport } from "./hub-verify-gaps-ingest.mjs";
import { buildChimeraCutoverRunbook } from "./hub-chimera-cutover.mjs";

export const HUB_MIGRATION_ASSESSMENT_KIND = "chrysalis.hub.migration-assessment";
export const HUB_MIGRATION_ASSESSMENT_SCHEMA_VERSION = 1;

const DEFAULT_COMPARE_OUTPUTS = ["hono", "fastify", "nextjs", "typescript"];

/**
 * @param {Awaited<ReturnType<typeof buildSiteIntelligenceReport>>} siteIntel
 */
export function recommendMigrationProgram(siteIntel) {
  if (siteIntel.frameworkHints.includes("auth-slice-candidate")) return "auth-slice";
  const { writeCount, count } = siteIntel.routeEstimate;
  if (writeCount === 0 && count !== null && count > 0) return "public-readonly";
  return "api-slice";
}

/**
 * @param {object} input
 */
export function computeReadinessTier(input) {
  const { siteIntel, evidence, cutoverReady } = input;
  if (cutoverReady) return "cutover-ready";
  const gatePass = evidence?.verifyGate?.pass === true;
  const holesClear = evidence?.holes?.count === 0;
  const hasContract = Boolean(evidence?.migrationContract?.cwlPath);
  if (gatePass && holesClear && hasContract) return "program-ready";
  if (evidence?.verify?.available || hasContract) return "pilot-ready";
  if (siteIntel.routeEstimate.count !== null || siteIntel.scan.pathCount > 0) return "assess";
  return "scan-only";
}

/**
 * @param {object} opts
 * @param {string} opts.projectDir
 * @param {string} [opts.origin]
 * @param {string} [opts.output]
 * @param {string[]} [opts.compareOutputs]
 */
export async function buildMigrationAssessment(opts) {
  const root = resolve(opts.projectDir);
  const siteIntel = await buildSiteIntelligenceReport(root);
  const origin = opts.origin ?? siteIntel.primaryOrigin ?? "php";
  const compareOutputs = opts.compareOutputs ?? DEFAULT_COMPARE_OUTPUTS;
  const compare = compareHubLanguages(origin, compareOutputs);
  const output = opts.output ?? compare.recommended ?? compareOutputs[0] ?? "hono";
  const pathAdvice = queryPathKnowledge(origin, output);
  const programId = recommendMigrationProgram(siteIntel);
  const program = buildMigrationProgram({
    origin,
    outputs: [output],
    programId,
    detectedDatabases: siteIntel.databases.detectedIds,
  });

  let evidence = null;
  if (existsSync(join(root, "chrysalis.holes.json")) || existsSync(join(root, "reports", "verify", "summary.json"))) {
    evidence = buildHubEvidenceReport(root);
  }

  let cutover = null;
  let cutoverReady = false;
  let verifyGaps = buildProjectVerifyGapsIngestReport(root);
  if (evidence) {
    cutover = await buildChimeraCutoverRunbook({
      projectDir: root,
      origin,
      outputs: [output],
      programId,
    });
    cutoverReady = cutover.readyForShadow === true;
  }

  const readinessTier = computeReadinessTier({ siteIntel, evidence, cutoverReady });
  const blockers = evidence?.blockers ?? [];
  if (siteIntel.risk.level === "high") {
    blockers.push({
      kind: "site-risk",
      count: siteIntel.risk.score,
      detail: `site intelligence risk ${siteIntel.risk.level} (${siteIntel.risk.score}/100)`,
    });
  }

  const nextSteps = [
    "Run site intelligence scan and confirm primary origin + route estimate.",
    `Review path advice for ${origin} → ${output} (grade ${pathAdvice.path.grade}, verifyTier ${pathAdvice.path.verifyTier}).`,
    `Start migration program: ${program.program.title} (${programId}).`,
  ];
  if (readinessTier === "scan-only" || readinessTier === "assess") {
    nextSteps.push("Capture oracle traces on staging for the scoped route slice.");
    nextSteps.push("Run hub translate and verify replay before expanding scope.");
  }
  if (readinessTier === "pilot-ready") {
    nextSteps.push("Close verify blockers and clear residual holes to reach program-ready.");
  }
  if (readinessTier === "program-ready" || readinessTier === "cutover-ready") {
    nextSteps.push("Follow chimera cutover runbook: shadow → canary → cutover.");
  }
  if (verifyGaps.ingestNext) {
    nextSteps.unshift(
      `Address top verify gap: ${verifyGaps.ingestNext.divergenceKind} (${verifyGaps.ingestNext.failedTraceRows} row(s)) — ${verifyGaps.ingestNext.playbook?.title ?? "see verify-gaps-ingest"}.`,
    );
  }

  return {
    kind: HUB_MIGRATION_ASSESSMENT_KIND,
    schemaVersion: HUB_MIGRATION_ASSESSMENT_SCHEMA_VERSION,
    projectDir: root,
    readinessTier,
    origin,
    output,
    compare,
    siteIntelligence: {
      primaryOrigin: siteIntel.primaryOrigin,
      routeEstimate: siteIntel.routeEstimate,
      risk: siteIntel.risk,
      databases: siteIntel.databases,
      frameworkHints: siteIntel.frameworkHints,
    },
    pathAdvice: {
      grade: pathAdvice.path.grade,
      verifyTier: pathAdvice.path.verifyTier,
      riskLevel: pathAdvice.pair.riskLevel,
      verifyExpectation: pathAdvice.pair.verifyExpectation,
      bestPracticeIds: pathAdvice.pair.bestPracticeIds,
    },
    program: {
      id: programId,
      title: program.program.title,
      routePatterns: program.routePatterns,
      steps: program.steps,
    },
    evidence: evidence
      ? {
          verifyCorrectness: evidence.verify.correctness,
          verifyGatePass: evidence.verifyGate.pass,
          holeCount: evidence.holes.count,
          deliveryScore: evidence.deliveryScore,
          blockers: evidence.blockers,
        }
      : null,
    cutoverReady,
    blockers,
    verifyGaps: {
      ok: verifyGaps.ok,
      backlogCount: verifyGaps.backlog.length,
      ingestNext: verifyGaps.ingestNext,
    },
    nextSteps,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {Awaited<ReturnType<typeof buildMigrationAssessment>>} report
 */
export function renderMigrationAssessmentMarkdown(report) {
  const lines = [
    "# Migration assessment",
    "",
    `- **Readiness:** ${report.readinessTier}`,
    `- **Origin → output:** ${report.origin} → ${report.output}`,
    `- **Program:** ${report.program.title} (\`${report.program.id}\`)`,
    `- **Pair grade:** ${report.pathAdvice.grade} · verifyTier ${report.pathAdvice.verifyTier} · risk ${report.pathAdvice.riskLevel}`,
    "",
    "## Site intelligence",
    "",
    `- Routes (estimate): ${report.siteIntelligence.routeEstimate.count ?? "unknown"} (${report.siteIntelligence.routeEstimate.source})`,
    `- Risk: ${report.siteIntelligence.risk.level} (${report.siteIntelligence.risk.score}/100)`,
    `- Databases: ${report.siteIntelligence.databases.detectedIds.join(", ") || "none detected"}`,
    "",
    "## Blockers",
    "",
  ];
  if (report.blockers.length === 0) lines.push("- None");
  else for (const b of report.blockers) lines.push(`- **${b.kind}** — ${b.detail}`);
  lines.push("", "## Next steps", "");
  for (const step of report.nextSteps) lines.push(`1. ${step}`);
  lines.push("");
  return lines.join("\n");
}

/**
 * @param {string} projectDir
 * @param {Awaited<ReturnType<typeof buildMigrationAssessment>>} [report]
 */
export async function writeMigrationAssessmentArtifacts(projectDir, report) {
  const root = resolve(projectDir);
  const payload = report ?? (await buildMigrationAssessment({ projectDir: root }));
  const outDir = join(root, ".chrysalis");
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "migration-assessment.json");
  const mdPath = join(outDir, "migration-assessment.md");
  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(mdPath, renderMigrationAssessmentMarkdown(payload), "utf8");
  return { jsonPath, mdPath, report: payload };
}

function parseArgs(argv) {
  let projectDir = null;
  let origin = null;
  let output = null;
  let jsonOut = null;
  let writeArtifacts = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--write-artifacts") writeArtifacts = true;
  }
  if (!projectDir) {
    throw new Error(
      "usage: hub-migration-assessment.mjs --project <dir> [--origin php] [--output hono] [--write-artifacts]",
    );
  }
  return { projectDir, origin, output, jsonOut, writeArtifacts };
}

async function main() {
  const { projectDir, origin, output, jsonOut, writeArtifacts } = parseArgs(process.argv);
  const report = await buildMigrationAssessment({ projectDir, origin, output });
  if (writeArtifacts) {
    await writeMigrationAssessmentArtifacts(projectDir, report);
  }
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
