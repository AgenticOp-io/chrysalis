#!/usr/bin/env node
/**
 * Generate CWL api-proxy module from wisp-api-paths.json (Phase 12 Phase 0 / Phase 27b native).
 * Usage: node scripts/wisp-cwl-generate-api-proxy-cwl.mjs [--manifest path] [--out path] [--mode proxy|native]
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
 * @param {"proxy"|"native"} [opts.mode]
 */
export function generateWispApiProxyCwl(opts = {}) {
  const manifestPath = resolve(opts.manifest ?? defaultManifest);
  const outPath = resolve(opts.out ?? defaultOut);
  const mode = opts.mode === "native" ? "native" : "proxy";
  if (!existsSync(manifestPath)) {
    return { kind: WISP_API_PROXY_CWL_KIND, schemaVersion: WISP_API_PROXY_CWL_SCHEMA_VERSION, ok: false, skip: "missing-manifest" };
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const paths = manifest.paths ?? [];
  const lines =
    mode === "native"
      ? [
          "# WISP API native handlers — Phase 27b (lifted from backend-services contract)",
          "# MongoDB remains infra; handler bodies are CWL-native with db/session effects.",
          "module wisp_api;",
          "",
        ]
      : [
          "# WISP API upstream proxy contract — Phase 12",
          "# Runnable via wisp-cwl-chimera-gateway (hub-cwl:upstream-proxy until runtime-cwl native proxy).",
          "module wisp_api;",
          "",
        ];
  for (const entry of paths) {
    const slug = entry.id.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const resource = slug.replace(/_/g, "-");
    const methods = entry.methods ?? ["GET", "POST", "PUT", "PATCH", "DELETE"];
    const backendSource = `backend-services/routes/${slug.replace(/_/g, "-")}`;
    for (const method of methods) {
      const handler = `wisp_api_${slug}_${method.toLowerCase()}`;
      lines.push(`@route ${method} "${entry.path}"`);
      lines.push(`handler ${handler} {`);
      if (mode === "native") {
        lines.push(`  # source ${backendSource}`);
        lines.push("  effects: db, session;");
        lines.push("  use auth bearer;");
        const op =
          method === "GET"
            ? "list"
            : method === "POST"
              ? "create"
              : method === "PUT" || method === "PATCH"
                ? "update"
                : method === "DELETE"
                  ? "delete"
                  : "invoke";
        lines.push(`  return { ok: true, surface: "wisp-api-native", resource: "${resource}", op: "${op.toLowerCase()}" };`);
      } else {
        lines.push("  effects: upstream backend;");
        lines.push(`  upstream-path "${entry.path}";`);
        lines.push("  hole hub-cwl:upstream-proxy;");
      }
      lines.push("}", "");
    }
  }
  lines.push(`@route ANY "/api/*"`);
  lines.push(`handler wisp_api_catchall {`);
  if (mode === "native") {
    lines.push("  effects: none;");
    lines.push('  status 404;');
    lines.push('  return { ok: false, error: "not_found", surface: "wisp-api-native" };');
  } else {
    lines.push("  effects: upstream backend;");
    lines.push('  upstream-path "/api";');
    lines.push("  hole hub-cwl:upstream-proxy;");
  }
  lines.push("}", "");

  const text = lines.join("\n");
  writeFileSync(outPath, text, "utf8");
  return {
    kind: WISP_API_PROXY_CWL_KIND,
    schemaVersion: WISP_API_PROXY_CWL_SCHEMA_VERSION,
    ok: true,
    mode,
    pathCount: paths.length,
    routeEntries: paths.reduce((n, p) => n + (p.methods?.length ?? 1), 0) + 1,
    outPath,
    manifestPath,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let manifest = defaultManifest;
  let out = defaultOut;
  let mode = "proxy";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--manifest" && argv[i + 1]) manifest = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
    else if (argv[i] === "--mode" && argv[i + 1]) mode = argv[++i];
    else if (argv[i] === "--native") mode = "native";
  }
  return { manifest, out, mode };
}

function main() {
  const args = parseArgs(process.argv);
  const report = generateWispApiProxyCwl({ manifest: args.manifest, out: args.out, mode: args.mode });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-generate-api-proxy-cwl")) main();
