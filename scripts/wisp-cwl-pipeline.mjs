#!/usr/bin/env node
/**
 * WISP CWL Phase 12 automation pipeline — build, gates, optional GCE deploy, report artifact.
 *
 * Usage:
 *   node scripts/wisp-cwl-pipeline.mjs [--ci] [--skip-lift] [--lift] [--deploy-gce] [--bundle-only]
 *   node scripts/wisp-cwl-pipeline.mjs --root path/to/Module_Manager
 *
 * Env overrides:
 *   CHRYSALIS_WISP_ROOT, WISP_MODULE_DIR, CHRYSALIS_WISP_DEPLOY_GCE=1,
 *   CHRYSALIS_WISP_DEPLOY_FIREBASE=1, CHRYSALIS_WISP_GCE_PROJECT, CHRYSALIS_WISP_BACKEND_URL
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runWispCwlFullBuild } from "./wisp-cwl-full-build.mjs";
import { runWispCwlPhase12Phase0EntryGate } from "./hub-ingest/hub-wisp-cwl-phase12-phase0-entry-smoke.mjs";
import { runWispCwlPhase12Phase0CloseGate } from "./hub-ingest/hub-wisp-cwl-phase12-phase0-close-smoke.mjs";
import { runWispCwlPocVerify } from "./wisp-cwl-poc-verify.mjs";
import { runWispFirebaseDeploy } from "./wisp-cwl-firebase-deploy.mjs";
import { buildWispDemoManifest } from "./wisp-cwl-demo-manifest.mjs";
import { runWispDemoManifestVerify } from "./wisp-cwl-demo-manifest-verify.mjs";
import { applyWispPhase13Surfaces } from "./wisp-cwl-apply-phase13-surfaces.mjs";
import { applyWispPostG7790Chain } from "./wisp-cwl-apply-post-g7790-chain.mjs";
import { applyWispClientRedirects } from "./wisp-cwl-apply-client-redirects.mjs";
import { applyWispPhase28gIntegrationsUi } from "./wisp-cwl-apply-phase28g-integrations-ui.mjs";
import { applyWispPhase31BulkLift } from "./wisp-cwl-apply-phase31-bulk-lift.mjs";
import { applyWispPhase30UiParity } from "./wisp-cwl-apply-phase30-ui-parity.mjs";
import { applyWispPhase30bModuleParity } from "./wisp-cwl-apply-phase30b-module-parity.mjs";
import { applyWispPhase32CompleteDemo } from "./wisp-cwl-apply-phase32-complete-demo.mjs";
import { inspectRoutesCwlIntegrity } from "./wisp-cwl-apply-surfaces-lib.mjs";
import { isWispFullSiteProgramClosed } from "./wisp-cwl-post-g7790.mjs";
import {
  loadWispPipelineConfig,
  patchOperatorGceDeployPipelineConfig,
  WISP_CWL_GCE_GATEWAY_SUPPORT_FILES,
} from "./wisp-cwl-gateway-config.mjs";

export { loadWispPipelineConfig };

export const WISP_CWL_PIPELINE_KIND = "chrysalis.wisp-cwl-pipeline";
export const WISP_CWL_PIPELINE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Sync lifted original CSS from Module_Manager (or fixture) into fixture + deploy bundle.
 * @param {object} opts
 * @param {string} opts.wispRoot
 * @param {string} opts.fixtureDir
 * @param {string} [opts.bundleDir]
 */
