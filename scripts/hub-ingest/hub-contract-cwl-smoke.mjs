#!/usr/bin/env node
/**
 * Contract-first migration CWL smoke: OpenAPI import + WebIR projection (G186).
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportProjectMigrationCwlFromContractOrWebir } from "./hub-contract-cwl-import.mjs";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";

export const HUB_CONTRACT_CWL_SMOKE_KIND = "chrysalis.hub.contract-cwl-smoke";
export const HUB_CONTRACT_CWL_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const openapiFixture = join(scriptRoot, "fixtures/hub-gold-openapi-cwl");
const plainPhpFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

/**
 * @param {object} [opts]
 */
export async function runContractCwlSmoke(opts = {}) {
  const openapiDir = resolve(opts.openapiDir ?? openapiFixture);
  const webirDir = resolve(opts.webirDir ?? plainPhpFixture);

  let openapiMeta = { ok: false, skip: "missing-openapi-fixture" };
  if (existsSync(join(openapiDir, "openapi.json"))) {
    openapiMeta = await exportProjectMigrationCwlFromContractOrWebir(openapiDir, { origin: "cwl" });
  }

  let webirMeta = { ok: false, skip: "missing-webir-fixture" };
  if (existsSync(join(webirDir, "chrysalis.routes.json"))) {
    const exported = await exportPhpHubWebir(webirDir);
    if (exported.ok) {
      webirMeta = await exportProjectMigrationCwlFromContractOrWebir(webirDir, { origin: "php" });
    } else {
      webirMeta = { ok: false, skip: exported.skip ?? "webir-export-failed" };
    }
  }

  const ok =
    openapiMeta.ok === true &&
    openapiMeta.source === "openapi-import" &&
    webirMeta.ok === true &&
    webirMeta.source === "webir-projection" &&
    (webirMeta.holeCount ?? 1) === 0;

  return {
    kind: HUB_CONTRACT_CWL_SMOKE_KIND,
    schemaVersion: HUB_CONTRACT_CWL_SMOKE_SCHEMA_VERSION,
    ok,
    openapiImport: {
      ok: openapiMeta.ok === true,
      source: openapiMeta.source ?? null,
      routeCount: openapiMeta.routeCount ?? null,
      holeCount: openapiMeta.holeCount ?? null,
      fixture: "fixtures/hub-gold-openapi-cwl",
    },
    webirProjection: {
      ok: webirMeta.ok === true,
      source: webirMeta.source ?? null,
      routeCount: webirMeta.routeCount ?? null,
      holeCount: webirMeta.holeCount ?? null,
      fixture: "fixtures/hub-flagship-plain-php",
    },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runContractCwlSmoke();
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
