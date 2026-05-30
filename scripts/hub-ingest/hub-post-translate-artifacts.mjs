#!/usr/bin/env node
/**
 * Post-translate delivery artifacts: site intel, path advice, assessment, cutover (G146).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writePathAdviceArtifacts } from "./hub-apply-path-advice.mjs";
import { buildMigrationAssessment, writeMigrationAssessmentArtifacts } from "./hub-migration-assessment.mjs";
import { buildChimeraCutoverRunbook, writeChimeraCutoverArtifacts } from "./hub-chimera-cutover.mjs";
import { writeSiteIntelligenceArtifacts } from "./hub-site-intelligence.mjs";
import { writeProjectVerifyGapsArtifacts } from "./hub-verify-gaps-ingest.mjs";

export const HUB_POST_TRANSLATE_ARTIFACTS_KIND = "chrysalis.hub.post-translate-artifacts";
export const HUB_POST_TRANSLATE_ARTIFACTS_SCHEMA_VERSION = 1;

/**
 * @param {string} projectDir
 * @param {{ origin: string, output: string, programId?: string }} opts
 */
export async function writeHubPostTranslateArtifacts(projectDir, opts) {
  const root = resolve(projectDir);
  const origin = opts.origin;
  const output = opts.output;
  /** @type {Record<string, { ok: boolean, path?: string, error?: string }>} */
  const written = {};

  try {
    const site = await writeSiteIntelligenceArtifacts(root);
    written.siteIntelligence = { ok: true, path: site.jsonPath };
  } catch (e) {
    written.siteIntelligence = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  let programId = opts.programId;
  if (!programId && written.siteIntelligence.ok) {
    try {
      const assessmentProbe = await buildMigrationAssessment({ projectDir: root, origin, output });
      programId = assessmentProbe.program.id;
    } catch {
      programId = "api-slice";
    }
  }
  programId = programId ?? "api-slice";

  try {
    const pathAdvice = await writePathAdviceArtifacts(root, { origin, output, programId });
    written.pathAdvice = { ok: true, path: pathAdvice.jsonPath };
  } catch (e) {
    written.pathAdvice = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  try {
    const assessment = await buildMigrationAssessment({ projectDir: root, origin, output });
    const artifacts = await writeMigrationAssessmentArtifacts(root, assessment);
    written.migrationAssessment = { ok: true, path: artifacts.jsonPath, readinessTier: assessment.readinessTier };
  } catch (e) {
    written.migrationAssessment = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  try {
    const cutover = await buildChimeraCutoverRunbook({
      projectDir: root,
      origin,
      outputs: [output],
      programId,
    });
    const artifacts = await writeChimeraCutoverArtifacts(root, cutover);
    written.chimeraCutover = { ok: true, path: artifacts.jsonPath, readyForShadow: cutover.readyForShadow };
  } catch (e) {
    written.chimeraCutover = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  try {
    const gaps = await writeProjectVerifyGapsArtifacts(root);
    written.verifyGapsIngest = {
      ok: true,
      path: gaps.jsonPath,
      backlogCount: gaps.report.backlog.length,
      hasWork: gaps.report.backlog.length > 0,
    };
  } catch (e) {
    written.verifyGapsIngest = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  return {
    kind: HUB_POST_TRANSLATE_ARTIFACTS_KIND,
    schemaVersion: HUB_POST_TRANSLATE_ARTIFACTS_SCHEMA_VERSION,
    projectDir: root,
    origin,
    output,
    programId,
    written,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let projectDir = null;
  let origin = "php";
  let output = "hono";
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  if (!projectDir) {
    throw new Error("usage: hub-post-translate-artifacts.mjs --project <dir> --origin php --output hono");
  }
  return { projectDir, origin, output, jsonOut };
}

async function main() {
  const { projectDir, origin, output, jsonOut } = parseArgs(process.argv);
  const report = await writeHubPostTranslateArtifacts(projectDir, { origin, output });
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
