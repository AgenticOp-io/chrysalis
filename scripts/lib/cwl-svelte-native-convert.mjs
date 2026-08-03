#!/usr/bin/env node
/**
 * G9850/G9860 — deepen Svelte→CWL native convert + wire LLM/IS (verify still disposes).
 *
 *   node scripts/wisp-cwl-svelte-native-convert.mjs [--root path] [--skip-lift] [--skip-llm-is] [--deploy]
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runWispCwlFullBuild } from "../wisp-cwl-full-build.mjs";
import { applyWispPackageUiLift } from "./cwl-package-ui-lift.mjs";
import { buildWispDemoManifest } from "../wisp-cwl-demo-manifest.mjs";
import { patchOperatorGceDeployPipelineConfig, loadWispPipelineConfig } from "./cwl-gateway-config.mjs";
import { inspectRoutesCwlIntegrity } from "./cwl-apply-surfaces.mjs";
import { resolveHubConvertIsRouting } from "../hub-ingest/hub-llm-convert-is-routing.mjs";
import { resolveWispModuleRoot } from "./wisp-origin-paths.mjs";

export const WISP_SVELTE_NATIVE_CONVERT_KIND = "chrysalis.wisp.svelte-native-convert";
export const WISP_SVELTE_NATIVE_CONVERT_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultRoot =
  resolveWispModuleRoot(process.env.CHRYSALIS_WISP_ROOT ?? process.env.WISP_MODULE_DIR);

function runNode(script, args = [], env = {}) {
  const r = spawnSync(process.execPath, [join(scriptRoot, script), ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, ...env },
  });
  return { status: r.status ?? 1, stdout: (r.stdout ?? "").slice(-2000), stderr: (r.stderr ?? "").slice(-2000) };
}

/**
 * @param {object} [opts]
 * @param {string} [opts.wispRoot]
 * @param {boolean} [opts.skipLift]
 * @param {boolean} [opts.skipLlmIs]
 * @param {boolean} [opts.deploy]
 */
