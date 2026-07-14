#!/usr/bin/env node
/**
 * G9928 — Next RSC hole + shared interp hydrate (deeper than client-only login).
 *
 * Run: pnpm run hub:next-rsc-depth-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const NEXT_RSC_DEPTH_SMOKE_KIND = "chrysalis.hub.next-rsc-depth-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runNextRscDepthSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-next");
  if (!existsSync(fixture)) {
    return { kind: NEXT_RSC_DEPTH_SMOKE_KIND, schemaVersion: 1, ok: false, skip: "missing-next-fixture" };
  }

  const ingest = await loadIngest();
  const convert = ingest.convertSiteProjectUi({
    projectDir: fixture,
    liftOnly: true,
    writeReport: false,
    markupMode: "structural-shell",
  });
  const markup = convert.uiMarkup;
  const bundles =
    markup && "bundles" in markup && Array.isArray(markup.bundles) ? markup.bundles : [];
  const dash = bundles.find((b) => b.routeId === "/dashboard");
  const holes = dash?.holes ?? [];
  const reasons = new Set(holes.map((h) => h.reason));
  const rscOk =
    dash?.liftMode === "structural-shell" &&
    reasons.has("legacy:markup-lift-next-rsc") &&
    reasons.has("legacy:markup-lift-next-interp");

  const html = dash?.html ?? "";
  const hydrated = ingest.hydrateStructuralHtmlFromApiBody(html, { title: "Next Dashboard" });
  const hydrateOk =
    hydrated.includes("Next Dashboard") && !hydrated.includes("legacy:markup-lift-next-interp");

  const unit = ingest.liftStructuralNextPageJsx(`
export default async function P() {
  return (<main><h1>{heading}</h1></main>);
}
`);
  const unitOk =
    unit !== null &&
    unit.holes.some((h) => h.reason === "legacy:markup-lift-next-rsc") &&
    unit.holes.some((h) => h.reason === "legacy:markup-lift-next-interp");

  const ok = convert.ok === true && rscOk && hydrateOk && unitOk;

  return {
    kind: NEXT_RSC_DEPTH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    rscOk,
    hydrateOk,
    unitOk,
    holeReasons: [...reasons].sort(),
    note: "Next async RSC is a named hole; interp hydrates on shared load-bind",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runNextRscDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-next-rsc-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
