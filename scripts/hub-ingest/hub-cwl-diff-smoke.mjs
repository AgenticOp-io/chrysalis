#!/usr/bin/env node
/** CWL semantic diff smoke on gold fixture (G242). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diffCwlFiles } from "./hub-cwl-diff.mjs";

export const HUB_CWL_DIFF_SMOKE_KIND = "chrysalis.hub.cwl-diff-smoke";
export const HUB_CWL_DIFF_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const diffFixture = join(scriptRoot, "fixtures/hub-gold-cwl-diff");

export function runCwlDiffSmoke() {
  const basePath = join(diffFixture, "base.cwl");
  const headPath = join(diffFixture, "head.cwl");
  const diff = diffCwlFiles(basePath, headPath);
  const changed = (diff.summary?.changed ?? 0) + (diff.summary?.added ?? diff.added?.length ?? 0) + (diff.summary?.removed ?? diff.removed?.length ?? 0);
  return {
    kind: HUB_CWL_DIFF_SMOKE_KIND,
    schemaVersion: HUB_CWL_DIFF_SMOKE_SCHEMA_VERSION,
    ok: changed >= 1 && (diff.added?.length ?? 0) + (diff.removed?.length ?? 0) + (diff.changed?.length ?? 0) >= 1,
    changedRoutes: changed,
    added: diff.added?.length ?? 0,
    removed: diff.removed?.length ?? 0,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runCwlDiffSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
