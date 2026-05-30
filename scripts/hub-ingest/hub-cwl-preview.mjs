#!/usr/bin/env node
/**
 * CWL migration contract preview via @chrysalis/runtime-cwl (G156).
 *
 * Resolves multi-file CWL (RFC-0009), lists routes, and optionally probes
 * the first GET route through the in-process CWL runtime simulator.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCwlModuleFromPath } from "./cwl-module-graph.mjs";

export const HUB_CWL_PREVIEW_KIND = "chrysalis.hub.cwl-preview";
export const HUB_CWL_PREVIEW_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {string} projectDir
 * @param {{ cwlPath?: string, probe?: boolean, repoRoot?: string }} [opts]
 */
export async function buildCwlPreviewReport(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const cwlPath = resolve(opts.cwlPath ?? join(root, ".chrysalis", "migration.cwl"));
  if (!existsSync(cwlPath)) {
    return {
      kind: HUB_CWL_PREVIEW_KIND,
      schemaVersion: HUB_CWL_PREVIEW_SCHEMA_VERSION,
      ok: false,
      error: "missing-cwl",
      cwlPath,
    };
  }

  const parsed = resolveCwlModuleFromPath(cwlPath);
  const routes = (parsed.routes ?? []).map((r) => ({
    method: r.method,
    path: r.path,
    handler: r.name,
    hole: r.body?.kind === "hole",
    holeReason: r.body?.kind === "hole" ? String(r.body.reason ?? "hole") : null,
  }));

  /** @type {Record<string, unknown> | null} */
  let probe = null;
  if (opts.probe !== false) {
    try {
      const repoRoot = opts.repoRoot ?? scriptRoot;
      const { createCwlRuntime, loadModuleFromCwlFile } = await import("@chrysalis/runtime-cwl");
      const module = loadModuleFromCwlFile(cwlPath, repoRoot);
      const runtime = createCwlRuntime({ module });
      const first = routes.find((r) => r.method === "GET" && !r.hole);
      if (first) {
        const res = await runtime.fetch({ method: "GET", url: `http://127.0.0.1${first.path}` });
        const body = await res.text();
        probe = {
          route: `${first.method} ${first.path}`,
          status: res.status,
          bodyPreview: body.length > 240 ? `${body.slice(0, 240)}…` : body,
        };
      } else {
        probe = { skipped: "no-get-route" };
      }
    } catch (e) {
      probe = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return {
    kind: HUB_CWL_PREVIEW_KIND,
    schemaVersion: HUB_CWL_PREVIEW_SCHEMA_VERSION,
    ok: true,
    cwlPath,
    moduleName: parsed.moduleName,
    imports: parsed.imports ?? [],
    routeCount: routes.length,
    holeCount: routes.filter((r) => r.hole).length,
    routes,
    probe,
    runtime: "@chrysalis/runtime-cwl",
  };
}

async function main() {
  const projectDir = process.argv[2];
  if (!projectDir) {
    console.error("usage: hub-cwl-preview.mjs <projectDir> [--no-probe]");
    process.exit(1);
  }
  const probe = !process.argv.includes("--no-probe");
  const report = await buildCwlPreviewReport(projectDir, { probe });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.ok ? 0 : 1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