export function syncWispOriginalCssAssets(opts) {
  const { wispRoot, fixtureDir, bundleDir } = opts;
  const wispUi = join(wispRoot, ".chrysalis/ui-assets");
  const wispCss = join(wispUi, "original-css");
  const wispMap = join(wispUi, "ui-route-style-map.json");
  const fixtureCss = join(fixtureDir, "original-css");
  const fixtureMap = join(fixtureDir, "wisp-cwl-original-css-map.json");

  if (existsSync(wispCss)) {
    mkdirSync(fixtureCss, { recursive: true });
    cpSync(wispCss, fixtureCss, { recursive: true });
  }
  if (existsSync(wispMap)) {
    copyFileSync(wispMap, fixtureMap);
  }

  // Root +layout.svelte imports app.css globally. The UI asset lift above is
  // route-scoped and therefore cannot infer this import graph from +page files.
  const globalCssSources = [
    join(wispRoot, "src/lib/config/theme.css"),
    join(wispRoot, "src/lib/styles/modal.css"),
    join(wispRoot, "src/app.css"),
  ];
  const globalCssPath = join(fixtureCss, "wisp-origin-global.css");
  if (globalCssSources.every(existsSync)) {
    mkdirSync(fixtureCss, { recursive: true });
    const globalCss = globalCssSources
      .map((path) => readFileSync(path, "utf8").replace(/^\s*@import\s+[^;]+;\s*$/gm, ""))
      .join("\n\n");
    writeFileSync(
      globalCssPath,
      `/* Lifted from root +layout.svelte → app.css import graph. */\n${globalCss}\n`,
      "utf8",
    );
  }

  if (bundleDir) {
    if (existsSync(fixtureCss)) {
      mkdirSync(join(bundleDir, "original-css"), { recursive: true });
      cpSync(fixtureCss, join(bundleDir, "original-css"), { recursive: true });
    }
    if (existsSync(fixtureMap)) {
      copyFileSync(fixtureMap, join(bundleDir, "wisp-cwl-original-css-map.json"));
    }
  }

  const hardwareCss = join(bundleDir ?? fixtureDir, "original-css", "modules_hardware.css");
  const mapPath = bundleDir
    ? join(bundleDir, "wisp-cwl-original-css-map.json")
    : fixtureMap;
  return {
    ok: existsSync(mapPath) && existsSync(hardwareCss),
    mapPath,
    hardwareCssPresent: existsSync(hardwareCss),
    globalThemeCssPresent: existsSync(
      join(bundleDir ?? fixtureDir, "original-css", "wisp-origin-global.css"),
    ),
  };
}

/** @param {Record<string, unknown>} config */
export function resolveWispRoot(config) {
  for (const key of config.wispRootEnv ?? ["CHRYSALIS_WISP_ROOT", "WISP_MODULE_DIR"]) {
    if (process.env[key]) return resolve(process.env[key]);
  }
  return resolve(config.defaultWispRoot ?? "C:/Users/david/AgenticOps/products/wisptools/Module_Manager");
}

/**
 * @param {object} [opts]
 * @param {string} [opts.wispRoot]
 */
