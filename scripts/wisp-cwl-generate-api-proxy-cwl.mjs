#!/usr/bin/env node
/**
 * Generate CWL api-proxy module from wisp-api-paths.json (Phase 12 Phase 0).
 * Usage: node scripts/wisp-cwl-generate-api-proxy-cwl.mjs [--manifest path] [--out path]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_API_PROXY_CWL_KIND = "chrysalis.wisp.api-proxy-cwl";
export const WISP_API_PROXY_CWL_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifest = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-paths.json");
const defaultOut = join(scriptRoot, "fixtures/hub-wisp-management/api-proxy.cwl");

/**
 * @param {object} [opts]
 */
export function generateWispApiProxyCwl(opts = {}) {
  const manifestPath = resolve(opts.manifest ?? defaultManifest);
  const outPath = resolve(opts.out ?? defaultOut);
  if (!existsSync(manifestPath)) {
    return { kind: WISP_API_PROXY_CWL_KIND, schemaVersion: WISP_API_PROXY_CWL_SCHEMA_VERSION, ok: false, skip: "missing-manifest" };
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const paths = manifest.paths ?? [];
  const lines = [
    "# WISP API upstream proxy contract — Phase 12",
    "# Runnable via wisp-cwl-chimera-gateway (hub-cwl:upstream-proxy until runtime-cwl native proxy).",
    "module wisp_api;",
    "",
  ];
  for (const entry of paths) {
    const slug = entry.id.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const methods = entry.methods ?? ["GET", "POST", "PUT", "PATCH", "DELETE"];
    for (const method of methods) {
      const handler = `wisp_api_${slug}_${method.toLowerCase()}`;
      lines.push(`@route ${method} "${entry.path}"`);
      lines.push(`handler ${handler} {`);
      lines.push("  effects: upstream backend;");
      lines.push(`  upstream-path "${entry.path}";`);
      lines.push("  hole hub-cwl:upstream-proxy;");
      lines.push("}", "");
    }
  }
  lines.push(`@route ANY "/api/*"`);
  lines.push(`handler wisp_api_catchall {`);
  lines.push("  effects: upstream backend;");
  lines.push('  upstream-path "/api";');
  lines.push("  hole hub-cwl:upstream-proxy;");
  lines.push("}", "");

  const text = lines.join("\n");
  writeFileSync(outPath, text, "utf8");
  return {
    kind: WISP_API_PROXY_CWL_KIND,
    schemaVersion: WISP_API_PROXY_CWL_SCHEMA_VERSION,
    ok: true,
    pathCount: paths.length,
    routeEntries: paths.reduce((n, p) => n + (p.methods?.length ?? 1), 0) + 1,
    outPath,
    manifestPath,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  let manifest = defaultManifest;
  let out = defaultOut;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--manifest" && process.argv[i + 1]) manifest = process.argv[++i];
    else if (process.argv[i] === "--out" && process.argv[i + 1]) out = process.argv[++i];
  }
  const report = generateWispApiProxyCwl({ manifest, out });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-generate-api-proxy-cwl")) main();
