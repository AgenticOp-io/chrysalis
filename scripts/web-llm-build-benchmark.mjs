#!/usr/bin/env node
/** Build Web Verify Benchmark (WVB) from in-repo fixtures. */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

export const WEB_LLM_BUILD_BENCHMARK_KIND = "chrysalis.web-llm.build-benchmark";

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
 * @param {string} [opts.repoRoot]
 * @param {string} [opts.outPath]
 */
export async function runWebLlmBuildBenchmark(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const outPath =
    opts.outPath ?? join(repoRoot, "fixtures/web-llm/chrysalis.web-verify-benchmark.v1.json");
  const mod = await loadWebLlm();
  const benchmark = mod.buildWebVerifyBenchmark({ repoRoot, includeWispUiAnchors: true });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(benchmark, null, 2)}\n`, "utf8");
  const summary = mod.summarizeWebVerifyBenchmark(benchmark);
  return {
    kind: WEB_LLM_BUILD_BENCHMARK_KIND,
    schemaVersion: 1,
    ok: summary.ok === true,
    outPath,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWebLlmBuildBenchmark();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("web-llm-build-benchmark")) main();
