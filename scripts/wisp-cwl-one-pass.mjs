#!/usr/bin/env node
/**
 * One-pass WISP Svelte → CWL compiler (GCE / Linux target).
 *
 * Deterministic path:
 *   build converter → inventory origin → compile all pieces once → export CWL
 *   → sync generated CWL back to WISP → prepare GCE deploy bundle
 *   → optional: deploy to GCE (`--deploy-gce`)
 *
 * Firebase is not part of this path. Use `pnpm run wisp:deploy:firebase` only
 * when you specifically need Hosting; the live operator stack is GCE.
 *
 * Supported dynamic Svelte constructs compile to `data-cwl-bind` runtime
 * descriptors. Only unsupported constructs remain `data-cwl-hole` markers.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { convertAllOriginPieces } from "./lib/convert-origin-pieces.mjs";
import { runWispCwlStaticExport } from "./lib/cwl-static-export.mjs";
import { writeWispHoleReport } from "./lib/wisp-hole-report.mjs";
import { inspectRoutesCwlIntegrity } from "./lib/cwl-apply-surfaces.mjs";
import { syncWispApiPathsFromBackend } from "./lib/sync-api-paths-from-backend.mjs";
import { generateWispApiProxyCwl } from "./lib/cwl-generate-api-proxy.mjs";
import { applyWispApiGoldenHandlers } from "./wisp-cwl-apply-api-golden-handlers.mjs";
import { extractWispModuleTips } from "./lib/extract-wisp-module-tips.mjs";
import { extractWispWizardCatalog } from "./lib/extract-wisp-wizard-catalog.mjs";
import { buildWispCwlArcgisBundle } from "./build-wisp-cwl-arcgis-bundle.mjs";
import { auditWispConversion } from "./lib/wisp-conversion-audit.mjs";
import { runWispSurfaceCensus } from "./lib/cwl-surface-census.mjs";
import { runWispButtonCensus } from "./wisp-cwl-button-census.mjs";
import { runWispCodeCensus } from "./wisp-cwl-code-census.mjs";
import {
  loadWispPipelineConfig,
  resolveWispRoot,
  syncWispOriginalCssAssets,
  prepareWispCwlDeployBundle,
  verifyWispGceDeployBundle,
  runWispGceDeploy,
} from "./wisp-cwl-pipeline.mjs";

export const WISP_CWL_ONE_PASS_KIND = "chrysalis.wisp-cwl-one-pass";
export const WISP_CWL_ONE_PASS_SCHEMA_VERSION = 2;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = join(repoRoot, "fixtures/hub-wisp-management");
const routesPath = join(fixtureDir, "routes.cwl");
const previewPath = join(fixtureDir, "cwl-preview.json");
const reportPath = join(repoRoot, "reports/wisp/wisp-cwl-one-pass.json");

function run(command, args, env = {}) {
  let executable = command;
  let commandArgs = args;
  if (command === "pnpm" && process.env.npm_execpath) {
    executable = process.execPath;
    commandArgs = [process.env.npm_execpath, ...args];
  } else if (process.platform === "win32" && command === "pnpm") {
    executable = process.env.ComSpec ?? "cmd.exe";
    commandArgs = ["/d", "/s", "/c", ["pnpm", ...args].join(" ")];
  }
  const result = spawnSync(executable, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
    shell: false,
    maxBuffer: 80 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    error: result.error?.message,
    stdoutTail: (result.stdout ?? "").slice(-1500),
    stderrTail: (result.stderr ?? "").slice(-1500),
  };
}

function bindingCensus(source) {
  const readable = source.replace(/\\"/g, '"');
  const bindings = {};
  for (const match of readable.matchAll(/\bdata-cwl-bind="([^"]+)"/g)) {
    bindings[match[1]] = (bindings[match[1]] ?? 0) + 1;
  }
  const residue = {
    gotoHandlers: (readable.match(/\bgoto\s*\(/g) ?? []).length,
    svelteEventAttrs: (readable.match(/\son:[a-zA-Z][\w:|.-]*=/g) ?? []).length,
    controlTokens: (readable.match(/\{[#/:](?:if|each)\b/g) ?? []).length,
    malformedSvgTags: (
      readable.match(
        /<\/(?:login|dashboard|modules\/[\w/-]+|admin\/[\w/-]+)\s+(?:d|fill|stroke)=/g,
      ) ?? []
    ).length,
  };
  return {
    totalBindings: Object.values(bindings).reduce((sum, count) => sum + count, 0),
    bindings,
    unresolvedHoles: (readable.match(/\bdata-cwl-hole=/g) ?? []).length,
    residue,
    residueTotal: Object.values(residue).reduce((sum, count) => sum + count, 0),
  };
}

function syncGeneratedCwlToWisp(wispRoot) {
  const cwlDir = join(wispRoot, "generated/cwl");
  mkdirSync(cwlDir, { recursive: true });
  copyFileSync(routesPath, join(cwlDir, "routes.cwl"));

  const chrysalisDir = join(wispRoot, ".chrysalis");
  mkdirSync(chrysalisDir, { recursive: true });
  if (existsSync(previewPath)) {
    copyFileSync(previewPath, join(chrysalisDir, "cwl-preview.json"));
  }
  return {
    ok: existsSync(join(cwlDir, "routes.cwl")),
    routesPath: join(cwlDir, "routes.cwl"),
  };
}

/**
 * @param {object} [opts]
 * @param {string} [opts.wispRoot]
 * @param {boolean} [opts.bundle] prepare GCE deploy bundle (default true)
 * @param {boolean} [opts.deployGce] push bundle to GCE (default false)
 * @param {boolean} [opts.allowIncomplete] allow residual unsupported holes (default false)
 * @param {number} [opts.maxUnsupportedHoles] max allowed unsupported holes when allowIncomplete
 * @param {boolean} [opts.clean] remove prior generated origin output before compiling (default true)
 */
