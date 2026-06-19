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
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

export const WISP_CWL_PIPELINE_KIND = "chrysalis.wisp-cwl-pipeline";
export const WISP_CWL_PIPELINE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-pipeline.config.json");

/** @returns {Record<string, unknown>} */
export function loadWispPipelineConfig() {
  if (!existsSync(configPath)) {
    return {
      kind: "chrysalis.wisp.pipeline-config",
      schemaVersion: 1,
      reportPath: "reports/wisp/wisp-cwl-pipeline.json",
      gce: {},
    };
  }
  return JSON.parse(readFileSync(configPath, "utf8"));
}

/** @param {Record<string, unknown>} config */
export function resolveWispRoot(config) {
  for (const key of config.wispRootEnv ?? ["CHRYSALIS_WISP_ROOT", "WISP_MODULE_DIR"]) {
    if (process.env[key]) return resolve(process.env[key]);
  }
  return resolve(config.defaultWispRoot ?? "C:/Users/david/Downloads/WISPTools/Module_Manager");
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

  const faviconSrc =
    existsSync(join(wispRoot, "static/favicon.svg"))
      ? join(wispRoot, "static/favicon.svg")
      : join(fixtureDir, "favicon.svg");
  if (existsSync(faviconSrc)) {
    copyFileSync(faviconSrc, join(bundleDir, "favicon.svg"));
    copyFileSync(faviconSrc, join(fixtureDir, "favicon.svg"));
  }

  applyWispPhase13Surfaces();

  // Phase 13 apply patches fixtures/hub-wisp-management/routes.cwl — bundle must match for GCE deploy.
  copyFileSync(fixtureRoutes, join(bundleDir, "routes.cwl"));
  if (existsSync(previewFixture)) copyFileSync(previewFixture, previewDst);

  return { ok: true, bundleDir, wispRoot, routesSrc };
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
 */
export function runWispGceDeploy(opts = {}) {
  const config = loadWispPipelineConfig();
  const gce = config.gce ?? {};
  const bundle = prepareWispCwlDeployBundle({ wispRoot: opts.wispRoot });
  if (!bundle.ok) return { ok: false, skip: bundle.skip ?? "bundle-failed" };
  if (!commandExists("gcloud")) return { ok: false, skip: "gcloud-unavailable" };

  const project = process.env.CHRYSALIS_WISP_GCE_PROJECT ?? gce.project;
  if (!project) return { ok: false, skip: "missing-gce-project" };

  const args = [
    "-Project", project,
    "-Zone", process.env.CHRYSALIS_WISP_GCE_ZONE ?? gce.zone ?? "us-central1-a",
    "-Name", process.env.CHRYSALIS_WISP_GCE_INSTANCE ?? gce.instance ?? "chrysalis-test-vm",
    "-BackendUrl", process.env.CHRYSALIS_WISP_BACKEND_URL ?? gce.backendUrl ?? "https://hss.wisptools.io",
    "-Port", String(gce.port ?? 19100),
    "-SkipLift",
  ];
  const wispRoot = opts.wispRoot ?? bundle.wispRoot;
  if (wispRoot) args.push("-WispModuleDir", wispRoot);
  const svelte = process.env.CHRYSALIS_WISP_SVELTE_FALLBACK ?? gce.svelteFallback ?? "";
  if (svelte) args.push("-SvelteFallback", svelte);
  if (opts.tunnelThroughIap) args.push("-TunnelThroughIap");

  let r;
  if (process.platform === "win32") {
    r = spawnSync(
      "powershell",
      ["-ExecutionPolicy", "Bypass", "-File", join(scriptRoot, "scripts/gce-wisp-local-stack-deploy.ps1"), ...args],
      { cwd: scriptRoot, encoding: "utf8", shell: false },
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
    if (wispRoot) shArgs.push("--wisp-root", wispRoot);
    if (svelte) shArgs.push("--svelte-fallback", svelte);
    if (opts.tunnelThroughIap) shArgs.push("--tunnel-through-iap");
    r = spawnSync("bash", shArgs, { cwd: scriptRoot, encoding: "utf8", shell: false });
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
    const bundle = prepareWispCwlDeployBundle({ wispRoot });
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
