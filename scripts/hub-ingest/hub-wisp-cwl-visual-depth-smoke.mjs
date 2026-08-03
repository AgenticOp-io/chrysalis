#!/usr/bin/env node
/**
 * G9890/G9892 — CWL-native visual depth: original CSS map + hardware stylesheet in deploy path.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadWispPipelineConfig,
  patchOperatorGceDeployPipelineConfig,
} from "../wisp-cwl-gateway-config.mjs";
import { prepareWispCwlDeployBundle, syncWispOriginalCssAssets } from "../wisp-cwl-pipeline.mjs";
import { wispOriginalCssLink } from "../wisp-cwl-chimera-gateway.mjs";
import { resolveWispModuleRoot } from "../lib/wisp-origin-paths.mjs";

export const WISP_CWL_VISUAL_DEPTH_SMOKE_KIND = "chrysalis.wisp.cwl-visual-depth-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispCwlVisualDepthSmoke() {
  const config = loadWispPipelineConfig();
  const wispRoot = resolve(
    resolveWispModuleRoot(
      process.env.CHRYSALIS_WISP_ROOT ??
        process.env.WISP_MODULE_DIR ??
        config.defaultWispRoot,
    ),
  );
  const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
  const sync = syncWispOriginalCssAssets({ wispRoot, fixtureDir });
  const bundle = prepareWispCwlDeployBundle({ wispRoot, skipLift: true });
  const gatewayText = readFileSync(join(scriptRoot, "scripts/wisp-cwl-chimera-gateway.mjs"), "utf8");
  const mapBesideGateway =
    gatewayText.includes("wisp-cwl-original-css-map.json") &&
    gatewayText.includes("gatewayDir");
  const hardwareLink = wispOriginalCssLink("/modules/hardware");
  const hardwareCssInBundle = existsSync(
    join(scriptRoot, "generated/_wisp-cwl-poc-deploy/original-css/modules_hardware.css"),
  );
  const mapInBundle = existsSync(
    join(scriptRoot, "generated/_wisp-cwl-poc-deploy/wisp-cwl-original-css-map.json"),
  );
  const patched = patchOperatorGceDeployPipelineConfig(config);
  const nativeOk = patched.gce?.svelteSidecar === false && patched.gce?.cwlNativePrefixes === "*";
  const linkOk = hardwareLink.includes("/assets/original-css/modules_hardware.css");
  const ok =
    sync.ok === true &&
    bundle.ok === true &&
    mapBesideGateway &&
    hardwareCssInBundle &&
    mapInBundle &&
    linkOk &&
    nativeOk;

  return {
    kind: WISP_CWL_VISUAL_DEPTH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    syncOk: sync.ok === true,
    bundleOk: bundle.ok === true,
    mapBesideGateway,
    hardwareCssInBundle,
    mapInBundle,
    linkOk,
    hardwareLink,
    nativeOk,
    note: "CWL-native pages must link lifted Module_Manager CSS — not Svelte sidecar",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispCwlVisualDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-visual-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