export async function runWispCwlOnePass(opts = {}) {
  const startedAt = new Date().toISOString();
  const config = loadWispPipelineConfig();
  const wispRoot = resolve(opts.wispRoot ?? resolveWispRoot(config));
  const bundle = opts.bundle !== false;
  const deployGce =
    opts.deployGce === true || process.env.CHRYSALIS_WISP_DEPLOY_GCE === "1";
  const allowIncomplete = opts.allowIncomplete === true;
  const maxUnsupportedHoles = Number(opts.maxUnsupportedHoles ?? 0);
  const clean = opts.clean !== false;
  const steps = [];
  const env = {
    CHRYSALIS_WISP_ROOT: wispRoot,
    WISP_MODULE_DIR: wispRoot,
    CHRYSALIS_WISP_STRUCTURAL_ONLY: "1",
    // CWL-native operator UI on GCE — no Svelte sidecar unless explicitly requested.
    CHRYSALIS_WISP_SKIP_SVELTE_SIDECAR: process.env.CHRYSALIS_WISP_SKIP_SVELTE_SIDECAR ?? "1",
  };

  if (!existsSync(wispRoot)) {
    return finalize({
      ok: false,
      startedAt,
      wispRoot,
      steps,
      skip: "missing-wisp-root",
      target: "gce",
    });
  }

  if (clean) {
    const cleaned = [
      join(wispRoot, "generated/cwl"),
      join(wispRoot, ".chrysalis/cwl-preview.json"),
    ];
    for (const path of cleaned) rmSync(path, { recursive: true, force: true });
    steps.push({ step: "clean-generated-output", ok: true, paths: cleaned });
  } else {
    steps.push({ step: "clean-generated-output", ok: true, skip: "disabled" });
  }

  const ingestBuild = run("pnpm", ["--filter", "@chrysalis/ingest", "build"], env);
  steps.push({ step: "build-ingest", ...ingestBuild });
  if (!ingestBuild.ok) return finalize({ ok: false, startedAt, wispRoot, steps, target: "gce" });

  const corpus = run(process.execPath, ["scripts/build-origin-source-corpus.mjs"], env);
  steps.push({ step: "origin-corpus", ...corpus });
  if (!corpus.ok) return finalize({ ok: false, startedAt, wispRoot, steps, target: "gce" });

  const apiSync = syncWispApiPathsFromBackend({
    backendRoot: resolve(wispRoot, "../backend-services"),
  });
  steps.push({ step: "sync-backend-api-routes", ...apiSync });
  if (!apiSync.ok)
    return finalize({ ok: false, startedAt, wispRoot, steps, target: "gce" });

  const apiProxy = generateWispApiProxyCwl({ mode: "native" });
  steps.push({ step: "generate-api-proxy", ...apiProxy });
  if (!apiProxy.ok)
    return finalize({ ok: false, startedAt, wispRoot, steps, target: "gce" });

  const apiGoldens = applyWispApiGoldenHandlers();
  steps.push({ step: "apply-api-goldens", ...apiGoldens });
  if (!apiGoldens.ok)
    return finalize({ ok: false, startedAt, wispRoot, steps, target: "gce" });

  const tips = extractWispModuleTips({ wispRoot });
  steps.push({ step: "extract-module-tips", ...tips });
  if (!tips.ok) return finalize({ ok: false, startedAt, wispRoot, steps, target: "gce" });

  const wizardCatalog = extractWispWizardCatalog({ wispRoot });
  steps.push({ step: "extract-wizard-catalog", ...wizardCatalog });
  if (!wizardCatalog.ok)
    return finalize({ ok: false, startedAt, wispRoot, steps, target: "gce" });

  try {
    const arcgis = await buildWispCwlArcgisBundle({ wispRoot });
    steps.push({ step: "build-arcgis-island", ok: arcgis.ok === true, ...arcgis });
    if (!arcgis.ok)
      return finalize({ ok: false, startedAt, wispRoot, steps, target: "gce" });
  } catch (error) {
    steps.push({
      step: "build-arcgis-island",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return finalize({ ok: false, startedAt, wispRoot, steps, target: "gce" });
  }

  // One structural compile. No relift, complete-protocol loop, or post-hoc force settle.
  const convert = await convertAllOriginPieces({ wispRoot });
  steps.push({
    step: "compile-all",
    ok: convert.ok === true,
    pieceCount: convert.pieceCount,
    byStatus: convert.byStatus,
  });
  if (!convert.ok) return finalize({ ok: false, startedAt, wispRoot, steps, target: "gce" });

  const routesSource = readFileSync(routesPath, "utf8");
  const census = bindingCensus(routesSource);
  const integrity = inspectRoutesCwlIntegrity(undefined, routesPath);
  const rootPageOk = /@page\s+GET\s+"\/"/.test(routesSource);
  const integrityOk =
    (integrity.junkCount ?? 0) === 0 &&
    census.residueTotal === 0 &&
    integrity.loginOk === true &&
    integrity.dashboardOk === true &&
    (integrity.rootRedirectOk === true || rootPageOk);
  steps.push({
    step: "compiled-cwl-integrity",
    ok: integrityOk,
    census,
    junkCount: integrity.junkCount ?? 0,
    residueTotal: census.residueTotal,
    rootPageOk,
  });
  if (!integrityOk) {
    return finalize({ ok: false, startedAt, wispRoot, steps, census, integrity, target: "gce" });
  }

  const synced = syncGeneratedCwlToWisp(wispRoot);
  steps.push({ step: "sync-generated-cwl", ...synced });

  // Global/root-layout CSS must exist before static export and its censuses.
  // This includes app.css → theme.css, which route-scoped style lifting misses.
  const css = syncWispOriginalCssAssets({ wispRoot, fixtureDir });
  steps.push({
    step: "sync-origin-css",
    ok: css.ok === true && css.globalThemeCssPresent === true,
    globalThemeCssPresent: css.globalThemeCssPresent,
  });

  const exported = await runWispCwlStaticExport();
  steps.push({
    step: "static-export",
    ok: exported.ok === true,
    pageCount: exported.pageCount,
    exportedCount: exported.exportedCount,
  });
  if (!exported.ok) {
    return finalize({ ok: false, startedAt, wispRoot, steps, census, target: "gce" });
  }

  const behaviorAudit = auditWispConversion({
    wispRoot,
    routesPath,
    staticRoot: exported.outRoot,
  });
  steps.push({
    step: "conversion-behavior-audit",
    ok: behaviorAudit.ok === true,
    hardFailures: behaviorAudit.hardFailures,
    controls: behaviorAudit.output.controls,
    wiredControls: behaviorAudit.output.wiredControls,
    inertControls: behaviorAudit.output.inertControls,
    controlCoverage: behaviorAudit.output.controlCoverage,
    reportPath: behaviorAudit.reportPath,
    markdownPath: behaviorAudit.markdownPath,
  });
  if (!behaviorAudit.ok) {
    return finalize({
      ok: false,
      startedAt,
      wispRoot,
      steps,
      census,
      integrity,
      behaviorAudit,
      target: "gce",
    });
  }

  // Honest surface census: every emitted data-cwl-action must map to a
  // client-handled family, no compiler noise actions, no dead buttons.
  const surface = runWispSurfaceCensus({ exportDir: exported.outRoot, wispRoot });
  steps.push({
    step: "surface-census",
    ok: surface.ok === true,
    gates: surface.gates,
    unboundSample: surface.export.unboundActions.slice(0, 15),
    noiseSample: surface.export.noiseActions.slice(0, 10),
    deadButtonSample: surface.export.deadButtonSamples.slice(0, 10),
  });
  if (!surface.ok && !allowIncomplete) {
    return finalize({
      ok: false,
      startedAt,
      wispRoot,
      steps,
      census,
      integrity,
      target: "gce",
    });
  }

  // Exhaustive control gate: inspect every literal module button, not just
  // data-cwl-action names. This catches conditional handlers dropped during
  // lowering, inaccessible runtime labels, competing wiring, and dead routes.
  const buttons = runWispButtonCensus({ exportDir: exported.outRoot });
  steps.push({
    step: "button-census",
    ok: buttons.ok === true,
    summary: buttons.summary,
    blockingSample: buttons.blockingIssues.slice(0, 15),
  });
  if (!buttons.ok && !allowIncomplete) {
    return finalize({
      ok: false,
      startedAt,
      wispRoot,
      steps,
      census,
      integrity,
      target: "gce",
    });
  }

  // Full origin→export code map (routes, onMount, modals, APIs, goto).
  // Blocks on dead-end redirects and missing static routes (dynamic preview
  // coverage counts as present).
  const codeCensus = runWispCodeCensus({
    sourceDir: join(wispRoot, "src"),
    exportDir: exported.outRoot,
  });
  steps.push({
    step: "code-census",
    ok: codeCensus.ok === true,
    summary: codeCensus.summary,
    blindSpot: codeCensus.summary?.blindSpot,
    blockingSample: (codeCensus.blockingGaps || []).slice(0, 15),
    gapSample: (codeCensus.gaps || []).slice(0, 10),
  });
  if (!codeCensus.ok && !allowIncomplete) {
    return finalize({
      ok: false,
      startedAt,
      wispRoot,
      steps,
      census,
      integrity,
      target: "gce",
    });
  }

  const holes = writeWispHoleReport();
  const unsupportedOk =
    holes.ok === true &&
    (census.unresolvedHoles ?? 0) <= (allowIncomplete ? maxUnsupportedHoles : 0) &&
    (holes.total ?? 0) <= (allowIncomplete ? maxUnsupportedHoles : 0);
  steps.push({
    step: "unsupported-hole-report",
    ok: unsupportedOk,
    total: holes.total,
    censusHoles: census.unresolvedHoles,
    allowIncomplete,
    maxUnsupportedHoles: allowIncomplete ? maxUnsupportedHoles : 0,
    reasons: holes.reasons,
  });
  if (!unsupportedOk) {
    return finalize({
      ok: false,
      startedAt,
      wispRoot,
      steps,
      census,
      target: "gce",
      fail: "unsupported-holes",
      generatedRoutesPath: synced.routesPath,
      staticExportRoot: exported.outRoot,
    });
  }

  /** @type {object | null} */
  let gceBundle = null;
  /** @type {object | null} */
  let gceVerify = null;
  if (bundle) {
    gceBundle = prepareWispCwlDeployBundle({
      wispRoot,
      skipLift: true,
      structuralOnly: true,
    });
    // Structural convert may leave honest residual holes; integrity soft-fail is OK for bundle.
    const bundleOk =
      gceBundle.ok === true || gceBundle.skip === "bundle-routes-integrity-failed";
    steps.push({
      step: "gce-deploy-bundle",
      ok: bundleOk,
      skip: gceBundle.skip,
      bundleDir: gceBundle.bundleDir,
      softIntegrity: gceBundle.skip === "bundle-routes-integrity-failed",
    });
    if (bundleOk && gceBundle.bundleDir) {
      gceVerify = verifyWispGceDeployBundle(gceBundle);
      steps.push({
        step: "gce-bundle-verify",
        ok: gceVerify.ok === true || gceVerify.skip === "bundle-routes-integrity-failed",
        operatorOk: gceVerify.operatorOk,
        wrapOk: gceVerify.wrapOk,
        missing: gceVerify.missing,
      });
    }
  } else {
    steps.push({ step: "gce-deploy-bundle", ok: true, skip: "not-requested" });
  }

  if (deployGce) {
    const deployed = runWispGceDeploy({
      wispRoot,
      skipLift: true,
      structuralOnly: true,
    });
    steps.push({
      step: "deploy-gce",
      ok: deployed?.ok === true,
      skip: deployed?.skip,
      status: deployed?.status,
      project: deployed?.project,
      stdoutTail: deployed?.stdoutTail,
      stderrTail: deployed?.stderrTail,
    });
  } else {
    steps.push({ step: "deploy-gce", ok: true, skip: "not-requested" });
  }

  return finalize({
    ok: steps.every((step) => step.ok === true),
    startedAt,
    wispRoot,
    steps,
    census,
    integrity,
    target: "gce",
    generatedRoutesPath: synced.routesPath,
    staticExportRoot: exported.outRoot,
    gceBundleDir: gceBundle?.bundleDir ?? null,
  });
}

function finalize(detail) {
  const report = {
    kind: WISP_CWL_ONE_PASS_KIND,
    schemaVersion: WISP_CWL_ONE_PASS_SCHEMA_VERSION,
    ...detail,
    finishedAt: new Date().toISOString(),
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  report.reportPath = reportPath;
  return report;
}

function parseArgs(argv) {
  const opts = { bundle: true };
  for (let i = 2; i < argv.length; i++) {
    if ((argv[i] === "--root" || argv[i] === "--wisp-root") && argv[i + 1]) {
      opts.wispRoot = argv[++i];
    } else if (argv[i] === "--no-bundle") {
      opts.bundle = false;
    } else if (argv[i] === "--no-clean") {
      opts.clean = false;
    } else if (argv[i] === "--deploy-gce") {
      opts.deployGce = true;
    } else if (argv[i] === "--allow-incomplete") {
      opts.allowIncomplete = true;
      if (opts.maxUnsupportedHoles == null) opts.maxUnsupportedHoles = 4;
    } else if (argv[i] === "--max-unsupported-holes" && argv[i + 1]) {
      opts.allowIncomplete = true;
      opts.maxUnsupportedHoles = Number(argv[++i]) || 0;
    } else if (argv[i] === "--deploy-firebase") {
      console.error(
        "wisp-cwl-one-pass: Firebase is not supported here. Use `pnpm run wisp:deploy:firebase` if needed; preferred target is GCE (`--deploy-gce`).",
      );
      process.exit(2);
    }
  }
  return opts;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runWispCwlOnePass(parseArgs(process.argv))
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      if (!report.ok) process.exit(1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
