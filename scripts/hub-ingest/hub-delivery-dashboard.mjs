#!/usr/bin/env node
/**
 * Console delivery dashboard aggregate (G152).
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHubEvidenceReport } from "./hub-evidence.mjs";
import { buildMigrationAssessment } from "./hub-migration-assessment.mjs";
import { buildProjectVerifyGapsIngestReport } from "./hub-verify-gaps-ingest.mjs";
import { buildChimeraCutoverRunbook } from "./hub-chimera-cutover.mjs";
import { buildHubLicenseStatusReport } from "./hub-license-status.mjs";
import { buildCwlPreviewReport } from "./hub-cwl-preview.mjs";
import { buildLaravelVerifyGapsReport } from "./hub-laravel-verify-gaps.mjs";
import { runLaravelVerifyGapsAction } from "./hub-laravel-verify-gaps-action.mjs";
import { buildOracleMicroFixtureReport } from "./hub-php-oracle-micro-fixture.mjs";

export const HUB_DELIVERY_DASHBOARD_KIND = "chrysalis.hub.delivery-dashboard";
export const HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION = 5;

const ARTIFACT_FILES = [
  "site-intelligence.json",
  "path-advice.json",
  "migration-assessment.json",
  "verify-gaps-ingest.json",
  "verify-gaps-ingest-action.json",
  "chimera-cutover.json",
  "cwl-preview.json",
  "migration.cwl",
  "cwl-export.json",
  "evidence-history.jsonl",
];

/**
 * @param {string} projectDir
 * @param {{ origin?: string, output?: string, programId?: string, laravelGapsReportDirs?: string[] }} [opts]
 */
