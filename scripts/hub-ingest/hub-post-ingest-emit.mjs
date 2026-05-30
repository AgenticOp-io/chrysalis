#!/usr/bin/env node
/**
 * Post ingest+emit delivery: contract export + delivery artifacts (G148).
 * Used by chrysalis-ingest-emit hub runner (does not re-run ingest/emit).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportProjectMigrationCwlFromContractOrWebir } from "./hub-contract-cwl-import.mjs";
import { writeProjectCwlDiffArtifacts } from "./hub-cwl-diff.mjs";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";
import { writeHubPostTranslateArtifacts } from "./hub-post-translate-artifacts.mjs";
import { writeProjectVerifyGapsArtifacts } from "./hub-verify-gaps-ingest.mjs";

export const HUB_POST_INGEST_EMIT_KIND = "chrysalis.hub.post-ingest-emit";
export const HUB_POST_INGEST_EMIT_SCHEMA_VERSION = 1;

/**
 * @param {string} projectDir
 * @param {{ origin: string, output: string }} opts
 */
export async function runHubPostIngestEmit(projectDir, opts) {
  const root = resolve(projectDir);
  const origin = opts.origin;
  const output = opts.output;

  let cwlExport = null;
  let openapiExport = null;
  let cwlDiff = null;
  try {
    cwlExport = await exportProjectMigrationCwlFromContractOrWebir(root, { origin });
  } catch {
    cwlExport = { ok: false, reason: "cwl-export-failed" };
  }
  if (origin === "php") {
    try {
      openapiExport = await exportProjectOpenApi(root, { origin });
    } catch {
      openapiExport = { ok: false, reason: "openapi-export-failed" };
    }
  }
  try {
    cwlDiff = await writeProjectCwlDiffArtifacts(root, {});
  } catch {
    cwlDiff = null;
  }

  let deliveryArtifacts = null;
  try {
    deliveryArtifacts = await writeHubPostTranslateArtifacts(root, { origin, output });
  } catch {
    deliveryArtifacts = null;
  }

  let verifyGapsIngest = null;
  try {
    verifyGapsIngest = await writeProjectVerifyGapsArtifacts(root);
  } catch {
    verifyGapsIngest = null;
  }

  return {
    kind: HUB_POST_INGEST_EMIT_KIND,
    schemaVersion: HUB_POST_INGEST_EMIT_SCHEMA_VERSION,
    projectDir: root,
    origin,
    output,
    cwlExport,
    openapiExport,
    cwlDiff,
    deliveryArtifacts,
    verifyGapsIngest: verifyGapsIngest
      ? { path: verifyGapsIngest.jsonPath, ok: verifyGapsIngest.report.ok, backlogCount: verifyGapsIngest.report.backlog.length }
      : null,
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
    throw new Error("usage: hub-post-ingest-emit.mjs --project <dir> --origin php --output hono");
  }
  return { projectDir, origin, output, jsonOut };
}

async function main() {
  const { projectDir, origin, output, jsonOut } = parseArgs(process.argv);
  const report = await runHubPostIngestEmit(projectDir, { origin, output });
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
