#!/usr/bin/env node
/** WISP full-site cutover policy gate (G7706). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWispFullSiteCharter } from "./hub-wisp-full-site-charter.mjs";

export const WISP_FULL_SITE_CUTOVER_SMOKE_KIND = "chrysalis.wisp.full-site-cutover-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispFullSiteCutoverGate(_opts = {}) {
  const loaded = loadWispFullSiteCharter();
  if (!loaded.ok) return { ok: false, charter: loaded };
  const charter = loaded.charter;
  const gatewayPath = join(scriptRoot, "scripts/wisp-cwl-chimera-gateway.mjs");
  const pipelinePath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-pipeline.config.json");
  const gatewayText = existsSync(gatewayPath) ? readFileSync(gatewayPath, "utf8") : "";
  const pipeline = existsSync(pipelinePath) ? JSON.parse(readFileSync(pipelinePath, "utf8")) : {};
  const policyOk =
    charter.cutover?.chimeraSvelteFallback === false &&
    charter.cutover?.runtime === "runtime-cwl" &&
    charter.cutover?.verifyReplayRequired === true;
  const nativeOk = pipeline.gce?.svelteSidecar !== true;
  const ok = policyOk === true;
  return {
    kind: WISP_FULL_SITE_CUTOVER_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    policyOk,
    nativeOk,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispFullSiteCutoverGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-full-site-cutover-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
