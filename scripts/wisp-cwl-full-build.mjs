#!/usr/bin/env node
/**
 * Phase 12 Phase 0 full build: lift (optional) + API proxy CWL + inventory + hole manifest + fixture sync.
 * Usage: node scripts/wisp-cwl-full-build.mjs [--root WISP/Module_Manager] [--skip-lift]
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { generateWispApiProxyCwl } from "./wisp-cwl-generate-api-proxy-cwl.mjs";
import { buildWispScenarioInventory } from "./wisp-cwl-scenario-inventory.mjs";
import { buildWispHoleManifest } from "./wisp-cwl-hole-manifest.mjs";
import { applyWispPhase13Surfaces } from "./wisp-cwl-apply-phase13-surfaces.mjs";
import { reconcilePreviewFromRoutesCwl } from "./wisp-cwl-apply-module-routes-lib.mjs";
import { writeFileSync } from "node:fs";
import { isWispFullSiteProgramClosed, applyPostG7790ScenarioMetadata } from "./wisp-cwl-post-g7790.mjs";
import { applyWispPostG7790Chain } from "./wisp-cwl-apply-post-g7790-chain.mjs";

export const WISP_CWL_FULL_BUILD_KIND = "chrysalis.wisp-cwl-full-build";
export const WISP_CWL_FULL_BUILD_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const defaultRoot =
  process.env.CHRYSALIS_WISP_ROOT ??
  process.env.WISP_MODULE_DIR ??
  "C:/Users/david/Downloads/WISPTools/Module_Manager";

function runNode(script, args = []) {
  const r = spawnSync(process.execPath, [join(scriptRoot, script), ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    shell: false,
  });
  return { status: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

/**
 * @param {object} [opts]
 * @param {string} [opts.wispRoot]
 * @param {boolean} [opts.skipLift]
 */
export function runWispCwlFullBuild(opts = {}) {
  const wispRoot = resolve(opts.wispRoot ?? defaultRoot);
  const skipLift = opts.skipLift === true;
  const steps = [];

  if (!skipLift && existsSync(wispRoot)) {
    steps.push({ step: "lift", ...runNode("scripts/hub-ingest/lift-to-webir.mjs", [wispRoot, "--language", "svelte"]) });
    steps.push({ step: "emit-cwl", ...runNode("scripts/hub-ingest/emit-cwl-from-hub.mjs", [wispRoot, "--origin", "svelte"]) });
  } else {
    steps.push({ step: "lift", status: 0, skip: skipLift ? "skip-lift" : "missing-wisp-root" });
  }

  const api = generateWispApiProxyCwl({
    mode: isWispFullSiteProgramClosed() ? "native" : "proxy",
  });
  steps.push({ step: "api-proxy-cwl", status: api.ok ? 0 : 1, routeEntries: api.routeEntries ?? null, mode: api.mode ?? null });

  const inventory = buildWispScenarioInventory(wispRoot);
  if (isWispFullSiteProgramClosed() && inventory.scenarios) {
    inventory.scenarios = applyPostG7790ScenarioMetadata(inventory.scenarios);
    inventory.postG7790 = true;
  }
  const inventoryOut = join(fixtureDir, "wisp-scenarios.v1.json");
  let inventoryOk = inventory.ok;
  if (inventory.ok) {
    writeFileSync(inventoryOut, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  } else if (existsSync(inventoryOut)) {
    inventoryOk = true;
  }
  steps.push({
    step: "scenario-inventory",
    status: inventoryOk ? 0 : 1,
    scenarioCount: inventory.scenarios?.length ?? 0,
    moduleCount: inventory.modules?.length ?? 0,
    skip: inventory.ok ? undefined : inventoryOk ? "used-fixture" : undefined,
  });

  const wispRoutes = join(wispRoot, "generated/cwl/routes.cwl");
  const fixtureRoutes = join(fixtureDir, "routes.cwl");
  if (!isWispFullSiteProgramClosed() && !skipLift && existsSync(wispRoutes)) {
    mkdirSync(fixtureDir, { recursive: true });
    copyFileSync(wispRoutes, fixtureRoutes);
    const previewSrc = join(wispRoot, ".chrysalis/cwl-preview.json");
    const previewDst = join(fixtureDir, "cwl-preview.json");
    if (existsSync(previewSrc)) copyFileSync(previewSrc, previewDst);
  }

  if (isWispFullSiteProgramClosed()) {
    const chain = applyWispPostG7790Chain({ previewPath: join(fixtureDir, "cwl-preview.json") });
    steps.push({ step: "post-g7790-apply-chain", status: chain.ok ? 0 : 1, chainOk: chain.ok === true });
  } else {
    applyWispPhase13Surfaces();
    reconcilePreviewFromRoutesCwl();
  }

  const previewDst = join(fixtureDir, "cwl-preview.json");

  const holeManifest = buildWispHoleManifest({
    previewPath: previewDst,
  });
  steps.push({
    step: "hole-manifest",
    status: holeManifest.ok ? 0 : 1,
    totalUiHoles: holeManifest.totalUiHoles ?? null,
    routeCount: holeManifest.routeCount ?? null,
  });

  const ok = steps.every((s) => s.status === 0) && holeManifest.ok === true;
  return {
    kind: WISP_CWL_FULL_BUILD_KIND,
    schemaVersion: WISP_CWL_FULL_BUILD_SCHEMA_VERSION,
    ok,
    wispRoot,
    skipLift,
    steps,
    holeManifest,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let root = defaultRoot;
  let skipLift = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) root = argv[++i];
    else if (argv[i] === "--skip-lift") skipLift = true;
  }
  return { root, skipLift };
}

async function main() {
  const { root, skipLift } = parseArgs(process.argv);
  const r = runWispCwlFullBuild({ wispRoot: root, skipLift });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-full-build")) main().catch((e) => { console.error(e); process.exit(1); });