export function prepareWispCwlDeployBundle(opts = {}) {
  const config = loadWispPipelineConfig();
  const wispRoot = resolve(opts.wispRoot ?? resolveWispRoot(config));
  const fixtureDir = join(scriptRoot, config.fixtureDir ?? "fixtures/hub-wisp-management");
  const bundleDir = join(scriptRoot, "generated/_wisp-cwl-poc-deploy");
  mkdirSync(bundleDir, { recursive: true });

  const wispRoutes = join(wispRoot, "generated/cwl/routes.cwl");
  const fixtureRoutes = join(fixtureDir, "routes.cwl");
  const skipLift = opts.skipLift === true;
  const routesSrc =
    skipLift || !existsSync(wispRoutes) ? fixtureRoutes : wispRoutes;
  if (!existsSync(routesSrc)) {
    return { ok: false, skip: "missing-routes-cwl", bundleDir };
  }

  copyFileSync(routesSrc, join(bundleDir, "routes.cwl"));
  mkdirSync(fixtureDir, { recursive: true });
  if (routesSrc !== fixtureRoutes) {
    copyFileSync(routesSrc, fixtureRoutes);
  }
  copyFileSync(join(fixtureDir, "api-proxy.cwl"), join(bundleDir, "api-proxy.cwl"));

  const previewSrc = join(wispRoot, ".chrysalis/cwl-preview.json");
  const previewFixture = join(fixtureDir, "cwl-preview.json");
  const previewDst = join(bundleDir, "cwl-preview.json");
  if (!skipLift && existsSync(previewSrc)) copyFileSync(previewSrc, previewDst);
  else if (existsSync(previewFixture)) copyFileSync(previewFixture, previewDst);

  copyFileSync(join(scriptRoot, "scripts/wisp-cwl-chimera-gateway.mjs"), join(bundleDir, "wisp-cwl-chimera-gateway.mjs"));
  copyFileSync(join(scriptRoot, "scripts/wisp-cwl-chimera-serve.mjs"), join(bundleDir, "wisp-cwl-chimera-serve.mjs"));
  // The public gateway/serve files are compatibility shims. Ship their real
  // implementations beside them so the standalone Linux bundle is runnable.
  const bundleLibDir = join(bundleDir, "lib");
  mkdirSync(bundleLibDir, { recursive: true });
  for (const name of [
    "cwl-chimera-gateway.mjs",
    "cwl-chimera-serve.mjs",
    "cwl-gateway-config.mjs",
  ]) {
    copyFileSync(join(scriptRoot, "scripts/lib", name), join(bundleLibDir, name));
  }
  for (const name of WISP_CWL_GCE_GATEWAY_SUPPORT_FILES) {
    const src = join(scriptRoot, "scripts", name);
    if (name === "wisp-pipeline.config.json") {
      const pipelineConfig = patchOperatorGceDeployPipelineConfig(
        JSON.parse(readFileSync(join(scriptRoot, "fixtures/hub-wisp-management/wisp-pipeline.config.json"), "utf8")),
      );
      writeFileSync(join(bundleDir, name), `${JSON.stringify(pipelineConfig, null, 2)}\n`, "utf8");
    } else {
      copyFileSync(src, join(bundleDir, name));
    }
  }

  const faviconSrc =
    existsSync(join(wispRoot, "static/favicon.svg"))
      ? join(wispRoot, "static/favicon.svg")
      : join(fixtureDir, "favicon.svg");
  if (existsSync(faviconSrc)) {
    copyFileSync(faviconSrc, join(bundleDir, "favicon.svg"));
    copyFileSync(faviconSrc, join(fixtureDir, "favicon.svg"));
  }
  for (const shellAsset of [
    "wisp-cwl-shell.css",
    "wisp-cwl-login.css",
    "wisp-cwl-app.css",
    "wisp-cwl-client.js",
    "wisp-firebase-config.json",
    "wisp-cwl-modules.css",
    "wisp-cwl-modules.js",
    "wisp-cwl-map.js",
    "wisp-cwl-map-island.css",
    "wisp-cwl-arcgis.bundle.js",
    "wisp-cwl-arcgis.bundle.css",
    "wisp-arcgis-config.json",
    "wisptools-logo.svg",
  ]) {
    const shellSrc = join(fixtureDir, shellAsset);
    if (!existsSync(shellSrc)) continue;
    if (shellAsset === "wisp-firebase-config.json") {
      // On GCE the chimera gateway is the API authority. Prefer same-origin so
      // browser CORS/auth never bypasses the deployed CWL gateway for HSS.
      const clientConfig = JSON.parse(readFileSync(shellSrc, "utf8"));
      writeFileSync(
        join(bundleDir, shellAsset),
        `${JSON.stringify(
          {
            ...clientConfig,
            preferDirectBackend: false,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
    } else {
      copyFileSync(shellSrc, join(bundleDir, shellAsset));
    }
  }

  // Lifted Module_Manager CSS — required for CWL-native visual depth (D6407 / G9890).
  syncWispOriginalCssAssets({ wispRoot, fixtureDir, bundleDir });

  // D6443/D6444 restart: structural convert owns routes.cwl. Do not re-apply
  // Phase 30 parity shells or force-settle bind (they overwrite origin lifts).
  // skipLift implies structural-only — never let an asset-only redeploy wipe
  // origin-convert pages with Phase 30 synthetic shells.
  const structuralOnly =
    opts.structuralOnly === true ||
    opts.skipLift === true ||
    process.env.CHRYSALIS_WISP_STRUCTURAL_ONLY === "1";

  if (structuralOnly) {
    // CSS already synced above; keep routes as converted.
  } else if (isWispFullSiteProgramClosed()) {
    applyWispPostG7790Chain();
    applyWispPhase28gIntegrationsUi();
    applyWispPhase31BulkLift();
    applyWispPhase30UiParity();
    applyWispPhase30bModuleParity();
    applyWispPhase32CompleteDemo();
    // Client redirects last — later lifts can reintroduce dead-end spinner shells.
    // Showcase bind re-applies redirects after load-bind hydration.
    const redirects = applyWispClientRedirects();
    const bindR = spawnSync(process.execPath, [join(scriptRoot, "scripts/wisp-cwl-bind-showcase.mjs")], {
      cwd: scriptRoot,
      encoding: "utf8",
      env: process.env,
    });
    let bindOk = bindR.status === 0;
    try {
      const parsed = bindR.stdout ? JSON.parse(bindR.stdout) : null;
      if (parsed && parsed.ok === false) bindOk = false;
    } catch {
      bindOk = false;
    }
    const integrity = inspectRoutesCwlIntegrity();
    if (redirects.ok === false || !bindOk || integrity.ok !== true) {
      return {
        ok: false,
        skip:
          redirects.ok === false
            ? redirects.skip ?? "client-redirects-failed"
            : !bindOk
              ? "showcase-bind-failed"
              : "routes-integrity-failed",
        bundleDir,
        wispRoot,
        routesSrc,
        redirects,
        integrity,
      };
    }
  } else {
    applyWispPhase13Surfaces();
  }

  // Phase 13 apply patches fixtures/hub-wisp-management/routes.cwl — bundle must match for GCE deploy.
  copyFileSync(fixtureRoutes, join(bundleDir, "routes.cwl"));
  copyFileSync(join(fixtureDir, "api-proxy.cwl"), join(bundleDir, "api-proxy.cwl"));
  if (existsSync(previewFixture)) copyFileSync(previewFixture, previewDst);

  for (const cwlName of ["routes.cwl", "api-proxy.cwl"]) {
    const cwlFile = join(bundleDir, cwlName);
    if (!existsSync(cwlFile)) continue;
    const webirOut = join(bundleDir, `${cwlName.replace(/\.cwl$/, "")}.webir.json`);
    const exportScript = join(scriptRoot, "scripts/hub-ingest/export-cwl-webir.mjs");
    const r = spawnSync(process.execPath, [exportScript, cwlFile], {
      cwd: scriptRoot,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    if (r.status === 0 && r.stdout?.trim()) {
      writeFileSync(webirOut, r.stdout.trim().endsWith("\n") ? r.stdout : `${r.stdout}\n`, "utf8");
    }
  }

  const bundleIntegrity = inspectRoutesCwlIntegrity(undefined, join(bundleDir, "routes.cwl"));
  if (bundleIntegrity.ok !== true) {
    return {
      ok: false,
      skip: "bundle-routes-integrity-failed",
      bundleDir,
      wispRoot,
      routesSrc,
      integrity: bundleIntegrity,
    };
  }

  return { ok: true, bundleDir, wispRoot, routesSrc, integrity: bundleIntegrity };
}

/** @param {{ ok?: boolean, skip?: string, bundleDir?: string }} bundle */
export function verifyWispGceDeployBundle(bundle) {
  const base = { ok: false };
  if (bundle.ok !== true || !bundle.bundleDir) {
    return { ...base, skip: bundle.skip ?? "bundle-failed" };
  }
  const dir = bundle.bundleDir;
  const required = [
    "routes.cwl",
    "api-proxy.cwl",
    "routes.webir.json",
    "api-proxy.webir.json",
    "wisp-cwl-chimera-gateway.mjs",
    "lib/cwl-chimera-gateway.mjs",
    "lib/cwl-chimera-serve.mjs",
    "lib/cwl-gateway-config.mjs",
    "wisp-cwl-gateway-config.mjs",
    "wisp-cwl-post-g7790.mjs",
    "wisp-pipeline.config.json",
    "wisp-cwl-login.css",
    "wisp-cwl-app.css",
    "wisp-cwl-client.js",
    "wisp-firebase-config.json",
    "wisp-cwl-modules.css",
    "wisp-cwl-modules.js",
    "wisp-cwl-map.js",
    "wisp-cwl-map-island.css",
    "wisp-cwl-arcgis.bundle.js",
    "wisp-cwl-arcgis.bundle.css",
    "wisp-arcgis-config.json",
    "wisptools-logo.svg",
  ];
  /** @type {string[]} */
  const missing = required.filter((name) => !existsSync(join(dir, name)));
  if (missing.length > 0) return { ...base, missing, skip: "missing-bundle-files" };

  const deployConfig = JSON.parse(readFileSync(join(dir, "wisp-pipeline.config.json"), "utf8"));
  const operatorOk =
    deployConfig.gce?.nativeApi === true &&
    (deployConfig.gce?.operatorUi === "svelte-chimera"
      ? deployConfig.gce?.svelteSidecar === true
      : deployConfig.gce?.operatorUi === "cwl-native" && deployConfig.gce?.svelteSidecar === false);
  const gatewayText = [
    readFileSync(join(dir, "wisp-cwl-chimera-gateway.mjs"), "utf8"),
    readFileSync(join(dir, "lib/cwl-chimera-gateway.mjs"), "utf8"),
  ].join("\n");
  const wrapOk =
    gatewayText.includes("wrapWispCwlHtmlDocument") &&
    gatewayText.includes("wisp-cwl-login.css") &&
    gatewayText.includes("wisp-cwl-modules.css") &&
    gatewayText.includes("wisp-cwl-map.js") &&
    gatewayText.includes("wisp-cwl-client.js");
  const integrity = inspectRoutesCwlIntegrity(undefined, join(dir, "routes.cwl"));
  return {
    ok: operatorOk === true && wrapOk === true && integrity.ok === true,
    operatorOk,
    wrapOk,
    integrity,
    missing: [],
    bundleDir: dir,
  };
}

function commandExists(cmd) {
  const check = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(check, [cmd], { encoding: "utf8", shell: false });
  return r.status === 0;
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.skipLift]
 * @param {string} [opts.wispRoot]
 * @param {boolean} [opts.tunnelThroughIap]
 * @param {boolean} [opts.structuralOnly]
 */
export function runWispGceDeploy(opts = {}) {
  // Default: CWL-native conversion experience (D6405). Sidecar only if explicitly requested.
  const wantSidecar = process.env.CHRYSALIS_WISP_SVELTE_SIDECAR === "1";
  const config = wantSidecar
    ? {
        ...loadWispPipelineConfig(),
        gce: {
          ...(loadWispPipelineConfig().gce ?? {}),
          svelteSidecar: true,
          svelteFallback: "http://127.0.0.1:3000",
          operatorUi: "svelte-chimera",
          cwlNativePrefixes: "/docs,/help,/favicon.ico,/favicon.svg",
        },
      }
    : patchOperatorGceDeployPipelineConfig(loadWispPipelineConfig());
  const gce = config.gce ?? {};
  const bundle = prepareWispCwlDeployBundle({
    wispRoot: opts.wispRoot,
    skipLift: true,
    structuralOnly:
      opts.structuralOnly === true ||
      process.env.CHRYSALIS_WISP_STRUCTURAL_ONLY === "1",
  });
  if (!bundle.ok) return { ok: false, skip: bundle.skip ?? "bundle-failed" };
  if (!commandExists("gcloud")) return { ok: false, skip: "gcloud-unavailable" };

  const project = process.env.CHRYSALIS_WISP_GCE_PROJECT ?? gce.project;
  if (!project) return { ok: false, skip: "missing-gce-project" };

  const skipSidecar = !wantSidecar || process.env.CHRYSALIS_WISP_SKIP_SVELTE_SIDECAR === "1";
  const args = [
    "-Project", project,
    "-Zone", process.env.CHRYSALIS_WISP_GCE_ZONE ?? gce.zone ?? "us-central1-a",
    "-Name", process.env.CHRYSALIS_WISP_GCE_INSTANCE ?? gce.instance ?? "chrysalis-test-vm",
    "-BackendUrl", process.env.CHRYSALIS_WISP_BACKEND_URL ?? gce.backendUrl ?? "https://hss.wisptools.io",
    "-Port", String(gce.port ?? 19100),
    "-SkipLift",
  ];
  if (skipSidecar) {
    args.push("-SkipSvelteSidecar");
  }
  const wispRoot = opts.wispRoot ?? bundle.wispRoot;
  if (wispRoot) args.push("-WispModuleDir", wispRoot);
  const svelte =
    process.env.CHRYSALIS_WISP_SVELTE_FALLBACK ??
    gce.svelteFallback ??
    "http://127.0.0.1:3000";
  if (svelte && !skipSidecar) args.push("-SvelteFallback", svelte);
  if (opts.tunnelThroughIap) args.push("-TunnelThroughIap");

  const deployEnv = {
    ...process.env,
    ...(opts.structuralOnly === true
      ? { CHRYSALIS_WISP_STRUCTURAL_ONLY: "1" }
      : {}),
  };
  let r;
  if (process.platform === "win32") {
    r = spawnSync(
      "powershell",
      ["-ExecutionPolicy", "Bypass", "-File", join(scriptRoot, "scripts/gce-wisp-local-stack-deploy.ps1"), ...args],
      { cwd: scriptRoot, encoding: "utf8", shell: false, env: deployEnv },
    );
  } else {
    const shArgs = [
      join(scriptRoot, "scripts/gce-wisp-local-stack-deploy.sh"),
      "--project", project,
      "--zone", process.env.CHRYSALIS_WISP_GCE_ZONE ?? gce.zone ?? "us-central1-a",
      "--name", process.env.CHRYSALIS_WISP_GCE_INSTANCE ?? gce.instance ?? "chrysalis-test-vm",
      "--backend-url", process.env.CHRYSALIS_WISP_BACKEND_URL ?? gce.backendUrl ?? "https://hss.wisptools.io",
      "--port", String(gce.port ?? 19100),
      "--skip-lift",
    ];
    if (skipSidecar) shArgs.push("--skip-svelte-sidecar");
    if (wispRoot) shArgs.push("--wisp-root", wispRoot);
    if (svelte && !skipSidecar) shArgs.push("--svelte-fallback", svelte);
    if (opts.tunnelThroughIap) shArgs.push("--tunnel-through-iap");
    r = spawnSync("bash", shArgs, {
      cwd: scriptRoot,
      encoding: "utf8",
      shell: false,
      env: deployEnv,
    });
  }

  const ok = r.status === 0;
  return {
    ok,
    status: r.status ?? 1,
    project,
    stderrTail: (r.stderr ?? "").slice(-400) || undefined,
    stdoutTail: (r.stdout ?? "").slice(-400) || undefined,
  };
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.ci]
 * @param {boolean} [opts.skipLift]
 * @param {boolean} [opts.lift]
 * @param {boolean} [opts.deployGce]
 * @param {boolean} [opts.deployFirebase]
 * @param {boolean} [opts.bundleOnly]
 * @param {boolean} [opts.skipRemoteVerify]
 * @param {string} [opts.wispRoot]
 * @param {string} [opts.reportPath]
 */
export async function runWispCwlPipeline(opts = {}) {
  const config = loadWispPipelineConfig();
  const wispRoot = resolve(opts.wispRoot ?? resolveWispRoot(config));
  const ci = opts.ci === true || process.env.CHRYSALIS_WISP_PIPELINE_CI === "1";
  const wispExists = existsSync(wispRoot);
  let skipLift = false;
  if (opts.skipLift === true) skipLift = true;
  else if (opts.lift === true) skipLift = false;
  else if (ci) skipLift = true;
  else if (!wispExists) skipLift = true;
  const deployGce =
    opts.deployGce === true ||
    process.env.CHRYSALIS_WISP_DEPLOY_GCE === "1";
  const deployFirebase =
    opts.deployFirebase === true ||
    process.env.CHRYSALIS_WISP_DEPLOY_FIREBASE === "1";
  const reportPath = resolve(opts.reportPath ?? join(scriptRoot, config.reportPath ?? "reports/wisp/wisp-cwl-pipeline.json"));

  // Compatibility API: normal pipeline runs now share the canonical one-pass
  // compiler. Bundle-only remains here because the GCE deploy shell invokes it
  // after compilation to package the already-generated CWL.
  if (!opts.bundleOnly && process.env.CHRYSALIS_WISP_LEGACY_PIPELINE !== "1") {
    if (deployFirebase) {
      return {
        kind: WISP_CWL_PIPELINE_KIND,
        schemaVersion: WISP_CWL_PIPELINE_SCHEMA_VERSION,
        ok: false,
        skip: "firebase-disabled-use-gce",
        wispRoot,
      };
    }
    const { runWispCwlOnePass } = await import("./wisp-cwl-one-pass.mjs");
    return runWispCwlOnePass({
      wispRoot,
      bundle: true,
      deployGce: !ci && deployGce,
    });
  }

  // GCE deployment calls `--bundle-only` after one-pass compilation. Package
  // the existing structural CWL directly; running legacy full-build here would
  // reapply Phase 30/32 demo shells and overwrite the converted site.
  if (
    opts.bundleOnly &&
    process.env.CHRYSALIS_WISP_STRUCTURAL_ONLY === "1"
  ) {
    const bundle = prepareWispCwlDeployBundle({
      wispRoot,
      skipLift: true,
      structuralOnly: true,
    });
    const report = {
      kind: WISP_CWL_PIPELINE_KIND,
      schemaVersion: WISP_CWL_PIPELINE_SCHEMA_VERSION,
      ok: bundle.ok === true,
      mode: "structural-bundle-only",
      wispRoot,
      skipLift: true,
      steps: [
        {
          step: "deploy-bundle",
          ok: bundle.ok === true,
          detail: bundle,
        },
      ],
      generatedAt: new Date().toISOString(),
    };
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return report;
  }

  const runtimeDist = join(scriptRoot, "packages/runtime-cwl/dist/index.js");
  if (!existsSync(runtimeDist)) {
    spawnSync("pnpm", ["--filter", "@chrysalis/runtime-cwl", "build"], {
      cwd: scriptRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
  }

  /** @type {Array<Record<string, unknown>>} */
  const steps = [];

  const build = runWispCwlFullBuild({ wispRoot, skipLift: skipLift || !wispExists });
  steps.push({ step: "full-build", ok: build.ok === true, detail: build });
  if (opts.bundleOnly) {
    const bundle = prepareWispCwlDeployBundle({ wispRoot, skipLift: skipLift || !wispExists });
    steps.push({ step: "deploy-bundle", ok: bundle.ok === true, detail: bundle });
    const report = {
      kind: WISP_CWL_PIPELINE_KIND,
      schemaVersion: WISP_CWL_PIPELINE_SCHEMA_VERSION,
      ok: build.ok === true && bundle.ok === true,
      mode: "bundle-only",
      wispRoot,
      skipLift,
      steps,
      generatedAt: new Date().toISOString(),
    };
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return report;
  }

  const entry = await runWispCwlPhase12Phase0EntryGate();
  steps.push({ step: "gate-entry-g6304", ok: entry.ok === true, detail: entry });

  const close = await runWispCwlPhase12Phase0CloseGate();
  steps.push({ step: "gate-close-g6310", ok: close.ok === true, detail: close });

  /** @type {Record<string, unknown> | null} */
  let firebaseDeploy = null;
  if (deployFirebase) {
    firebaseDeploy = runWispFirebaseDeploy({ wispRoot, dryRun: ci });
    steps.push({ step: "firebase-deploy", ok: firebaseDeploy.ok === true, detail: firebaseDeploy });
  } else {
    steps.push({ step: "firebase-deploy", ok: true, skip: ci ? "ci-skip-firebase" : "not-requested" });
  }

  /** @type {Record<string, unknown> | null} */
  let gceDeploy = null;
  if (deployGce) {
    gceDeploy = runWispGceDeploy({ wispRoot, skipLift: true });
    steps.push({ step: "gce-deploy", ok: gceDeploy.ok === true, detail: gceDeploy });
  } else {
    steps.push({ step: "gce-deploy", ok: true, skip: ci ? "ci-skip-gce" : "not-requested" });
  }

  /** @type {Record<string, unknown> | null} */
  let remoteVerify = null;
  if (deployGce && gceDeploy?.ok && !opts.skipRemoteVerify) {
    const gce = config.gce ?? {};
    const project = process.env.CHRYSALIS_WISP_GCE_PROJECT ?? gce.project;
    if (commandExists("gcloud") && project) {
      const ipR = spawnSync(
        "gcloud",
        [
          "compute", "instances", "describe",
          process.env.CHRYSALIS_WISP_GCE_INSTANCE ?? gce.instance ?? "chrysalis-test-vm",
          `--zone=${process.env.CHRYSALIS_WISP_GCE_ZONE ?? gce.zone ?? "us-central1-a"}`,
          `--project=${project}`,
          "--format=get(networkInterfaces[0].accessConfigs[0].natIP)",
        ],
        { encoding: "utf8", shell: false },
      );
      const deployStdout = String(gceDeploy?.stdoutTail ?? gceDeploy?.stdout ?? "");
      const urlFromDeploy = deployStdout.match(/URL:\s+http:\/\/([\d.]+):(\d+)/);
      const ip = (ipR.stdout ?? "").trim() || urlFromDeploy?.[1] || "";
      if (ip) {
        const baseUrl = `http://${ip}:${gce.port ?? 19100}`;
        buildWispDemoManifest({ natIp: ip });
        const manifestPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-demo-manifest.v1.json");
        const previewPath = join(scriptRoot, "generated/_wisp-cwl-poc-deploy/cwl-preview.json");
        const manifestVerify = await runWispDemoManifestVerify({ baseUrl, manifestPath });
        const pocVerify = await runWispCwlPocVerify({ baseUrl, previewPath, chimera: true });
        remoteVerify = {
          ok: manifestVerify.ok === true && pocVerify.ok === true,
          baseUrl,
          manifest: manifestVerify,
          poc: pocVerify,
        };
        steps.push({ step: "remote-verify", ok: remoteVerify.ok === true, detail: remoteVerify });
      } else {
        steps.push({ step: "remote-verify", ok: false, skip: "gce-ip-unavailable" });
      }
    } else {
      steps.push({ step: "remote-verify", ok: true, skip: "gcloud-or-project-unavailable" });
    }
  } else {
    steps.push({ step: "remote-verify", ok: true, skip: deployGce ? "deploy-failed-or-skipped" : "no-deploy" });
  }

  const ok =
    build.ok === true &&
    entry.ok === true &&
    close.ok === true &&
    steps.filter((s) => s.step === "gce-deploy" && !s.skip).every((s) => s.ok === true) &&
    steps.filter((s) => s.step === "firebase-deploy" && !s.skip).every((s) => s.ok === true) &&
    steps.filter((s) => s.step === "remote-verify" && !s.skip).every((s) => s.ok === true);

  const report = {
    kind: WISP_CWL_PIPELINE_KIND,
    schemaVersion: WISP_CWL_PIPELINE_SCHEMA_VERSION,
    ok,
    mode: ci ? "ci" : deployGce && deployFirebase ? "deploy-both" : deployGce ? "deploy-gce" : deployFirebase ? "deploy-firebase" : "local",
    wispRoot,
    wispRootAvailable: wispExists,
    skipLift,
    deployGce,
    deployFirebase,
    steps,
    build,
    entry,
    close,
    gceDeploy,
    firebaseDeploy,
    remoteVerify,
    reportPath,
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

function parseArgs(argv) {
  let wispRoot = "";
  let reportPath = "";
  let ci = false;
  let skipLift = false;
  let lift = false;
  let deployGce = false;
  let deployFirebase = false;
  let bundleOnly = false;
  let skipRemoteVerify = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ci") ci = true;
    else if (a === "--skip-lift") skipLift = true;
    else if (a === "--lift") lift = true;
    else if (a === "--deploy-gce") deployGce = true;
    else if (a === "--deploy-firebase") deployFirebase = true;
    else if (a === "--bundle-only") bundleOnly = true;
    else if (a === "--skip-remote-verify") skipRemoteVerify = true;
    else if (a === "--root" && argv[i + 1]) wispRoot = argv[++i];
    else if (a === "--report" && argv[i + 1]) reportPath = argv[++i];
  }
  return { wispRoot: wispRoot || undefined, reportPath: reportPath || undefined, ci, skipLift, lift, deployGce, deployFirebase, bundleOnly, skipRemoteVerify };
}

async function main() {
  const args = parseArgs(process.argv);
  const r = await runWispCwlPipeline(args);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-pipeline.mjs")) main().catch((e) => { console.error(e); process.exit(1); });
