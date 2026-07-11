#!/usr/bin/env node
/** Aggregate operator hub trajectories into IS live analytics (G9600 / D6378). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWebLlmBuildShorthandHub } from "./web-llm-build-shorthand-hub.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/**
 * @param {object} [opts]
 */
export async function runWebLlmAggregateLiveAnalytics(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  const extraPaths = Array.isArray(opts.trajectoryPaths) ? opts.trajectoryPaths.map((p) => resolve(p)) : [];
  const discovered = mod.discoverOperatorTrajectoryPaths(repoRoot);
  const paths = [...new Set([...discovered, ...extraPaths])];

  const summary = mod.aggregateIsLiveAnalyticsFromTrajectoryFiles(paths, {
    notes: [
      "G9600 operator evidence aggregate — excludes synthetic smoke workdirs.",
      "Hit/near-miss/miss rates reflect copied hub-convert trajectories only.",
    ],
  });
  const analyticsPath = mod.writeIsLiveAnalytics(repoRoot, summary);
  const hub = await runWebLlmBuildShorthandHub({ repoRoot });

  return {
    kind: "chrysalis.web-llm.aggregate-live-analytics",
    schemaVersion: 1,
    ok: summary.jobCount > 0 && hub.ok !== false,
    summary,
    analyticsPath,
    discoveredCount: discovered.length,
    usedSourceCount: summary.notes?.filter((n) => n.startsWith("  ")).length ?? 0,
    shorthandHub: hub,
  };
}

async function main() {
  const result = await runWebLlmAggregateLiveAnalytics();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

if (process.argv[1]?.includes("web-llm-aggregate-live-analytics")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
