/**
 * Project migration CWL: prefer external contract import (OpenAPI/HAR) over WebIR projection.
 * Wired into `hub-translate` and `hub-migration-contract` (G140).
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { discoverContractArtifacts } from "./discover-contract-artifacts.mjs";
import {
  exportProjectMigrationCwl,
  HUB_CWL_EXPORT_KIND,
  HUB_CWL_EXPORT_SCHEMA_VERSION,
} from "./hub-project-cwl-export.mjs";
import { renderOpenApiCwl } from "./hub-openapi-to-cwl.mjs";
import { renderHarCwl } from "./hub-har-to-cwl.mjs";

/**
 * Write `.chrysalis/migration.cwl` from the best available source:
 * OpenAPI import > HAR import > WebIR projection.
 * @param {string} projectDir
 * @param {{ origin?: string, forceWebir?: boolean }} [opts]
 */
export async function exportProjectMigrationCwlFromContractOrWebir(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const origin = opts.origin ?? "php";
  const outDir = join(root, ".chrysalis");
  const cwlPath = join(outDir, "migration.cwl");

  if (!opts.forceWebir) {
    const contracts = await discoverContractArtifacts(root);
    if (contracts.openapi) {
      return writeImportedMigrationCwl({
        root,
        origin,
        source: "openapi-import",
        contractPath: contracts.openapi,
        cwlPath,
        render: () => {
          const doc = JSON.parse(readFileSync(contracts.openapi, "utf8"));
          return renderOpenApiCwl(doc, { moduleName: "migration", title: doc?.info?.title ?? "openapi" });
        },
      });
    }
    if (contracts.har) {
      return writeImportedMigrationCwl({
        root,
        origin,
        source: "har-import",
        contractPath: contracts.har,
        cwlPath,
        render: () => {
          const doc = JSON.parse(readFileSync(contracts.har, "utf8"));
          return renderHarCwl(doc, { moduleName: "migration" });
        },
      });
    }
  }

  const webirMeta = await exportProjectMigrationCwl(root, { origin });
  if (webirMeta.ok) {
    webirMeta.source = "webir-projection";
  }
  return webirMeta;
}

/**
 * @param {object} opts
 */
async function writeImportedMigrationCwl(opts) {
  const { root, origin, source, contractPath, cwlPath, render } = opts;
  const { text, holeCount, routeCount } = render();
  await mkdir(join(root, ".chrysalis"), { recursive: true });
  await writeFile(cwlPath, text, "utf8");
  const meta = {
    kind: HUB_CWL_EXPORT_KIND,
    schemaVersion: HUB_CWL_EXPORT_SCHEMA_VERSION,
    ok: true,
    origin,
    source,
    contractPath,
    cwlPath,
    routeCount,
    holeCount,
    holeFree: routeCount - holeCount,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(join(root, ".chrysalis", "cwl-export.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return meta;
}

/**
 * Resolve which contract source would be used (for evidence / operator UI).
 * @param {string} projectDir
 */
export async function resolveMigrationCwlSource(projectDir) {
  const contracts = await discoverContractArtifacts(resolve(projectDir));
  if (contracts.openapi) return { source: "openapi-import", contractPath: contracts.openapi };
  if (contracts.har) return { source: "har-import", contractPath: contracts.har };
  const webirPath = join(resolve(projectDir), ".chrysalis", `hub.${"php"}.webir.json`);
  if (existsSync(webirPath) || existsSync(join(resolve(projectDir), ".chrysalis", "ingested.webir.json"))) {
    return { source: "webir-projection", contractPath: null };
  }
  return { source: "none", contractPath: null };
}
