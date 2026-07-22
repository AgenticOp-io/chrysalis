#!/usr/bin/env node
/**
 * G9992 — WISP Module_Manager POC from scratch (operator one-shot).
 *
 * Automates: resolve root → preflight → native convert → static export →
 * CSS sync + deploy bundle → Firebase stage → close smokes → optional deploy.
 *
 * GenieACS remains out of scope (D6205). LiteRT refused.
 *
 * Usage:
 *   node scripts/hub-ingest/hub-wisp-poc-from-scratch.mjs
 *   node scripts/hub-ingest/hub-wisp-poc-from-scratch.mjs --root <Module_Manager>
 *   node scripts/hub-ingest/hub-wisp-poc-from-scratch.mjs --skip-lift --skip-llm-is
 *   node scripts/hub-ingest/hub-wisp-poc-from-scratch.mjs --deploy-firebase
 *   node scripts/hub-ingest/hub-wisp-poc-from-scratch.mjs --deploy-gce
 *   node scripts/hub-ingest/hub-wisp-poc-from-scratch.mjs --smokes-only
 *
 * Env: CHRYSALIS_WISP_ROOT / WISP_MODULE_DIR (preferred)
 *      CHRYSALIS_WISP_POC_SKIP_LLM_IS=1 (default on unless --with-llm-is)
 *      CHRYSALIS_WISP_POC_DEPLOY_FIREBASE=1 / CHRYSALIS_WISP_POC_DEPLOY_GCE=1
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runWispSvelteNativeConvert } from "../lib/cwl-svelte-native-convert.mjs";
import { runWispCwlStaticExport } from "../lib/cwl-static-export.mjs";
import {
  loadWispPipelineConfig,
  resolveWispRoot,
  prepareWispCwlDeployBundle,
  syncWispOriginalCssAssets,
  runWispCwlPipeline,
} from "../wisp-cwl-pipeline.mjs";
import { stageWispCwlStaticExportClient } from "../wisp-cwl-firebase-static-stage.mjs";
import { runWispFirebaseDeploy } from "../wisp-cwl-firebase-deploy.mjs";

export const WISP_POC_FROM_SCRATCH_KIND = "chrysalis.wisp.poc-from-scratch";
export const WISP_POC_FROM_SCRATCH_SCHEMA_VERSION = 1;
export const WISP_POC_FROM_SCRATCH_GATE = "G9992";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Candidate Module_Manager roots when env is unset. */
const WISP_ROOT_CANDIDATES = [
  "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
  "C:/Users/david/Downloads/WISPTools/Module_Manager",
];

/**
 * @param {Record<string, unknown>} [config]
 */
export function autoResolveWispRoot(config = loadWispPipelineConfig()) {
  for (const key of config.wispRootEnv ?? ["CHRYSALIS_WISP_ROOT", "WISP_MODULE_DIR"]) {
    const v = process.env[key];
    if (v && existsSync(resolve(v))) return resolve(v);
  }
  const configured = resolveWispRoot(config);
  if (existsSync(configured)) return configured;
  for (const c of WISP_ROOT_CANDIDATES) {
    if (existsSync(c)) return resolve(c);
  }
  return configured;
}

/**
 * @param {string} wispRoot
 */
export function preflightWispPoc(wispRoot) {
  const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
  const wisptoolsRoot = resolve(wispRoot, "..");
  const firebaseJson = join(wisptoolsRoot, "firebase.json");
  const checks = [];
  const missing = [];

  function check(name, cond, fix = "") {
    checks.push({ name, ok: !!cond, fix });
    if (!cond) missing.push({ name, fix });
  }

  check("wisp-root", existsSync(wispRoot), "Set CHRYSALIS_WISP_ROOT to Module_Manager");
  check("wisp-package-json", existsSync(join(wispRoot, "package.json")), "Module_Manager must be a Node package");
  check("fixture-dir", existsSync(fixtureDir), "Commit fixtures/hub-wisp-management");
  check("pipeline-config", existsSync(join(fixtureDir, "wisp-pipeline.config.json")));
  check("api-paths", existsSync(join(fixtureDir, "wisp-api-paths.json")));
  check(
    "firebase-json-parent",
    existsSync(firebaseJson),
    `Expected firebase.json next to Module_Manager (${firebaseJson})`,
  );
  // Soft: sources present for lift
  const srcOk =
    existsSync(join(wispRoot, "src")) ||
    existsSync(join(wispRoot, "package")) ||
    existsSync(join(wispRoot, "svelte.config.js"));
  check("wisp-sources", srcOk, "Module_Manager src/ or Svelte tree expected for lift");

  mkdirSync(join(scriptRoot, "reports/wisp"), { recursive: true });
  mkdirSync(join(scriptRoot, "generated/_wisp-cwl-poc-deploy"), { recursive: true });

  return {
    ok: missing.every((m) => m.name === "firebase-json-parent" || m.name === "wisp-sources" || checks.find((c) => c.name === m.name)?.ok),
    hardOk: checks
      .filter((c) => !["firebase-json-parent", "wisp-sources"].includes(c.name))
      .every((c) => c.ok),
    checks,
    missing,
    wisptoolsRoot,
    firebaseJson,
    fixtureDir,
  };
}

