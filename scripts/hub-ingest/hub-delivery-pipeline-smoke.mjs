#!/usr/bin/env node
/** Delivery pipeline smokes: site intel, assessment, chimera, post-translate bundle (G216-G219). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSiteIntelligenceReport } from "./hub-site-intelligence.mjs";
import { buildMigrationAssessment } from "./hub-migration-assessment.mjs";
import { buildChimeraCutoverRunbook } from "./hub-chimera-cutover.mjs";
import { writeHubPostTranslateArtifacts } from "./hub-post-translate-artifacts.mjs";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { ensureProjectWebir } from "./hub-project-to-cwl-gates.mjs";

export const HUB_DELIVERY_PIPELINE_SMOKE_KIND = "chrysalis.hub.delivery-pipeline-smoke";
export const HUB_DELIVERY_PIPELINE_SMOKE_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @type {Record<string, { rel: string, origin: string, minRoutes: number }>} */
export const DELIVERY_PIPELINE_FIXTURES = {
  plainPhp: { rel: "fixtures/hub-flagship-plain-php", origin: "php", minRoutes: 20 },
  symfony: { rel: "fixtures/hub-flagship-symfony", origin: "php", minRoutes: 20 },
  express: { rel: "fixtures/hub-flagship-express", origin: "javascript", minRoutes: 20 },
};

const defaultFixture = join(scriptRoot, DELIVERY_PIPELINE_FIXTURES.plainPhp.rel);

/**
 * @param {string} [projectDir]
 */
export async function runSiteIntelligenceSmoke(projectDir = defaultFixture) {
  const root = resolve(projectDir);
  if (!existsSync(join(root, "chrysalis.routes.json"))) {
    return { ok: false, skip: "missing-routes-manifest" };
  }
  const report = await buildSiteIntelligenceReport(root);
  return {
    ok: report.primaryOrigin === "php" && (report.routeEstimate?.count ?? 0) >= 20,
    routeCount: report.routeEstimate?.count ?? null,
    frameworkHints: report.frameworkHints ?? [],
  };
}

/**
 * @param {string} [projectDir]
 */
export async function runMigrationAssessmentSmoke(projectDir = defaultFixture) {
  const root = resolve(projectDir);
  const report = await buildMigrationAssessment({ projectDir: root, origin: "php", output: "hono" });
  return {
    ok: Boolean(report.readinessTier) && Boolean(report.program?.id),
    readinessTier: report.readinessTier ?? null,
    programId: report.program?.id ?? null,
  };
}

/**
 * @param {string} [projectDir]
 */
export async function runChimeraCutoverSmoke(projectDir = defaultFixture) {
  const root = resolve(projectDir);
  const report = await buildChimeraCutoverRunbook({ projectDir: root, origin: "php", outputs: ["hono"] });
  return {
    ok: Array.isArray(report.phases) && report.phases.length >= 3,
    phaseCount: report.phases?.length ?? null,
  };
}

/**
 * @param {string} [projectDir]
 */
export async function runPostTranslateDeliverySmoke(projectDir = defaultFixture, opts = {}) {
  const root = resolve(projectDir);
  const origin = opts.origin ?? "php";
  const output = opts.output ?? "hono";
  if (origin === "php") {
    await exportPhpHubWebir(root);
  } else {
    await ensureProjectWebir(root, origin);
  }
  const bundle = await writeHubPostTranslateArtifacts(root, { origin, output });
  const written = bundle.written ?? {};
  const ok =
    written.siteIntelligence?.ok === true &&
    written.pathAdvice?.ok === true &&
    written.migrationAssessment?.ok === true &&
    written.chimeraCutover?.ok === true;
  return { ok, written: Object.fromEntries(Object.entries(written).map(([k, v]) => [k, v?.ok === true])) };
}

export async function runDeliveryPipelineSmoke(projectDir = defaultFixture, opts = {}) {
  const root = resolve(projectDir);
  const profileKey = opts.profile ?? "plainPhp";
  const profile = DELIVERY_PIPELINE_FIXTURES[profileKey] ?? DELIVERY_PIPELINE_FIXTURES.plainPhp;
  const fixture = profile.rel;
  const origin = opts.origin ?? profile.origin;
  const siteIntelligence = await runSiteIntelligenceSmoke(root);
  const migrationAssessment = await runMigrationAssessmentSmoke(root);
  const chimeraCutover = await runChimeraCutoverSmoke(root);
  const postTranslateDelivery = await runPostTranslateDeliverySmoke(root, { origin, output: "hono" });
  const ok =
    siteIntelligence.ok &&
    migrationAssessment.ok &&
    chimeraCutover.ok &&
    postTranslateDelivery.ok &&
    (siteIntelligence.routeCount ?? 0) >= profile.minRoutes;
  return {
    kind: HUB_DELIVERY_PIPELINE_SMOKE_KIND,
    schemaVersion: HUB_DELIVERY_PIPELINE_SMOKE_SCHEMA_VERSION,
    profile: profileKey,
    fixture,
    origin,
    ok,
    siteIntelligence,
    migrationAssessment,
    chimeraCutover,
    postTranslateDelivery,
    generatedAt: new Date().toISOString(),
  };
}

export async function runDeliveryPipelineBatch(profiles = ["plainPhp", "symfony", "express"]) {
  /** @type {Record<string, Awaited<ReturnType<typeof runDeliveryPipelineSmoke>>>} */
  const results = {};
  let ok = true;
  for (const profile of profiles) {
    const fixture = DELIVERY_PIPELINE_FIXTURES[profile]?.rel;
    if (!fixture) continue;
    const report = await runDeliveryPipelineSmoke(join(scriptRoot, fixture), { profile });
    results[profile] = report;
    if (!report.ok) ok = false;
  }
  return { ok, results };
}

async function main() {
  if (process.argv.includes("--all")) {
    const batch = await runDeliveryPipelineBatch();
    console.log(JSON.stringify(batch, null, 2));
    if (!batch.ok) process.exit(1);
    return;
  }
  let projectDir = defaultFixture;
  let profile = "plainPhp";
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--symfony") profile = "symfony";
    else if (process.argv[i] === "--express") profile = "express";
    else if (process.argv[i] === "--project" && process.argv[i + 1]) projectDir = resolve(process.argv[++i]);
  }
  const fixture = DELIVERY_PIPELINE_FIXTURES[profile]?.rel;
  const report = await runDeliveryPipelineSmoke(
    profile === "plainPhp" ? projectDir : join(scriptRoot, fixture ?? DELIVERY_PIPELINE_FIXTURES.plainPhp.rel),
    { profile },
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.siteIntelligence?.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
