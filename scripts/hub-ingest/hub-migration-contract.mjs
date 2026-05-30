#!/usr/bin/env node
/**
 * Migration contract bundle: CWL + OpenAPI + export metadata + holes manifest (G98/G109).
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportProjectMigrationCwlFromContractOrWebir } from "./hub-contract-cwl-import.mjs";
import { exportProjectOpenApi } from "./hub-cwl-openapi-export.mjs";
import { writeProjectCwlDiffArtifacts } from "./hub-cwl-diff.mjs";

export const HUB_MIGRATION_CONTRACT_KIND = "chrysalis.hub.migration-contract";
export const HUB_MIGRATION_CONTRACT_SCHEMA_VERSION = 2;

/**
 * @param {string} projectDir
 * @param {{ origin?: string, write?: boolean, baseCwl?: string }} [opts]
 */
export async function buildMigrationContractReport(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const origin = opts.origin ?? "php";
  const write = opts.write !== false;

  let cwlExport = null;
  let openapiExport = null;
  if (write) {
    try {
      cwlExport = await exportProjectMigrationCwlFromContractOrWebir(root, { origin });
    } catch {
      cwlExport = { ok: false, reason: "cwl-export-failed" };
    }
    try {
      openapiExport = await exportProjectOpenApi(root, { origin });
    } catch {
      openapiExport = { ok: false, reason: "openapi-export-failed" };
    }
  }

  const cwlPath = join(root, ".chrysalis", "migration.cwl");
  const openapiPath = join(root, ".chrysalis", "migration.openapi.json");
  const cwlMetaPath = join(root, ".chrysalis", "cwl-export.json");
  const holesPath = join(root, "chrysalis.holes.json");

  let holeCount = null;
  if (existsSync(holesPath)) {
    try {
      const h = JSON.parse(readFileSync(holesPath, "utf8"));
      const holes = Array.isArray(h.holes) ? h.holes : Array.isArray(h) ? h : [];
      holeCount = holes.length;
    } catch {
      holeCount = null;
    }
  }

  const artifacts = {
    cwl: existsSync(cwlPath) ? cwlPath : null,
    openapi: existsSync(openapiPath) ? openapiPath : null,
    cwlExportMeta: existsSync(cwlMetaPath) ? cwlMetaPath : null,
    holes: existsSync(holesPath) ? holesPath : null,
    cwlDiffJson: null,
    cwlDiffMarkdown: null,
  };

  let cwlDiff = null;
  if (write && artifacts.cwl) {
    try {
      cwlDiff = await writeProjectCwlDiffArtifacts(root, { baseCwl: opts.baseCwl });
      if (cwlDiff) {
        artifacts.cwlDiffJson = cwlDiff.jsonPath;
        artifacts.cwlDiffMarkdown = cwlDiff.mdPath;
      }
    } catch {
      cwlDiff = null;
    }
  }

  const complete =
    artifacts.cwl !== null &&
    artifacts.openapi !== null &&
    (holeCount === null || holeCount === 0);

  return {
    kind: HUB_MIGRATION_CONTRACT_KIND,
    schemaVersion: HUB_MIGRATION_CONTRACT_SCHEMA_VERSION,
    ok: complete,
    projectDir: root,
    origin,
    artifacts,
    exports: { cwl: cwlExport, openapi: openapiExport },
    cwlDiff,
    holes: { count: holeCount },
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let projectDir = null;
  let jsonOut = null;
  let origin = "php";
  let readOnly = false;
  let baseCwl = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--base" && argv[i + 1]) baseCwl = resolve(argv[++i]);
    else if (argv[i] === "--read-only") readOnly = true;
  }
  return { projectDir, jsonOut, origin, readOnly, baseCwl };
}

async function main() {
  const { projectDir, jsonOut, origin, readOnly, baseCwl } = parseArgs(process.argv);
  if (!projectDir) {
    console.error(
      "usage: hub-migration-contract.mjs --project <dir> [--origin php] [--base base.cwl] [--json-out path] [--read-only]",
    );
    process.exit(1);
  }
  const report = await buildMigrationContractReport(projectDir, { origin, write: !readOnly, baseCwl });
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
