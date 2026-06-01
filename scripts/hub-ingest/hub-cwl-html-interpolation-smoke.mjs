#!/usr/bin/env node
/**
 * CWL HTML param interpolation smoke (G1189): flagship blog + docs routes.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_CWL_HTML_INTERPOLATION_KIND = "chrysalis.hub.cwl-html-interpolation";
export const HUB_CWL_HTML_INTERPOLATION_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const flagshipDir = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack");

async function loadRuntime(repoRoot) {
  try {
    return await import("@chrysalis/runtime-cwl");
  } catch {
    return import(pathToFileURL(join(repoRoot, "packages/runtime-cwl/dist/index.js")).href);
  }
}

export async function runCwlHtmlInterpolationSmoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const base = {
    kind: HUB_CWL_HTML_INTERPOLATION_KIND,
    schemaVersion: HUB_CWL_HTML_INTERPOLATION_SCHEMA_VERSION,
    ok: false,
  };
  const { createCwlRuntime, loadModuleFromCwlFile } = await loadRuntime(repoRoot);
  const runtime = createCwlRuntime({
    module: loadModuleFromCwlFile(join(flagshipDir, "routes.cwl"), repoRoot),
  });
  const blog = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/blog/world" });
  const docs = await runtime.fetch({ method: "GET", url: "http://127.0.0.1/docs/world" });
  const blogBody = await blog.text();
  const docsBody = await docs.text();
  const ok =
    blog.status === 200 &&
    docs.status === 200 &&
    blogBody.includes("world") &&
    docsBody.includes("world") &&
    blogBody.includes("cwl-page-load");
  return {
    ...base,
    ok,
    blog: { status: blog.status, hasSlug: blogBody.includes("world") },
    docs: { status: docs.status, hasSlug: docsBody.includes("world") },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlHtmlInterpolationSmoke();
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