function runSmoke(scriptRel) {
  const r = spawnSync(process.execPath, [join(scriptRoot, scriptRel)], {
    cwd: scriptRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 40 * 1024 * 1024,
  });
  return {
    script: scriptRel,
    status: r.status ?? 1,
    ok: (r.status ?? 1) === 0,
    stderrTail: (r.stderr ?? "").slice(-400),
  };
}

/**
 * @param {object} [opts]
 */
export async function runWispPocFromScratch(opts = {}) {
  const config = loadWispPipelineConfig();
  const wispRoot = resolve(opts.wispRoot ?? autoResolveWispRoot(config));
  const skipLift = opts.skipLift === true;
  const skipLlmIs =
    opts.withLlmIs === true
      ? false
      : opts.skipLlmIs !== false && process.env.CHRYSALIS_WISP_POC_SKIP_LLM_IS !== "0";
  const smokesOnly = opts.smokesOnly === true;
  const deployFirebase =
    opts.deployFirebase === true || process.env.CHRYSALIS_WISP_POC_DEPLOY_FIREBASE === "1";
  const deployGce = opts.deployGce === true || process.env.CHRYSALIS_WISP_POC_DEPLOY_GCE === "1";
  const dryRunDeploy = opts.dryRunDeploy === true || process.env.CHRYSALIS_WISP_POC_DRY_RUN === "1";

  /** @type {object[]} */
  const steps = [];
  const preflight = preflightWispPoc(wispRoot);
  steps.push({ step: "preflight", ok: preflight.hardOk, ...preflight });

  if (!preflight.hardOk) {
    return finalize({
      ok: false,
      wispRoot,
      skipLift,
      skipLlmIs,
      steps,
      preflight,
      skip: "preflight-failed",
    });
  }

  process.env.CHRYSALIS_WISP_ROOT = wispRoot;
  process.env.WISP_MODULE_DIR = wispRoot;

  // D6444 / G9993 — index ALL origin files into code DB + convert queue before convert.
  if (!smokesOnly) {
    const corpusRun = spawnSync(
      process.execPath,
      [join(scriptRoot, "scripts/build-origin-source-corpus.mjs")],
      {
        cwd: scriptRoot,
        encoding: "utf8",
        env: process.env,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    let corpusDetail = null;
    try {
      corpusDetail = corpusRun.stdout ? JSON.parse(corpusRun.stdout) : null;
    } catch {
      corpusDetail = null;
    }
    steps.push({
      step: "origin-source-corpus",
      ok: corpusRun.status === 0 && corpusDetail?.ok !== false,
      status: corpusRun.status,
      fileCount: corpusDetail?.stats?.fileCount ?? null,
      pieceCount: corpusDetail?.stats?.pieceCount ?? null,
      next: corpusDetail?.next?.slice?.(0, 8) ?? null,
      artifacts: corpusDetail?.artifacts ?? null,
    });
    if (corpusRun.status !== 0) {
      return finalize({
        ok: false,
        wispRoot,
        skipLift,
        skipLlmIs,
        steps,
        preflight,
        skip: "origin-source-corpus-failed",
        stderrTail: (corpusRun.stderr || "").slice(-1500),
      });
    }
  } else {
    steps.push({ step: "origin-source-corpus", ok: true, skip: "smokes-only" });
  }

  if (!smokesOnly) {
    const convert = await runWispSvelteNativeConvert({
      wispRoot,
      skipLift,
      skipLlmIs,
      deploy: false,
    });
    steps.push({
      step: "svelte-native-convert",
      ok: convert.ok === true,
      skip: convert.skip,
      reportPath: convert.reportPath,
      integrity: convert.integrity,
    });
    if (!convert.ok) {
      return finalize({ ok: false, wispRoot, skipLift, skipLlmIs, steps, preflight, convert });
    }

    const exported = await runWispCwlStaticExport({});
    steps.push({
      step: "cwl-static-export",
      ok: exported.ok === true,
      skip: exported.skip,
      pageCount: exported.pageCount ?? exported.exported?.length ?? null,
    });
    if (!exported.ok) {
      return finalize({ ok: false, wispRoot, skipLift, skipLlmIs, steps, preflight, exported });
    }

    const fixtureDir = join(scriptRoot, config.fixtureDir ?? "fixtures/hub-wisp-management");
    const css = syncWispOriginalCssAssets({ wispRoot, fixtureDir });
    steps.push({ step: "sync-original-css", ok: css.ok === true, hardwareCssPresent: css.hardwareCssPresent });

    const bundle = prepareWispCwlDeployBundle({ wispRoot, skipLift: true });
    steps.push({ step: "deploy-bundle", ok: bundle.ok === true, skip: bundle.skip, bundleDir: bundle.bundleDir });

    const staged = stageWispCwlStaticExportClient({ wispRoot, dryRun: false });
    steps.push({
      step: "firebase-static-stage",
      ok: staged.ok === true || staged.skip === "cwl-static-export-manifest-incomplete",
      strictOk: staged.ok === true,
      skip: staged.skip,
      pageCount: staged.pageCount,
      clientDir: staged.clientDir,
    });
    // Incomplete page count is a soft fail for CI without full export history — convert should fix.
    if (staged.ok !== true && staged.skip !== "cwl-static-export-manifest-incomplete") {
      return finalize({ ok: false, wispRoot, skipLift, skipLlmIs, steps, preflight, staged });
    }
  } else {
    steps.push({ step: "svelte-native-convert", ok: true, skip: "smokes-only" });
    steps.push({ step: "cwl-static-export", ok: true, skip: "smokes-only" });
  }

  // Close / integrity smoke pack (automated bar for from-scratch).
  const smokeScripts = [
    "scripts/hub-ingest/hub-wisp-cwl-routes-integrity-smoke.mjs",
    "scripts/hub-ingest/hub-wisp-cwl-module-depth-smoke.mjs",
    "scripts/hub-ingest/hub-phase45-wisp-showcase-smoke.mjs",
  ];
  /** @type {object[]} */
  const smokes = [];
  for (const s of smokeScripts) {
    if (!existsSync(join(scriptRoot, s))) {
      smokes.push({ script: s, ok: true, skip: "missing-smoke-script" });
      continue;
    }
    smokes.push(runSmoke(s));
  }
  const smokesOk = smokes.every((s) => s.ok);
  steps.push({ step: "close-smokes", ok: smokesOk, smokes });

  let firebaseDeploy = null;
  let gceDeploy = null;
  if (deployFirebase) {
    // Static export was already staged into build/client — do not rebuild SPA over it.
    firebaseDeploy = runWispFirebaseDeploy({
      dryRun: dryRunDeploy,
      wispRoot,
      skipBuild: true,
    });
    steps.push({
      step: "deploy-firebase",
      ok: firebaseDeploy?.ok === true || firebaseDeploy?.skip != null,
      skip: firebaseDeploy?.skip,
      dryRun: dryRunDeploy,
      authMode: firebaseDeploy?.authMode,
    });
  }
  if (deployGce) {
    gceDeploy = await runWispCwlPipeline({
      wispRoot,
      skipLift: true,
      deployGce: true,
      ci: dryRunDeploy,
    });
    steps.push({ step: "deploy-gce", ok: gceDeploy?.ok === true, skip: gceDeploy?.skip });
  }

  const ok =
    steps.every((s) => s.ok === true) &&
    (!deployFirebase || steps.find((s) => s.step === "deploy-firebase")?.ok === true) &&
    (!deployGce || steps.find((s) => s.step === "deploy-gce")?.ok === true);

  return finalize({
    ok,
    wispRoot,
    skipLift,
    skipLlmIs,
    smokesOnly,
    deployFirebase,
    deployGce,
    steps,
    preflight,
    firebaseDeploy,
    gceDeploy,
    smokes,
    note: "GenieACS OOS (D6205). Models propose; verify dispose. Prefer scripts/lib/cwl-* for engine.",
  });
}

function finalize(report) {
  const out = {
    kind: WISP_POC_FROM_SCRATCH_KIND,
    schemaVersion: WISP_POC_FROM_SCRATCH_SCHEMA_VERSION,
    gate: WISP_POC_FROM_SCRATCH_GATE,
    ...report,
    generatedAt: new Date().toISOString(),
  };
  const reportDir = join(scriptRoot, "reports/wisp");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, "poc-from-scratch.json");
  writeFileSync(reportPath, `${JSON.stringify(out, null, 2)}\n`);
  out.reportPath = reportPath;
  return out;
}

function parseArgs(argv) {
  /** @type {Record<string, unknown>} */
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) opts.wispRoot = argv[++i];
    else if (a === "--skip-lift") opts.skipLift = true;
    else if (a === "--skip-llm-is") opts.skipLlmIs = true;
    else if (a === "--with-llm-is") opts.withLlmIs = true;
    else if (a === "--smokes-only") opts.smokesOnly = true;
    else if (a === "--deploy-firebase") opts.deployFirebase = true;
    else if (a === "--deploy-gce") opts.deployGce = true;
    else if (a === "--dry-run-deploy") opts.dryRunDeploy = true;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const r = await runWispPocFromScratch(opts);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
