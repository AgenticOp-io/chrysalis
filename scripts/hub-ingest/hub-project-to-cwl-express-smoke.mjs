#!/usr/bin/env node
/** Project-to-CWL express dedicated smoke (G311). */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportProjectMigrationCwl } from "./hub-project-cwl-export.mjs";
import { ensureProjectWebir } from "./hub-project-to-cwl-gates.mjs";
import { loadWebir } from "./shared.mjs";
import { summarizeCwlProjection } from "./hub-webir-routes.mjs";

export const HUB_PROJECT_TO_CWL_EXPRESS_SMOKE_KIND = "chrysalis.hub.project-to-cwl-express-smoke";
export const HUB_PROJECT_TO_CWL_EXPRESS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const expressFixture = join(scriptRoot, "fixtures/hub-flagship-express");

export async function runProjectToCwlExpressSmoke(projectDir = expressFixture) {
  const root = resolve(projectDir);
  const webirReady = await ensureProjectWebir(root, "javascript");
  if (!webirReady.ok) {
    return {
      kind: HUB_PROJECT_TO_CWL_EXPRESS_SMOKE_KIND,
      schemaVersion: HUB_PROJECT_TO_CWL_EXPRESS_SMOKE_SCHEMA_VERSION,
      ok: false,
      skip: webirReady.skip ?? "webir-not-ready",
      generatedAt: new Date().toISOString(),
    };
  }
  const exported = await exportProjectMigrationCwl(root, { origin: "javascript" });
  const webirPkg = await loadWebir();
  const raw = JSON.parse(await readFile(join(root, ".chrysalis", "hub.javascript.webir.json"), "utf8"));
  const projection = summarizeCwlProjection(webirPkg.moduleFromGoldenSnapshot(raw));
  return {
    kind: HUB_PROJECT_TO_CWL_EXPRESS_SMOKE_KIND,
    schemaVersion: HUB_PROJECT_TO_CWL_EXPRESS_SMOKE_SCHEMA_VERSION,
    ok: exported.ok === true && projection.holeFree === projection.total && projection.total >= 20,
    routeCount: projection.total ?? null,
    holeFree: projection.holeFree ?? null,
    cwlPath: exported.cwlPath ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runProjectToCwlExpressSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
