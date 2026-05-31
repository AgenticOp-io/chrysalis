#!/usr/bin/env node
/** Chimera cutover smoke on Symfony flagship (G299). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runChimeraCutoverSmoke } from "./hub-chimera-cutover-smoke.mjs";

export const HUB_CHIMERA_CUTOVER_SYMFONY_SMOKE_KIND = "chrysalis.hub.chimera-cutover-symfony-smoke";
export const HUB_CHIMERA_CUTOVER_SYMFONY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const symfonyFixture = join(scriptRoot, "fixtures/hub-flagship-symfony");

export async function runChimeraCutoverSymfonySmoke() {
  const report = await runChimeraCutoverSmoke(symfonyFixture);
  return {
    kind: HUB_CHIMERA_CUTOVER_SYMFONY_SMOKE_KIND,
    schemaVersion: HUB_CHIMERA_CUTOVER_SYMFONY_SMOKE_SCHEMA_VERSION,
    ok: report.ok === true,
    phaseCount: report.phaseCount ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runChimeraCutoverSymfonySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
