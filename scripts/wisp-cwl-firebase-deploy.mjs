#!/usr/bin/env node
/**
 * Deploy WISP Module_Manager to Firebase Hosting (management target).
 *
 * Usage:
 *   node scripts/wisp-cwl-firebase-deploy.mjs [--root path] [--dry-run] [--skip-build]
 *
 * Requires: firebase CLI on PATH, WISPTools firebase.json at parent of Module_Manager.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildWispClient, resolveWispToolsRoot } from "./wisp-cwl-client-build.mjs";
import { loadWispPipelineConfig, resolveWispRoot } from "./wisp-cwl-pipeline.mjs";
import { prepareWispFirebaseDeployEnv } from "./wisp/wisp-firebase-auth-env.mjs";
import { ensureWispManagementFirebaseApiRewrites } from "./wisp/wisp-firebase-management-rewrites.mjs";

export const WISP_CWL_FIREBASE_DEPLOY_KIND = "chrysalis.wisp.firebase-deploy";
export const WISP_CWL_FIREBASE_DEPLOY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function commandExists(cmd) {
  const check = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(check, [cmd], { encoding: "utf8", shell: false });
  return r.status === 0;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.wispRoot]
 * @param {boolean} [opts.dryRun]
 * @param {boolean} [opts.skipBuild]
 * @param {string} [opts.hostingTarget]
 * @param {string} [opts.firebaseProject]
 */
export function runWispFirebaseDeploy(opts = {}) {
  const config = loadWispPipelineConfig();
  const firebaseCfg = config.firebase ?? {};
  const wispRoot = resolve(opts.wispRoot ?? resolveWispRoot(config));
  const wispToolsRoot = resolveWispToolsRoot(wispRoot);
  const hostingTarget = opts.hostingTarget ?? firebaseCfg.hostingTarget ?? "hosting:management";
  const firebaseProject = opts.firebaseProject ?? process.env.CHRYSALIS_WISP_FIREBASE_PROJECT ?? firebaseCfg.project ?? "";
  const onlyArg = hostingTarget.startsWith("hosting:") ? hostingTarget : `hosting:${hostingTarget}`;

  const base = {
    kind: WISP_CWL_FIREBASE_DEPLOY_KIND,
    schemaVersion: WISP_CWL_FIREBASE_DEPLOY_SCHEMA_VERSION,
    ok: false,
    wispRoot,
    wispToolsRoot,
    hostingTarget: onlyArg,
    firebaseProject: firebaseProject || undefined,
  };

  if (!existsSync(join(wispToolsRoot, "firebase.json"))) {
    return { ...base, skip: "missing-firebase-json", wispToolsRoot };
  }

  const rewriteFix = ensureWispManagementFirebaseApiRewrites(wispToolsRoot, {
    write: opts.dryRun !== true,
    // Default for CWL static Firebase POC: HSS direct (apiProxy currently unreachable → 503).
    preferDirectBackend: process.env.CHRYSALIS_WISP_PREFER_DIRECT_BACKEND !== "0",
  });

  /** @type {Record<string, unknown> | null} */
  let clientBuild = null;
  if (!opts.skipBuild) {
    clientBuild = buildWispClient({ deployTarget: "firebase", wispRoot, dryRun: opts.dryRun });
    if (!clientBuild.ok) {
      return { ...base, skip: clientBuild.skip ?? "client-build-failed", clientBuild };
    }
  }

  if (opts.dryRun) {
    return {
      ...base,
      ok: true,
      dryRun: true,
      clientBuild,
      wouldRun: firebaseProject
        ? `firebase deploy --only ${onlyArg} --project ${firebaseProject}`
        : `firebase deploy --only ${onlyArg}`,
    };
  }

  if (!commandExists("firebase")) {
    return { ...base, skip: "firebase-cli-unavailable", clientBuild };
  }

  const auth = prepareWispFirebaseDeployEnv({ wispToolsRoot });
  const args = ["deploy", "--only", onlyArg, "--non-interactive"];
  if (firebaseProject) args.push("--project", firebaseProject);

  const deploy = spawnSync("firebase", args, {
    cwd: wispToolsRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: auth.env,
  });

  const ok = deploy.status === 0;
  return {
    ...base,
    ok,
    status: deploy.status ?? 1,
    authMode: auth.authMode,
    authNotes: auth.notes,
    serviceAccountPath: auth.serviceAccountPath ?? undefined,
    rewriteFix,
    clientBuild,
    stderrTail: (deploy.stderr ?? "").slice(-600) || undefined,
    stdoutTail: (deploy.stdout ?? "").slice(-600) || undefined,
  };
}

function parseArgs(argv) {
  let wispRoot = "";
  let dryRun = false;
  let skipBuild = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1]) wispRoot = argv[++i];
    else if (argv[i] === "--dry-run") dryRun = true;
    else if (argv[i] === "--skip-build") skipBuild = true;
  }
  return { wispRoot: wispRoot || undefined, dryRun, skipBuild };
}

async function main() {
  const args = parseArgs(process.argv);
  const r = runWispFirebaseDeploy(args);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-firebase-deploy")) main().catch((e) => { console.error(e); process.exit(1); });
