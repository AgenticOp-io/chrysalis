#!/usr/bin/env node
/** Chimera cutover smoke on Laravel-min scaffold (G324). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildChimeraCutoverRunbook } from "./hub-chimera-cutover.mjs";
import { ensureProjectWebir } from "./hub-project-to-cwl-gates.mjs";

export const HUB_CHIMERA_CUTOVER_LARAVEL_MIN_SMOKE_KIND = "chrysalis.hub.chimera-cutover-laravel-min-smoke";
export const HUB_CHIMERA_CUTOVER_LARAVEL_MIN_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const laravelMinFixture = join(scriptRoot, "flagship/laravel-min");

export async function runChimeraCutoverLaravelMinSmoke(projectDir = laravelMinFixture) {
  const root = resolve(projectDir);
  await ensureProjectWebir(root, "php");
  const report = await buildChimeraCutoverRunbook({ projectDir: root, origin: "php", outputs: ["hono"] });
  return {
    kind: HUB_CHIMERA_CUTOVER_LARAVEL_MIN_SMOKE_KIND,
    schemaVersion: HUB_CHIMERA_CUTOVER_LARAVEL_MIN_SMOKE_SCHEMA_VERSION,
    ok: Array.isArray(report.phases) && report.phases.length >= 3,
    phaseCount: report.phases?.length ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runChimeraCutoverLaravelMinSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
