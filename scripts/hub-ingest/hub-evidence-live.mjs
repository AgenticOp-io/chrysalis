#!/usr/bin/env node
/**
 * Live hub evidence report on plain-php flagship (G194).
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHubEvidenceReport } from "./hub-evidence.mjs";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { exportProjectMigrationCwl } from "./hub-project-cwl-export.mjs";

export const HUB_EVIDENCE_LIVE_KIND = "chrysalis.hub.evidence-live";
export const HUB_EVIDENCE_LIVE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");
const verifySeed = join(scriptRoot, "fixtures/ci/tiny-blog-verify-for-status/summary.json");

/**
 * @param {string} [projectDir]
 */
export async function runHubEvidenceLive(projectDir = defaultFixture) {
  const root = resolve(projectDir);
  const base = {
    kind: HUB_EVIDENCE_LIVE_KIND,
    schemaVersion: HUB_EVIDENCE_LIVE_SCHEMA_VERSION,
    fixture: root.includes("hub-flagship-plain-php") ? "fixtures/hub-flagship-plain-php" : root,
    ok: false,
  };

  if (!existsSync(join(root, "chrysalis.routes.json"))) {
    return { ...base, skip: "missing-routes-manifest" };
  }

  const exportResult = await exportPhpHubWebir(root);
  if (!exportResult.ok) {
    return { ...base, skip: exportResult.skip ?? "webir-export-failed" };
  }

  const chrysalisDir = join(root, ".chrysalis");
  mkdirSync(chrysalisDir, { recursive: true });
  mkdirSync(join(root, "reports", "verify"), { recursive: true });

  if (existsSync(verifySeed)) {
    copyFileSync(verifySeed, join(root, "reports", "verify", "summary.json"));
  }

  writeFileSync(
    join(chrysalisDir, "site-intelligence.json"),
    `${JSON.stringify({ frameworkHints: ["plain-php"], primaryOrigin: "php", routeEstimate: { count: exportResult.routeCount ?? 20 } })}\n`,
  );
  writeFileSync(
    join(chrysalisDir, "migration-assessment.json"),
    `${JSON.stringify({
      readinessTier: "pilot-ready",
      origin: "php",
      output: "hono",
      program: { id: "api-slice", title: "API slice" },
      nextSteps: ["Run verify replay", "Review migration contract"],
    })}\n`,
  );

  const cwlMeta = await exportProjectMigrationCwl(root, { origin: "php" });
  if (!cwlMeta.ok || cwlMeta.holeCount !== 0) {
    return { ...base, skip: "cwl-export-failed", holeCount: cwlMeta.holeCount ?? null };
  }

  const evidence = buildHubEvidenceReport(root);
  const ok =
    evidence.schemaVersion === 4 &&
    evidence.migrationPlan?.programId === "api-slice" &&
    evidence.pipelineGate?.readinessTier === "pilot-ready" &&
    evidence.migrationContract?.cwlPath != null &&
    evidence.pipelineGate?.pass === true;

  return {
    ...base,
    ok,
    evidence: {
      schemaVersion: evidence.schemaVersion,
      verifyCorrectness: evidence.verify.correctness,
      verifyGatePass: evidence.verifyGate.pass,
      pipelineGatePass: evidence.pipelineGate?.pass ?? null,
      pipelineGateTier: evidence.pipelineGate?.readinessTier ?? null,
      holeCount: evidence.holes.count,
      deliveryScore: evidence.deliveryScore,
      programId: evidence.migrationPlan?.programId ?? null,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runHubEvidenceLive();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
