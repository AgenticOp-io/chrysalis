#!/usr/bin/env node
/** Chimera cutover origin batch: plain-php + symfony + express + Laravel-min (G411). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runChimeraCutoverSmoke } from "./hub-chimera-cutover-smoke.mjs";
import { runChimeraCutoverSymfonySmoke } from "./hub-chimera-cutover-symfony-smoke.mjs";
import { runChimeraCutoverExpressSmoke } from "./hub-chimera-cutover-express-smoke.mjs";
import { runChimeraCutoverLaravelMinSmoke } from "./hub-chimera-cutover-laravel-min-smoke.mjs";

export const HUB_CHIMERA_CUTOVER_ORIGIN_BATCH_KIND = "chrysalis.hub.chimera-cutover-origin-batch-smoke";
export const HUB_CHIMERA_CUTOVER_ORIGIN_BATCH_SCHEMA_VERSION = 1;

export async function runChimeraCutoverOriginBatchSmoke() {
  const plainPhp = await runChimeraCutoverSmoke();
  const symfony = await runChimeraCutoverSymfonySmoke();
  const express = await runChimeraCutoverExpressSmoke();
  const laravelMin = await runChimeraCutoverLaravelMinSmoke();
  return {
    kind: HUB_CHIMERA_CUTOVER_ORIGIN_BATCH_KIND,
    schemaVersion: HUB_CHIMERA_CUTOVER_ORIGIN_BATCH_SCHEMA_VERSION,
    ok: plainPhp.ok === true && symfony.ok && express.ok && laravelMin.ok,
    plainPhp,
    symfony,
    express,
    laravelMin,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runChimeraCutoverOriginBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
