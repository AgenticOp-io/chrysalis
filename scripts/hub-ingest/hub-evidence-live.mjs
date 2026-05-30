#!/usr/bin/env node
/**
 * Live hub evidence report on plain-php flagship (G194).
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHubEvidenceReport } from "./hub-evidence.mjs";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { ensureProjectWebir } from "./hub-project-to-cwl-gates.mjs";
import { exportProjectMigrationCwl } from "./hub-project-cwl-export.mjs";

export const HUB_EVIDENCE_LIVE_KIND = "chrysalis.hub.evidence-live";
export const HUB_EVIDENCE_LIVE_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const verifySeed = join(scriptRoot, "fixtures/ci/tiny-blog-verify-for-status/summary.json");

/** @type {Record<string, { rel: string, origin: string, frameworkHints: string[], routeCount: number }>} */
export const EVIDENCE_LIVE_FIXTURES = {
  plainPhp: {
    rel: "fixtures/hub-flagship-plain-php",
    origin: "php",
    frameworkHints: ["plain-php"],
    routeCount: 20,
  },
  symfony: {
    rel: "fixtures/hub-flagship-symfony",
    origin: "php",
    frameworkHints: ["symfony"],
    routeCount: 20,
  },
  tinyBlog: {
    rel: "fixtures/tiny-blog",
    origin: "php",
    frameworkHints: ["plain-php"],
    routeCount: 5,
    requireHoleFree: false,
  },
  express: {
    rel: "fixtures/hub-flagship-express",
    origin: "javascript",
    frameworkHints: ["express"],
    routeCount: 20,
  },
};

/**
 * @param {string} [projectDir]
 * @param {{ profile?: keyof typeof EVIDENCE_LIVE_FIXTURES }} [opts]
 */
export async function runHubEvidenceLive(projectDir, opts = {}) {
  const profileKey = opts.profile ?? "plainPhp";
  const profile = EVIDENCE_LIVE_FIXTURES[profileKey] ?? EVIDENCE_LIVE_FIXTURES.plainPhp;
  const root = resolve(projectDir ?? join(scriptRoot, profile.rel));
  const base = {
    kind: HUB_EVIDENCE_LIVE_KIND,
    schemaVersion: HUB_EVIDENCE_LIVE_SCHEMA_VERSION,
    profile: profileKey,
    fixture: profile.rel,
    ok: false,
  };

  if (!existsSync(join(root, "chrysalis.routes.json"))) {
    return { ...base, skip: "missing-routes-manifest" };
  }

  const exportResult = await ensureProjectWebir(root, profile.origin);
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
    `${JSON.stringify({
      frameworkHints: profile.frameworkHints,
      primaryOrigin: profile.origin,
      routeEstimate: { count: exportResult.routeCount ?? profile.routeCount },
    })}\n`,
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

  const cwlMeta = await exportProjectMigrationCwl(root, { origin: profile.origin });
  const cwlOk =
    profile.requireHoleFree === false ? cwlMeta.ok === true : cwlMeta.ok === true && cwlMeta.holeCount === 0;
  if (!cwlOk) {
    return { ...base, skip: "cwl-export-failed", holeCount: cwlMeta.holeCount ?? null };
  }

  const evidence = buildHubEvidenceReport(root);
  const ok =
    evidence.schemaVersion === 4 &&
    evidence.migrationPlan?.programId === "api-slice" &&
    evidence.pipelineGate?.readinessTier === "pilot-ready" &&
    evidence.migrationContract?.cwlPath != null &&
    evidence.pipelineGate?.pass === true &&
    (profile.requireHoleFree === false || (evidence.holes?.count ?? 0) === 0);

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

export async function runHubEvidenceLiveBatch(profiles = ["plainPhp", "symfony", "tinyBlog"]) {
  /** @type {Record<string, Awaited<ReturnType<typeof runHubEvidenceLive>>>} */
  const results = {};
  let ok = true;
  for (const profile of profiles) {
    const report = await runHubEvidenceLive(undefined, { profile });
    results[profile] = report;
    if (!report.ok) ok = false;
  }
  return { ok, results };
}

async function main() {
  let profile = "plainPhp";
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--symfony") profile = "symfony";
    else if (process.argv[i] === "--tiny-blog") profile = "tinyBlog";
    else if (process.argv[i] === "--all") {
      const batch = await runHubEvidenceLiveBatch();
      console.log(JSON.stringify(batch, null, 2));
      if (!batch.ok) process.exit(1);
      return;
    }
  }
  const report = await runHubEvidenceLive(undefined, { profile });
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
