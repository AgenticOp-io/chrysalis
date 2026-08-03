#!/usr/bin/env node
/**
 * Build WISP Module_Manager client for a deploy target (Firebase Hosting or GCE chimera).
 *
 * Usage:
 *   node scripts/wisp-cwl-client-build.mjs --target gce|firebase [--root path] [--dry-run]
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWispPipelineConfig } from "./wisp-cwl-pipeline.mjs";
import { stageWispCwlStaticExportClient } from "./wisp-cwl-firebase-static-stage.mjs";
import { resolveWispModuleRoot } from "./lib/wisp-origin-paths.mjs";

export const WISP_CWL_CLIENT_BUILD_KIND = "chrysalis.wisp.client-build";
export const WISP_CWL_CLIENT_BUILD_SCHEMA_VERSION = 1;

/** @typedef {"gce"|"firebase"} WispDeployTarget */

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultRoot =
  resolveWispModuleRoot(process.env.CHRYSALIS_WISP_ROOT ?? process.env.WISP_MODULE_DIR);

/** @type {Record<WispDeployTarget, { npmScript: string, env: Record<string, string>, summary: string }>} */
export const WISP_DEPLOY_TARGET_PROFILES = {
  gce: {
    npmScript: "build:single-use",
    env: {
      VITE_CHRYSALIS_SAME_ORIGIN_API: "1",
      VITE_BACKEND_URL: "",
    },
    summary: "GCE chimera — same-origin /api proxied by gateway (no Firebase apiProxy CORS)",
  },
  firebase: {
    npmScript: "build",
    env: {
      VITE_CHRYSALIS_SAME_ORIGIN_API: "",
      VITE_BACKEND_URL: "",
    },
    summary: "Firebase Hosting — same-origin /api via Hosting rewrites to apiProxy",
  },
};

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32", ...opts });
  return { status: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

/**
 * Resolve WISPTools repo root (parent of Module_Manager) for firebase deploy.
 * @param {string} wispRoot
 */
export function resolveWispToolsRoot(wispRoot) {
  const base = resolve(wispRoot);
  const name = base.split(/[/\\]/).pop();
  if (name === "Module_Manager") return resolve(base, "..");
  return base;
}

/** @param {Record<string, unknown>} config @param {"gce"|"firebase"} deployTarget */
export function resolveWispDeployApiMode(config, deployTarget) {
  const section = deployTarget === "firebase" ? config.firebase : config.gce;
  const targetSection = config.deployTargets?.[deployTarget];
  return targetSection?.apiMode ?? section?.apiMode ?? null;
}

/**
 * @param {object} [opts]
 * @param {WispDeployTarget} [opts.deployTarget]
 * @param {string} [opts.wispRoot]
 * @param {boolean} [opts.dryRun]
 */
export function buildWispClient(opts = {}) {
  const deployTarget = opts.deployTarget ?? "gce";
  const profile = WISP_DEPLOY_TARGET_PROFILES[deployTarget];
  if (!profile) {
    return {
      kind: WISP_CWL_CLIENT_BUILD_KIND,
      schemaVersion: WISP_CWL_CLIENT_BUILD_SCHEMA_VERSION,
      ok: false,
      skip: "unknown-deploy-target",
      deployTarget,
    };
  }

  const wispRoot = resolve(opts.wispRoot ?? defaultRoot);
  const clientDir = join(wispRoot, "build/client");
  const config = loadWispPipelineConfig();
  const apiMode = resolveWispDeployApiMode(config, deployTarget);
  const base = {
    kind: WISP_CWL_CLIENT_BUILD_KIND,
    schemaVersion: WISP_CWL_CLIENT_BUILD_SCHEMA_VERSION,
    ok: false,
    deployTarget,
    profile: profile.summary,
    apiMode,
    wispRoot,
    wispToolsRoot: resolveWispToolsRoot(wispRoot),
    clientDir,
  };

  if (deployTarget === "firebase" && apiMode === "cwl-static-export") {
    const staged = stageWispCwlStaticExportClient({
      wispRoot,
      dryRun: opts.dryRun,
    });
    if (staged.ok !== true) {
      return {
        ...base,
        skip: staged.skip ?? "cwl-static-export-stage-failed",
        stage: staged,
        buildMode: "cwl-static-export",
      };
    }
    return {
      ...base,
      ok: true,
      buildMode: "cwl-static-export",
      npmScript: null,
      stage: staged,
      dryRun: opts.dryRun === true ? true : undefined,
    };
  }

  if (!existsSync(join(wispRoot, "package.json"))) {
    return { ...base, skip: "missing-wisp-package-json" };
  }

  if (opts.dryRun) {
    return { ...base, ok: true, dryRun: true, npmScript: profile.npmScript, env: profile.env };
  }

  const env = { ...process.env, ...profile.env };
  const build = run("npm", ["run", profile.npmScript], { cwd: wispRoot, env });
  if (build.status !== 0 || !existsSync(clientDir)) {
    return {
      ...base,
      skip: "wisp-build-failed",
      npmScript: profile.npmScript,
      detail: (build.stderr || build.stdout).slice(-800) || undefined,
    };
  }

  return { ...base, ok: true, npmScript: profile.npmScript };
}

function parseArgs(argv) {
  /** @type {WispDeployTarget} */
  let target = "gce";
  let root = defaultRoot;
  let dryRun = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--target" && argv[i + 1]) target = /** @type {WispDeployTarget} */ (argv[++i]);
    else if (argv[i] === "--root" && argv[i + 1]) root = argv[++i];
    else if (argv[i] === "--dry-run") dryRun = true;
  }
  return { target, root, dryRun };
}

async function main() {
  const { target, root, dryRun } = parseArgs(process.argv);
  const r = buildWispClient({ deployTarget: target, wispRoot: root, dryRun });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-client-build")) main().catch((e) => { console.error(e); process.exit(1); });
