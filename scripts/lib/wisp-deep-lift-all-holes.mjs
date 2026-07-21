#!/usr/bin/env node
/**
 * Deep-lift / force-settle ALL markup holes in hub-wisp-management routes.cwl.
 *
 * **D6447 / D6448 — NOT a completeness claim.** Force-settle empties holes without
 * origin evidence. Use `hub:complete-conversion` for honest close-during-convert.
 * This script remains only for legacy showcase mop experiments.
 *
 *   pnpm run hub:wisp-deep-lift-all-holes
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { countWispMarkupHoles } from "../wisp-hole-metrics-lib.mjs";
import { unescapeCwlHtmlLiteral } from "./unescape-cwl-html.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const routesPath = join(fixtureDir, "routes.cwl");

function unescapeCwlHtml(s) {
  return unescapeCwlHtmlLiteral(s.startsWith('"') ? s : `"${s}"`);
}

export async function deepLiftAllHoles(opts = {}) {
  const cwlPath = resolve(opts.routesPath ?? routesPath);
  const startedAt = new Date().toISOString();
  if (!existsSync(cwlPath)) {
    return { ok: false, skip: "missing-routes", cwlPath };
  }

  const ingest = await import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  const emitShared = await import(
    pathToFileURL(join(scriptRoot, "packages/emit-shared/dist/index.js")).href,
  );
  const hydrate = ingest.hydrateStructuralHtmlFromApiBody || ingest.hydrateDemoHtmlFromApiBody;
  if (typeof hydrate !== "function") {
    return { ok: false, error: "missing hydrateStructuralHtmlFromApiBody — rebuild ingest" };
  }

  const before = countWispMarkupHoles(readFileSync(cwlPath, "utf8"));
  const tracesDir = join(fixtureDir, "wisp-api-pilot-traces");
  const enriched = join(tracesDir, "enriched");
  const hydrateSamplesDir = join(fixtureDir, "hydrate-samples");

  // Pass 1 — bind with forceSettle (uses traces + samples when present)
  const bind = ingest.bindSiteProjectLoadFromTraces({
    tracesDir: existsSync(enriched) ? enriched : tracesDir,
    fallbackTracesDir: existsSync(enriched) ? tracesDir : undefined,
    cwlPaths: [cwlPath],
    seedApiPaths: true,
    forceSettleResidualHoles: true,
    ...(existsSync(hydrateSamplesDir) ? { hydrateSamplesDir } : {}),
  });

  let text = readFileSync(cwlPath, "utf8");
  const mid = countWispMarkupHoles(text);

  // Pass 2 — mop up every remaining page HTML with forceSettle
  const showcaseBools = ingest.DEFAULT_SHOWCASE_LOAD_BOOLS || {};
  const showcaseConst = ingest.DEFAULT_SHOWCASE_HYDRATE_CONSTANTS || {};
  /** @type {string[]} */
  const mopped = [];
  const paths = emitShared.listCwlPageGetPaths(text);
  for (const httpPath of paths) {
    const block = emitShared.extractCwlRouteBlock(text, httpPath);
    if (!block || !block.includes("data-cwl-hole=")) continue;
    const htmlMatch = /return\s+html\s+"((?:\\.|[^"\\])*)"/s.exec(block);
    if (!htmlMatch?.[1]) continue;
    const raw = unescapeCwlHtml(htmlMatch[1]);
    if (!raw.includes("data-cwl-hole=")) continue;

    const loadScalars =
      typeof ingest.parseCwlLoadScalars === "function" ? ingest.parseCwlLoadScalars(block) : {};
    const body = { ...showcaseConst, ...showcaseBools, ...loadScalars };
    if (typeof ingest.mergeShowcaseHydrateBody === "function") {
      try {
        const apiPath =
          typeof ingest.resolveRouteApiPath === "function"
            ? ingest.resolveRouteApiPath(block)
            : null;
        const merged = ingest.mergeShowcaseHydrateBody(apiPath || httpPath, body, hydrateSamplesDir);
        if (merged && typeof merged === "object") Object.assign(body, merged);
      } catch {
        /* ignore */
      }
    }

    let out = hydrate(raw, body, { forceSettle: true });
    if (out.includes("data-cwl-hole=")) out = hydrate(out, body, { forceSettle: true });
    if (out.includes("data-cwl-hole=")) out = hydrate(out, {}, { forceSettle: true });

    const patch = emitShared.patchCwlRouteBlockHtml(block, out);
    if (patch && patch !== block) {
      const idx = text.indexOf(block);
      if (idx >= 0) {
        text = text.slice(0, idx) + patch + text.slice(idx + block.length);
        mopped.push(httpPath);
      }
    }
  }

  writeFileSync(cwlPath, text, "utf8");
  const after = countWispMarkupHoles(text);

  const report = {
    kind: "chrysalis.wisp.deep-lift-all-holes",
    schemaVersion: 1,
    ok: after.total === 0,
    startedAt,
    finishedAt: new Date().toISOString(),
    cwlPath,
    before,
    mid,
    after,
    bind: {
      ok: bind.ok,
      tracesIndexed: bind.tracesIndexed,
      boundOk: (bind.routes ?? []).filter((r) => r.skip === null).length,
      routeCount: bind.routes?.length ?? 0,
    },
    mopped,
    remainingReasons: after.reasons,
  };
  const reportPath = join(scriptRoot, "reports/wisp/deep-lift-all-holes.json");
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  report.reportPath = reportPath;
  return report;
}

async function main() {
  const r = await deepLiftAllHoles();
  console.log(JSON.stringify(r, null, 2));
  if (r.ok !== true) process.exit(1);
}

if (process.argv[1]?.includes("wisp-deep-lift-all-holes")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
