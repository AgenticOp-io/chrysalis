#!/usr/bin/env node
/**
 * Apply oracle golden bodies into api-proxy.cwl handlers (Phase 29a).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  WISP_API_PILOT_HANDLER_KIND,
  buildTenantsGetHandlerBlock,
} from "./wisp-cwl-apply-api-pilot-handler.mjs";
import {
  buildNativeHandlerBlock,
  goldenFileName,
  listApiRouteSpecs,
  patchApiProxyHandlerBlock,
} from "./wisp-cwl-api-oracle-contract.mjs";

export { WISP_API_PILOT_HANDLER_KIND };

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiProxyPath = join(scriptRoot, "fixtures/hub-wisp-management/api-proxy.cwl");
const goldensDir = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-goldens");
const goldensIndexPath = join(scriptRoot, "fixtures/hub-wisp-management/chrysalis.wisp-api-goldens.v1.json");
const tenantsGoldenPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-tenants-get.golden.json");

/**
 * @param {object} [opts]
 * @param {string} [opts.goldenPath]
 */
export function applyWispApiPilotHandler(opts = {}) {
  const goldenPath = resolve(opts.goldenPath ?? tenantsGoldenPath);
  if (!existsSync(goldenPath)) {
    return { kind: WISP_API_PILOT_HANDLER_KIND, schemaVersion: 1, ok: false, skip: "missing-golden" };
  }
  if (!existsSync(apiProxyPath)) {
    return { kind: WISP_API_PILOT_HANDLER_KIND, schemaVersion: 1, ok: false, skip: "missing-api-proxy" };
  }
  const golden = JSON.parse(readFileSync(goldenPath, "utf8"));
  const block = buildTenantsGetHandlerBlock(golden);
  let text = readFileSync(apiProxyPath, "utf8");
  const patched = patchApiProxyHandlerBlock(text, "GET", "/api/tenants", block);
  if (!patched.ok) return { kind: WISP_API_PILOT_HANDLER_KIND, schemaVersion: 1, ok: false, ...patched };
  writeFileSync(apiProxyPath, patched.text, "utf8");
  return {
    kind: WISP_API_PILOT_HANDLER_KIND,
    schemaVersion: 1,
    ok: true,
    goldenPath,
    apiProxyPath,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.includeTenantsPilot]
 */
export function applyWispApiGoldenHandlers(opts = {}) {
  const base = {
    kind: "chrysalis.wisp.api-golden-handlers",
    schemaVersion: 1,
    ok: false,
  };
  if (!existsSync(apiProxyPath)) return { ...base, skip: "missing-api-proxy" };

  /** @type {Array<{ method: string, path: string, handler: string, goldenPath: string, ok: boolean }>} */
  const applied = [];
  let text = readFileSync(apiProxyPath, "utf8");

  const specs = listApiRouteSpecs();
  for (const spec of specs) {
    const file = join(goldensDir, goldenFileName(spec.method, spec.path));
    if (!existsSync(file)) continue;
    const golden = JSON.parse(readFileSync(file, "utf8"));
    const block = buildNativeHandlerBlock(spec, golden);
    const patched = patchApiProxyHandlerBlock(text, spec.method, spec.path, block);
    if (!patched.ok) {
      applied.push({ method: spec.method, path: spec.path, handler: spec.handler, goldenPath: file, ok: false });
      continue;
    }
    text = patched.text;
    applied.push({ method: spec.method, path: spec.path, handler: spec.handler, goldenPath: file, ok: true });
  }

  if (opts.includeTenantsPilot !== false && existsSync(tenantsGoldenPath)) {
    const golden = JSON.parse(readFileSync(tenantsGoldenPath, "utf8"));
    const block = buildTenantsGetHandlerBlock(golden);
    const patched = patchApiProxyHandlerBlock(text, "GET", "/api/tenants", block);
    if (patched.ok) text = patched.text;
  }

  const appliedOk = applied.filter((a) => a.ok);
  if (appliedOk.length === 0 && !existsSync(tenantsGoldenPath)) {
    return { ...base, skip: "no-goldens", applied };
  }

  writeFileSync(apiProxyPath, text.endsWith("\n") ? text : `${text}\n`, "utf8");

  const index = {
    kind: "chrysalis.wisp.api-goldens",
    schemaVersion: 1,
    goldensDir: "wisp-api-goldens",
    handlerCount: specs.length,
    appliedCount: appliedOk.length,
    routes: appliedOk.map((a) => ({
      method: a.method,
      path: a.path,
      handler: a.handler,
      goldenPath: `wisp-api-goldens/${goldenFileName(a.method, a.path)}`,
    })),
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(goldensIndexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  return {
    ...base,
    // Partial apply is expected after expanding mounts beyond traced goldens.
    ok: appliedOk.length > 0,
    partial: appliedOk.length < specs.length,
    appliedCount: appliedOk.length,
    handlerCount: specs.length,
    goldensDir,
    goldensIndexPath,
    applied,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const all = process.argv.includes("--all");
  const r = all ? applyWispApiGoldenHandlers() : applyWispApiPilotHandler();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (
  process.argv[1]?.includes("wisp-cwl-apply-api-golden-handlers") ||
  process.argv[1]?.includes("wisp-cwl-apply-api-pilot-handler")
) {
  main();
}