export async function buildDeliveryDashboard(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const origin = opts.origin ?? "php";
  const output = opts.output ?? "hono";
  const chrysalisDir = join(root, ".chrysalis");

  const evidence = buildHubEvidenceReport(root);
  const verifyGaps = buildProjectVerifyGapsIngestReport(root);

  let assessment = null;
  try {
    assessment = await buildMigrationAssessment({
      projectDir: root,
      origin,
      output,
      laravelGapsReportDirs: opts.laravelGapsReportDirs,
    });
  } catch {
    assessment = null;
  }

  /** @type {string[]} */
  let frameworkHints = assessment?.siteIntelligence?.frameworkHints ?? [];
  const siteIntelArtifact = join(chrysalisDir, "site-intelligence.json");
  if (frameworkHints.length === 0 && existsSync(siteIntelArtifact)) {
    try {
      const si = JSON.parse(readFileSync(siteIntelArtifact, "utf8"));
      if (Array.isArray(si.frameworkHints)) frameworkHints = si.frameworkHints;
    } catch {
      /* ignore */
    }
  }

  let chimera = null;
  try {
    chimera = await buildChimeraCutoverRunbook({
      projectDir: root,
      origin,
      outputs: [output],
      programId: opts.programId ?? assessment?.program?.id ?? "api-slice",
    });
  } catch {
    chimera = null;
  }

  const artifacts = ARTIFACT_FILES.map((name) => {
    const path = name === "migration.cwl" ? join(chrysalisDir, name) : join(chrysalisDir, name);
    const alt = name === "migration.cwl" ? join(root, "migration.cwl") : null;
    const exists = existsSync(path) || (alt ? existsSync(alt) : false);
    return { name, path: existsSync(path) ? path : alt && existsSync(alt) ? alt : path, exists };
  });

  const license = await buildHubLicenseStatusReport();

  const migrationCwl = join(chrysalisDir, "migration.cwl");
  const cwlPath = existsSync(migrationCwl) ? migrationCwl : existsSync(join(root, "migration.cwl")) ? join(root, "migration.cwl") : null;
  let cwlPreview = null;
  const cwlPreviewArtifact = join(chrysalisDir, "cwl-preview.json");
  if (existsSync(cwlPreviewArtifact)) {
    try {
      cwlPreview = JSON.parse(readFileSync(cwlPreviewArtifact, "utf8"));
    } catch {
      cwlPreview = { ok: false, error: "cwl-preview-artifact-invalid" };
    }
  } else if (cwlPath) {
    try {
      cwlPreview = await buildCwlPreviewReport(root, { cwlPath, probe: false });
    } catch {
      cwlPreview = { ok: false, error: "cwl-preview-failed" };
    }
  }

  const isLaravel = frameworkHints.includes("laravel");
  const laravelGapsOpts = opts.laravelGapsReportDirs
    ? { reportDirs: opts.laravelGapsReportDirs, merge: false }
    : {};
  const laravelGlobalGaps = isLaravel ? buildLaravelVerifyGapsReport(laravelGapsOpts) : null;
  const laravelGlobalAction = isLaravel ? runLaravelVerifyGapsAction(laravelGapsOpts) : null;
  const oracleMicro = buildOracleMicroFixtureReport();

  return {
    kind: HUB_DELIVERY_DASHBOARD_KIND,
    schemaVersion: HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION,
    projectDir: root,
    origin,
    output,
    evidence: {
      verifyCorrectness: evidence.verify.correctness,
      verifyGatePass: evidence.verifyGate.pass,
      holeCount: evidence.holes.count,
      deliveryScore: evidence.deliveryScore,
      blockers: evidence.blockers,
      trend: evidence.trend,
    },
    assessment: assessment
      ? {
          readinessTier: assessment.readinessTier,
          nextSteps: assessment.nextSteps,
          routeEstimate: assessment.siteIntelligence?.routeEstimate?.count ?? null,
          programId: assessment.program?.id ?? null,
        }
      : null,
    verifyGaps: {
      available: verifyGaps.ok,
      ingestNext: verifyGaps.ingestNext,
      backlogCount: verifyGaps.backlog.length,
      topBacklog: verifyGaps.backlog.slice(0, 5),
    },
    chimera: chimera
      ? {
          currentPhase: chimera.phases?.find((p) => p.ready === false)?.id ?? chimera.phases?.[chimera.phases.length - 1]?.id ?? null,
          prepGatesPass: chimera.phases?.[0]?.gates?.every((g) => g.pass) ?? null,
          phaseCount: chimera.phases?.length ?? null,
        }
      : null,
    license: {
      requireLicense: license.requireLicense,
      gatePass: license.gatePass,
      tier: license.tier,
      configuredMinTier: license.configuredMinTier,
      hubFeatures: license.hubFeatures,
    },
    cwlPreview: cwlPreview
      ? {
          ok: cwlPreview.ok === true,
          routeCount: cwlPreview.routeCount ?? null,
          holeCount: cwlPreview.holeCount ?? null,
          imports: cwlPreview.imports ?? [],
          moduleName: cwlPreview.moduleName ?? null,
        }
      : null,
    laravelGlobalGaps: laravelGlobalGaps
      ? {
          ok: laravelGlobalGaps.ok === true,
          backlogCount: laravelGlobalGaps.backlog?.length ?? 0,
          ingestNext: laravelGlobalGaps.ingestNext ?? null,
        }
      : null,
    laravelGlobalAction: laravelGlobalAction
      ? {
          ok: laravelGlobalAction.ok === true,
          ingestRemediation: laravelGlobalAction.ingestRemediation,
          suggestedCommand: laravelGlobalAction.ingestRemediation?.suggestedCommand ?? null,
        }
      : null,
    month3Program: {
      oracleMicro: { fixture: oracleMicro.fixture, routeCount: oracleMicro.routeCount },
      cwlRfcSmokes: ["hub:cwl-response-status-smoke", "hub:cwl-request-body-smoke"],
      projectToCwlGates: "hub:project-to-cwl-gates",
      contractCwlSmoke: "hub:contract-cwl-smoke",
      phpNextjsFlagships: ["hub:php-nextjs-flagship-verify", "hub:php-nextjs-symfony-verify"],
      evidenceSmoke: "hub:evidence-smoke",
    },
    artifacts,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let projectDir = null;
  let origin = "php";
  let output = "hono";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
  }
  if (!projectDir) {
    throw new Error("usage: hub-delivery-dashboard.mjs --project <dir> [--origin php] [--output hono]");
  }
  return { projectDir, origin, output };
}

async function main() {
  const { projectDir, origin, output } = parseArgs(process.argv);
  const report = await buildDeliveryDashboard(projectDir, { origin, output });
  console.log(JSON.stringify(report, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
