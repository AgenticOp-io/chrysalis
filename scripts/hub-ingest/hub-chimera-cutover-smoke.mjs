#!/usr/bin/env node
/** Chimera cutover standalone smoke (G268). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildChimeraCutoverRunbook } from "./hub-chimera-cutover.mjs";

export const HUB_CHIMERA_CUTOVER_SMOKE_KIND = "chrysalis.hub.chimera-cutover-smoke";
export const HUB_CHIMERA_CUTOVER_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

export async function runChimeraCutoverSmoke(projectDir = defaultFixture) {
  const report = await buildChimeraCutoverRunbook({ projectDir: resolve(projectDir), origin: "php", outputs: ["hono"] });
  return {
    kind: HUB_CHIMERA_CUTOVER_SMOKE_KIND,
    schemaVersion: HUB_CHIMERA_CUTOVER_SMOKE_SCHEMA_VERSION,
    ok: Array.isArray(report.phases) && report.phases.length >= 3,
    phaseCount: report.phases?.length ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runChimeraCutoverSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
