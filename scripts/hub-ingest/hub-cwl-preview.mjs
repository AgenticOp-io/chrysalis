#!/usr/bin/env node
/**
 * CWL migration contract preview via @chrysalis/runtime-cwl (G156).
 *
 * Resolves multi-file CWL (RFC-0009), lists routes, and optionally probes
 * the first GET route through the in-process CWL runtime simulator.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveCwlModuleFromPath } from "./cwl-module-graph.mjs";
import { readFullstackHoleBudget } from "./hub-cwl-fullstack-hole-budget.mjs";

export const HUB_CWL_PREVIEW_KIND = "chrysalis.hub.cwl-preview";
export const HUB_CWL_PREVIEW_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {string} [repoRoot]
 */
async function loadCwlRuntimeModule(repoRoot = scriptRoot) {
  try {
    return await import("@chrysalis/runtime-cwl");
  } catch {
    const dist = join(repoRoot, "packages/runtime-cwl/dist/index.js");
    if (!existsSync(dist)) {
      throw new Error("missing @chrysalis/runtime-cwl build (run pnpm --filter @chrysalis/runtime-cwl build)");
    }
    return import(pathToFileURL(dist).href);
  }
}

/**
 * @param {string} projectDir
 * @param {{ cwlPath?: string, probe?: boolean, repoRoot?: string, bootstrap?: boolean }} [opts]
 */
export async function buildCwlPreviewReport(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const cwlPath = resolve(opts.cwlPath ?? join(root, ".chrysalis", "migration.cwl"));
  let bootstrapped = false;
  if (opts.bootstrap && !existsSync(cwlPath)) {
    await mkdir(dirname(cwlPath), { recursive: true });
    await writeFile(cwlPath, `${starterCwlModule(root)}\n`, "utf8");
    const budgetRead = await readFullstackHoleBudget(join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack"));
    if (budgetRead.ok) {
      await writeFile(
        join(root, "chrysalis.fullstack-hole-budget.json"),
        `${JSON.stringify({ ...budgetRead.budget, fixture: undefined }, null, 2)}\n`,
        "utf8",
      );
    }
    bootstrapped = true;
  }
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
    surfaceKind: r.surfaceKind ?? "api",
    hole: r.body?.kind === "hole",
    holeReason: r.body?.kind === "hole" ? String(r.body.reason ?? "hole") : null,
  }));

  /** @type {Record<string, unknown> | null} */
  let probe = null;
  if (opts.probe !== false) {
    try {
      const repoRoot = opts.repoRoot ?? scriptRoot;
      const { createCwlRuntime, loadModuleFromCwlFile } = await loadCwlRuntimeModule(repoRoot);
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
    bootstrapped,
  };
}

/**
 * @param {string} projectDir
 * @param {{ cwlPath?: string, probe?: boolean, repoRoot?: string }} [opts]
 */
export async function writeCwlPreviewArtifacts(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const report = await buildCwlPreviewReport(root, opts);
  const outDir = join(root, ".chrysalis");
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "cwl-preview.json");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { jsonPath, report };
}

async function main() {
  const projectDir = process.argv[2];
  if (!projectDir) {
    console.error("usage: hub-cwl-preview.mjs <projectDir> [--no-probe] [--bootstrap]");
    process.exit(1);
  }
  const probe = !process.argv.includes("--no-probe");
  const bootstrap = process.argv.includes("--bootstrap");
  const report = await buildCwlPreviewReport(projectDir, { probe, bootstrap });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.ok ? 0 : 1);
}

/**
 * @param {string} projectDir
 */
function starterCwlModule(projectDir) {
  const moduleName = sanitizeModuleName(projectDir);
  return [
    "# CWL full-stack flagship template (G1165)",
    `module ${moduleName};`,
    "",
    'import "layouts/shell.cwl";',
    "",
    '@page GET "/"',
    "page home {",
    "  effects: none;",
    '  return html "<!doctype html><html><body><h1>Chrysalis full-stack</h1></body></html>";',
    "}",
    "",
    '@page GET "/docs/:slug"',
    "page doc_show {",
    "  effects: none;",
    "  param slug;",
    '  return html "<html><body><h1>Doc</h1><p>slug: slug</p></body></html>";',
    "}",
    "",
    '@route GET "/api/health"',
    "handler health {",
    "  effects: none;",
    "  return { ok: true, pilot: \"fullstack\" };",
    "}",
    "",
    '@route GET "/api/docs/:slug"',
    "handler doc_api {",
    "  effects: none;",
    "  param slug;",
    "  return { ok: true, slug: slug };",
    "}",
    "",
    '@route POST "/api/notify"',
    "handler notify {",
    "  effects: none;",
    "  return { ok: true, channel: \"flagship\" };",
    "}",
  ].join("\n");
}

/**
 * @param {string} input
 */
function sanitizeModuleName(input) {
  const base = input.split(/[\\/]/).filter(Boolean).pop() ?? "app";
  const normalized = base.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z_]/.test(normalized) ? normalized : `app_${normalized || "module"}`;
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