export async function runWispSvelteNativeConvert(opts = {}) {
  const wispRoot = resolve(opts.wispRoot ?? defaultRoot);
  const skipLift = opts.skipLift === true;
  const skipLlmIs = opts.skipLlmIs === true || process.env.CHRYSALIS_WISP_SKIP_LLM_IS === "1";
  const deploy = opts.deploy === true || process.env.CHRYSALIS_WISP_DEPLOY_AFTER_CONVERT === "1";
  /** @type {object[]} */
  const steps = [];
  /** @type {object | null} */
  let liftSummary = null;
  /** @type {object | null} */
  let integrity = null;
  /** @type {object | null} */
  let isRouting = null;

  if (!existsSync(wispRoot)) {
    return {
      kind: WISP_SVELTE_NATIVE_CONVERT_KIND,
      schemaVersion: WISP_SVELTE_NATIVE_CONVERT_SCHEMA_VERSION,
      ok: false,
      skip: "missing-wisp-root",
      wispRoot,
    };
  }

  // Compatibility API: all Svelte-native WISP conversion now uses the same
  // canonical one-pass compiler as the operator pipeline.
  if (process.env.CHRYSALIS_WISP_LEGACY_NATIVE_CONVERT !== "1") {
    const { runWispCwlOnePass } = await import("../wisp-cwl-one-pass.mjs");
    return runWispCwlOnePass({
      wispRoot,
      bundle: true,
      deployGce: deploy,
    });
  }

  const patched = patchOperatorGceDeployPipelineConfig(loadWispPipelineConfig());
  const pipelinePath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-pipeline.config.json");
  writeFileSync(pipelinePath, `${JSON.stringify(patched, null, 2)}\n`, "utf8");
  steps.push({
    step: "pipeline-cwl-native",
    ok: patched.gce?.svelteSidecar === false && patched.gce?.cwlNativePrefixes === "*",
  });

  if (!skipLift) {
    const lift = await applyWispPackageUiLift({ wispRoot });
    liftSummary = {
      ok: lift.ok !== false,
      htmlPageCount: lift.htmlPageCount ?? null,
      uiAssets: lift.uiAssets ?? null,
      uiMarkup: lift.uiMarkup ?? null,
      skip: lift.skip,
    };
    steps.push({
      step: "package-ui-lift",
      ok: lift.ok !== false,
      kind: lift.kind,
      htmlPageCount: lift.htmlPageCount,
      skip: lift.skip,
    });
  } else {
    steps.push({ step: "package-ui-lift", ok: true, skip: "skip-lift" });
  }

  const full = runWispCwlFullBuild({ wispRoot, skipLift });
  steps.push({
    step: "full-build",
    ok: full.ok === true,
    kind: full.kind,
  });

  const bind = runNode("scripts/wisp-cwl-bind-showcase.mjs");
  steps.push({ step: "bind-showcase", ok: bind.status === 0, status: bind.status });

  const redirects = runNode("scripts/wisp-cwl-apply-client-redirects.mjs");
  steps.push({ step: "client-redirects", ok: redirects.status === 0, status: redirects.status });

  const routesPath = join(scriptRoot, "fixtures/hub-wisp-management/routes.cwl");
  if (existsSync(routesPath)) {
    integrity = inspectRoutesCwlIntegrity(undefined, routesPath);
    steps.push({
      step: "routes-integrity",
      ok: integrity.ok === true,
      junkCount: integrity.junkCount ?? null,
      rootRedirectOk: integrity.rootRedirectOk ?? null,
    });
  } else {
    steps.push({ step: "routes-integrity", ok: false, skip: "missing-routes-cwl" });
  }

  if (!skipLlmIs) {
    isRouting = await resolveHubConvertIsRouting({
      repoRoot: scriptRoot,
      origin: "svelte",
      output: "cwl",
      projectDir: wispRoot,
      domainId: "wisp-module-manager-svelte-cwl",
      nudge: "svelte-native-convert",
    });
    steps.push({
      step: "is-routing",
      ok: typeof isRouting.domainId === "string",
      domainId: isRouting.domainId,
      skipLlm: isRouting.skipLlm === true,
      tier: isRouting.tier ?? null,
      note: "IS propose-only — verify still required",
    });

    const llmSmoke = runNode("scripts/hub-ingest/hub-llm-convert-full-closed-regression-smoke.mjs");
    steps.push({
      step: "llm-convert-regression",
      ok: llmSmoke.status === 0,
      status: llmSmoke.status,
      note: "verify-gated LLM program regression — does not bypass oracle",
    });

    const isExport = runNode("scripts/web-llm-export-shorthand.mjs");
    let shorthandCount = null;
    try {
      const exported = JSON.parse(isExport.stdout.slice(isExport.stdout.indexOf("{")));
      shorthandCount = exported.count ?? exported.summary?.count ?? null;
    } catch {
      /* ignore parse — status is the gate */
    }
    steps.push({
      step: "export-shorthand",
      ok: isExport.status === 0,
      status: isExport.status,
      shorthandCount,
      note: "IS-T3/T4/T5 export for Migration OS cache",
    });
  } else {
    steps.push({ step: "is-routing", ok: true, skip: "skip-llm-is" });
    steps.push({ step: "llm-convert-regression", ok: true, skip: "skip-llm-is" });
    steps.push({ step: "export-shorthand", ok: true, skip: "skip-llm-is" });
  }

  const manifest = buildWispDemoManifest({});
  steps.push({
    step: "demo-manifest",
    ok: manifest.ok !== false && manifest.manifest?.operator === "wisp-cwl-native-gce",
  });

  let deployResult = null;
  if (deploy) {
    const d = runNode("scripts/wisp-cwl-pipeline.mjs", ["--deploy-gce", "--skip-lift", "--root", wispRoot], {
      CHRYSALIS_WISP_SKIP_SVELTE_SIDECAR: "1",
    });
    deployResult = { ok: d.status === 0, status: d.status };
    steps.push({ step: "deploy-gce-cwl-native", ...deployResult });
  }

  const ok = steps.every((s) => s.ok === true);
  const reportDir = join(scriptRoot, "reports/wisp");
  mkdirSync(reportDir, { recursive: true });
  const report = {
    kind: WISP_SVELTE_NATIVE_CONVERT_KIND,
    schemaVersion: WISP_SVELTE_NATIVE_CONVERT_SCHEMA_VERSION,
    ok,
    wispRoot,
    skipLift,
    skipLlmIs,
    deploy,
    liftSummary,
    integrity,
    isRouting: isRouting
      ? {
          domainId: isRouting.domainId,
          skipLlm: isRouting.skipLlm === true,
          tier: isRouting.tier ?? null,
        }
      : null,
    steps,
    deployResult,
    docs: [
      "docs/SVELTE-CWL-CONVERSION-LESSONS.md",
      "docs/MULTI-ORIGIN-LIFT-EXPANSION.md",
    ],
    generatedAt: new Date().toISOString(),
  };
  const reportPath = join(reportDir, "svelte-native-convert.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  report.reportPath = reportPath;
  return report;
}

async function main() {
  const argv = process.argv.slice(2);
  let wispRoot = defaultRoot;
  let skipLift = false;
  let skipLlmIs = false;
  let deploy = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) wispRoot = argv[++i];
    else if (a === "--skip-lift") skipLift = true;
    else if (a === "--skip-llm-is") skipLlmIs = true;
    else if (a === "--deploy") deploy = true;
  }
  const r = await runWispSvelteNativeConvert({ wispRoot, skipLift, skipLlmIs, deploy });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (
  process.argv[1]?.includes("wisp-cwl-svelte-native-convert") ||
  process.argv[1]?.includes("cwl-svelte-native-convert")
) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
