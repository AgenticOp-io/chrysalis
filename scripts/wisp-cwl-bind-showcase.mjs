#!/usr/bin/env node
/**
 * Bind showcase hydrate samples + pilot traces into fixture routes.cwl (after lifts).
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyWispClientRedirects } from "./wisp-cwl-apply-client-redirects.mjs";
import { inspectRoutesCwlIntegrity, routesPath } from "./wisp-cwl-apply-surfaces-lib.mjs";

export const WISP_BIND_SHOWCASE_KIND = "chrysalis.wisp.bind-showcase";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");

/**
 * @param {object} [opts]
 * @param {string} [opts.routesPath]
 * @param {string} [opts.tracesDir]
 * @param {string} [opts.hydrateSamplesDir]
 */
export async function bindWispShowcaseRoutes(opts = {}) {
  const cwlPath = resolve(opts.routesPath ?? routesPath);
  const tracesDir = resolve(opts.tracesDir ?? join(fixtureDir, "wisp-api-pilot-traces"));
  const hydrateSamplesDir = resolve(opts.hydrateSamplesDir ?? join(fixtureDir, "hydrate-samples"));
  const base = {
    kind: WISP_BIND_SHOWCASE_KIND,
    schemaVersion: 1,
    ok: false,
    routesPath: cwlPath,
  };
  if (!existsSync(cwlPath)) return { ...base, skip: "missing-routes-cwl" };

  const ingest = await import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  const bind = ingest.bindSiteProjectLoadFromTraces({
    tracesDir: existsSync(tracesDir) ? tracesDir : join(fixtureDir, "wisp-api-pilot-traces"),
    cwlPaths: [cwlPath],
    seedApiPaths: true,
    forceSettleResidualHoles: true,
    ...(existsSync(hydrateSamplesDir) ? { hydrateSamplesDir } : {}),
  });

  const redirects = applyWispClientRedirects();
  const integrity = inspectRoutesCwlIntegrity(undefined, cwlPath);
  const ok =
    bind.ok === true &&
    redirects.ok !== false &&
    integrity.ok === true;

  return {
    ...base,
    ok,
    bind: {
      ok: bind.ok,
      tracesIndexed: bind.tracesIndexed,
      routeCount: bind.routes?.length ?? 0,
      boundOk: (bind.routes ?? []).filter((r) => r.skip === null).length,
    },
    redirects: { ok: redirects.ok !== false, patched: redirects.patched ?? [] },
    integrity,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await bindWispShowcaseRoutes();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-bind-showcase")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
