#!/usr/bin/env node
/**
 * runtime-cwl session stub smoke (G1412): injected session map reaches simulate without holes.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_CWL_SESSION_STUB_KIND = "chrysalis.hub.cwl-session-stub";
export const HUB_CWL_SESSION_STUB_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const flagshipCwl = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack/routes.cwl");

export async function runCwlSessionStubSmoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const base = {
    kind: HUB_CWL_SESSION_STUB_KIND,
    schemaVersion: HUB_CWL_SESSION_STUB_SCHEMA_VERSION,
    ok: false,
  };
  let createCwlRuntime;
  let loadModuleFromCwlFile;
  try {
    const mod = await import("@chrysalis/runtime-cwl");
    createCwlRuntime = mod.createCwlRuntime;
    loadModuleFromCwlFile = mod.loadModuleFromCwlFile;
  } catch {
    const dist = join(repoRoot, "packages/runtime-cwl/dist/index.js");
    const mod = await import(pathToFileURL(dist).href);
    createCwlRuntime = mod.createCwlRuntime;
    loadModuleFromCwlFile = mod.loadModuleFromCwlFile;
  }
  const runtime = createCwlRuntime({ module: loadModuleFromCwlFile(flagshipCwl, repoRoot) });
  const res = await runtime.fetch({
    method: "GET",
    url: "http://127.0.0.1/api/health",
    headers: { cookie: "chrysalis_session=stub-pilot" },
  });
  const body = await res.text();
  return {
    ...base,
    ok: res.status === 200 && body.includes('"ok":true'),
    status: res.status,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlSessionStubSmoke();
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
