#!/usr/bin/env node
/**
 * runtime-cwl production readiness gates (G1168): multi-route flagship probes.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildCwlPreviewReport } from "./hub-cwl-preview.mjs";

export const HUB_CWL_RUNTIME_PRODUCTION_KIND = "chrysalis.hub.cwl-runtime-production";
export const HUB_CWL_RUNTIME_PRODUCTION_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const flagshipDir = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack");

const PROBES = [
  { method: "GET", path: "/", expectStatus: 200, expectHtml: true },
  { method: "GET", path: "/docs/intro", expectStatus: 200, expectHtml: true },
  { method: "GET", path: "/about", expectStatus: 200, expectHtml: true },
  { method: "GET", path: "/blog/hello", expectStatus: 200, expectHtml: true, expectPageLoad: true, expectSlug: "hello" },
  { method: "GET", path: "/search?q=prod21", expectStatus: 200, expectHtml: true, expectQuery: "prod21" },
  { method: "GET", path: "/api/health", expectStatus: 200, expectJson: true },
  { method: "POST", path: "/api/notify", expectStatus: 200, expectJson: true },
];

/**
 * @param {object} [opts]
 */
export async function runCwlRuntimeProductionSmoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const cwlPath = join(flagshipDir, "routes.cwl");
  const base = {
    kind: HUB_CWL_RUNTIME_PRODUCTION_KIND,
    schemaVersion: HUB_CWL_RUNTIME_PRODUCTION_SCHEMA_VERSION,
    ok: false,
  };
  if (!existsSync(cwlPath)) {
    return { ...base, skip: "missing-flagship-cwl" };
  }

  let createCwlRuntime;
  let loadModuleFromCwlFile;
  try {
    const mod = await import("@chrysalis/runtime-cwl");
    createCwlRuntime = mod.createCwlRuntime;
    loadModuleFromCwlFile = mod.loadModuleFromCwlFile;
  } catch {
    const dist = join(repoRoot, "packages/runtime-cwl/dist/index.js");
    if (!existsSync(dist)) {
      return { ...base, skip: "runtime-cwl-not-built" };
    }
    const mod = await import(pathToFileURL(dist).href);
    createCwlRuntime = mod.createCwlRuntime;
    loadModuleFromCwlFile = mod.loadModuleFromCwlFile;
  }

  const module = loadModuleFromCwlFile(cwlPath, repoRoot);
  const runtime = createCwlRuntime({ module });
  /** @type {Record<string, { ok: boolean, status?: number }>} */
  const probes = {};
  let ok = true;
  for (const probe of PROBES) {
    const res = await runtime.fetch({
      method: probe.method,
      url: `http://127.0.0.1${probe.path}`,
    });
    const body = await res.text();
    const caseOk =
      res.status === probe.expectStatus &&
      (!probe.expectHtml || body.includes("<")) &&
      (!probe.expectJson || body.trimStart().startsWith("{")) &&
      (!probe.expectPageLoad || body.includes("cwl-page-load")) &&
      (!probe.expectSlug || body.includes(probe.expectSlug)) &&
      (!probe.expectQuery || body.includes(probe.expectQuery));
    probes[`${probe.method} ${probe.path}`] = { ok: caseOk, status: res.status };
    if (!caseOk) ok = false;
  }

  const preview = await buildCwlPreviewReport(flagshipDir, { cwlPath, probe: false, repoRoot });

  return {
    ...base,
    ok: ok && preview.ok === true && (preview.holeCount ?? 0) === 0,
    probes,
    routeCount: preview.routeCount ?? 0,
    pageLoadRouteCount: preview.pageLoadRouteCount ?? 0,
    holeCount: preview.holeCount ?? 0,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlRuntimeProductionSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
