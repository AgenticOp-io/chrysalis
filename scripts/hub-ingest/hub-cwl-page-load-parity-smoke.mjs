#!/usr/bin/env node
/**
 * runtime-cwl page-load parity on flagship blog route (G1185).
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_CWL_PAGE_LOAD_PARITY_KIND = "chrysalis.hub.cwl-page-load-parity";
export const HUB_CWL_PAGE_LOAD_PARITY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const flagshipDir = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack");

async function loadRuntime(repoRoot) {
  try {
    return await import("@chrysalis/runtime-cwl");
  } catch {
    return import(pathToFileURL(join(repoRoot, "packages/runtime-cwl/dist/index.js")).href);
  }
}

export async function runCwlPageLoadParitySmoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const base = {
    kind: HUB_CWL_PAGE_LOAD_PARITY_KIND,
    schemaVersion: HUB_CWL_PAGE_LOAD_PARITY_SCHEMA_VERSION,
    ok: false,
  };
  const { createCwlRuntime, loadModuleFromCwlFile } = await loadRuntime(repoRoot);
  const runtime = createCwlRuntime({
    module: loadModuleFromCwlFile(join(flagshipDir, "routes.cwl"), repoRoot),
  });
  const res = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/blog/hello" });
  const body = await res.text();
  const ok =
    res.status === 200 &&
    body.includes("cwl-page-load") &&
    body.includes('"slug":"hello"') &&
    body.includes("<h1>Blog</h1>");
  return {
    ...base,
    ok,
    status: res.status,
    hasSidecar: body.includes("cwl-page-load"),
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlPageLoadParitySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
