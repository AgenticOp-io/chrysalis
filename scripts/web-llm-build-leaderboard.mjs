#!/usr/bin/env node
/** Build static WVB leaderboard (HTML + JSON). */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWebLlmBuildBenchmark } from "./web-llm-build-benchmark.mjs";

export const WEB_LLM_BUILD_LEADERBOARD_KIND = "chrysalis.web-llm.build-leaderboard";

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
export async function runWebLlmBuildLeaderboard(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();

  const benchmarkPath = join(repoRoot, "fixtures/web-llm/chrysalis.web-verify-benchmark.v1.json");
  if (!existsSync(benchmarkPath)) {
    await runWebLlmBuildBenchmark({ repoRoot });
  }
  const benchmark = JSON.parse(readFileSync(benchmarkPath, "utf8"));
  const board = mod.buildWebVerifyLeaderboard({ benchmark });
  const html = mod.renderLeaderboardHtml(board);

  const outDir = resolve(opts.outDir ?? mod.resolveWebLlmLeaderboardDir(repoRoot));
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, "leaderboard.v1.json");
  const htmlPath = join(outDir, "index.html");
  writeFileSync(jsonPath, `${JSON.stringify(board, null, 2)}\n`, "utf8");
  writeFileSync(htmlPath, html, "utf8");

  return {
    kind: WEB_LLM_BUILD_LEADERBOARD_KIND,
    schemaVersion: 1,
    ok: board.benchmarkCaseCount >= 50,
    jsonPath,
    htmlPath,
    caseCount: board.benchmarkCaseCount,
    entryCount: board.entries.length,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWebLlmBuildLeaderboard();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("web-llm-build-leaderboard")) main();
