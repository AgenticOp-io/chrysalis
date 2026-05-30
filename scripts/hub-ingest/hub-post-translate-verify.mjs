#!/usr/bin/env node
/**
 * Post-translate verify replay (G150): run chrysalis verify when traces + base URL exist.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_POST_TRANSLATE_VERIFY_KIND = "chrysalis.hub.post-translate-verify";
export const HUB_POST_TRANSLATE_VERIFY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {string} projectDir
 * @param {{ cliBin?: string, repoRoot?: string, threshold?: number }} [opts]
 */
export function runHubPostTranslateVerify(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const cliBin = opts.cliBin ?? join(repoRoot, "packages/cli/dist/bin.js");
  const threshold = opts.threshold ?? 1;
  const tracesDir = join(root, ".chrysalis", "traces");
  const reportDir = join(root, "reports", "verify");
  const baseUrl = process.env.CHRYSALIS_HUB_VERIFY_BASE_URL?.trim() ?? "";

  if (!existsSync(tracesDir)) {
    return {
      kind: HUB_POST_TRANSLATE_VERIFY_KIND,
      schemaVersion: HUB_POST_TRANSLATE_VERIFY_SCHEMA_VERSION,
      projectDir: root,
      ok: true,
      skipped: "no-traces",
      verify: null,
      generatedAt: new Date().toISOString(),
    };
  }
  if (!baseUrl) {
    return {
      kind: HUB_POST_TRANSLATE_VERIFY_KIND,
      schemaVersion: HUB_POST_TRANSLATE_VERIFY_SCHEMA_VERSION,
      projectDir: root,
      ok: true,
      skipped: "no-base-url-set-CHRYSALIS_HUB_VERIFY_BASE_URL",
      verify: { tracesDir, reportDir },
      generatedAt: new Date().toISOString(),
    };
  }
  if (!existsSync(cliBin)) {
    return {
      kind: HUB_POST_TRANSLATE_VERIFY_KIND,
      schemaVersion: HUB_POST_TRANSLATE_VERIFY_SCHEMA_VERSION,
      projectDir: root,
      ok: true,
      skipped: "no-cli-dist",
      verify: null,
      generatedAt: new Date().toISOString(),
    };
  }

  mkdirSync(reportDir, { recursive: true });
  const r = spawnSync(
    process.execPath,
    [
      cliBin,
      "verify",
      tracesDir,
      "--base-url",
      baseUrl,
      "--report",
      reportDir,
      "--project",
      root,
      "--threshold",
      String(threshold),
      "--json-summary",
      "--disable-cookie-chain",
    ],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );

  let summary = null;
  const summaryPath = join(reportDir, "summary.json");
  if (existsSync(summaryPath)) {
    try {
      summary = JSON.parse(readFileSync(summaryPath, "utf8"));
    } catch {
      summary = null;
    }
  }
  const correctness = summary?.aggregate?.correctness ?? null;
  const gatePass = correctness !== null && correctness >= threshold;
  const ok = (r.status ?? 1) === 0 && gatePass;

  return {
    kind: HUB_POST_TRANSLATE_VERIFY_KIND,
    schemaVersion: HUB_POST_TRANSLATE_VERIFY_SCHEMA_VERSION,
    projectDir: root,
    ok,
    skipped: null,
    verify: {
      tracesDir,
      reportDir,
      summaryPath: existsSync(summaryPath) ? summaryPath : null,
      correctness,
      gatePass,
      exitCode: r.status ?? 1,
      threshold,
      baseUrl,
    },
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let projectDir = null;
  let cliBin = join(scriptRoot, "packages/cli/dist/bin.js");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--cli" && argv[i + 1]) cliBin = resolve(argv[++i]);
  }
  if (!projectDir) {
    throw new Error("usage: hub-post-translate-verify.mjs --project <dir> [--cli path]");
  }
  return { projectDir, cliBin };
}

function main() {
  const { projectDir, cliBin } = parseArgs(process.argv);
  const report = runHubPostTranslateVerify(projectDir, { cliBin });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skipped) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main();
}
