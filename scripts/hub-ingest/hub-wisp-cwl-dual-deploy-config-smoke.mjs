#!/usr/bin/env node
/** Dual deploy config smoke — validates Firebase + GCE profiles without live deploy. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WISP_DEPLOY_TARGET_PROFILES } from "../wisp-cwl-client-build.mjs";
import { loadWispPipelineConfig } from "../wisp-cwl-pipeline.mjs";
import { runWispFirebaseDeploy } from "../wisp-cwl-firebase-deploy.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_CWL_DUAL_DEPLOY_CONFIG_SMOKE_KIND = "chrysalis.wisp.dual-deploy-config-smoke";
export const WISP_CWL_DUAL_DEPLOY_CONFIG_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const configPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-pipeline.config.json");

/** G6330 — dual deploy profiles (Firebase + GCE chimera). */
export async function runWispCwlDualDeployConfigSmokeGate(opts = {}) {
  const progress = createSmokeProgress("wisp-cwl-dual-deploy-config");
  const t0 = progress.start("dual deploy config");

  const config = loadWispPipelineConfig();
  const deployTargets = config.deployTargets ?? {};
  const gceProfile = WISP_DEPLOY_TARGET_PROFILES.gce;
  const firebaseProfile = WISP_DEPLOY_TARGET_PROFILES.firebase;

  const checks = {
    configFile: existsSync(configPath),
    gceSection: Boolean(config.gce?.project && config.gce?.port),
    firebaseSection: Boolean(config.firebase?.hostingTarget),
    deployTargetsBoth: Boolean(deployTargets.gce && deployTargets.firebase),
    gceSameOriginFlag: gceProfile.env.VITE_CHRYSALIS_SAME_ORIGIN_API === "1",
    firebaseNoChimeraFlag: firebaseProfile.env.VITE_CHRYSALIS_SAME_ORIGIN_API !== "1",
    clientBuildScripts: existsSync(join(scriptRoot, "scripts/wisp-cwl-client-build.mjs")),
    firebaseDeployScript: existsSync(join(scriptRoot, "scripts/wisp-cwl-firebase-deploy.mjs")),
  };

  const firebaseDryRun = runWispFirebaseDeploy({ dryRun: true, skipBuild: true });
  checks.firebaseDryRunOk = firebaseDryRun.ok === true || firebaseDryRun.skip === "missing-firebase-json";

  const docPath = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  const docText = existsSync(docPath) ? readFileSync(docPath, "utf8") : "";
  checks.topologyDualDeployDoc =
    docText.includes("Topology and deploy") && docText.includes("Dual deploy");

  const ok = Object.values(checks).every(Boolean);
  progress.end("dual deploy config", ok, t0);

  return {
    kind: WISP_CWL_DUAL_DEPLOY_CONFIG_SMOKE_KIND,
    schemaVersion: WISP_CWL_DUAL_DEPLOY_CONFIG_SMOKE_SCHEMA_VERSION,
    ok,
    checks,
    firebaseDryRun,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlDualDeployConfigSmokeGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-dual-deploy-config-smoke")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
