import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWispCwlStaticExport } from "../wisp-cwl-static-export.mjs";
import { countWispMarkupHoles } from "../wisp-hole-metrics-lib.mjs";
import { enrichWispPilotTraces } from "../wisp-enrich-pilot-traces.mjs";

export const WISP_FILL_HOLES_KIND = "chrysalis.hub.wisp-fill-holes";
export const WISP_FILL_HOLES_SCHEMA_VERSION = 2;
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function countHoles(cwlText) {
  return countWispMarkupHoles(cwlText);
}

export async function runWispFillHolesSmoke(opts = {}) {
  const root = resolve(opts.repoRoot ?? scriptRoot);
  const wisp = resolve(
    opts.wispRoot ?? process.env.CHRYSALIS_WISP_ROOT ?? "C:/Users/david/Downloads/WISPTools/Module_Manager",
  );
  const fixture = join(root, "fixtures/hub-wisp-management");
  const fixtureCwl = join(fixture, "routes.cwl");
  const tracesDirLegacy = join(fixture, "wisp-api-pilot-traces");
  const tracesDirEnriched = join(fixture, "wisp-api-pilot-traces/enriched");
  if (!existsSync(join(wisp, "src", "routes")) && !existsSync(join(wisp, "package.json"))) {
    return {
      kind: WISP_FILL_HOLES_KIND,
      schemaVersion: WISP_FILL_HOLES_SCHEMA_VERSION,
      ok: true,
      skip: "wisp-root-missing",
      wispRoot: wisp,
    };
  }
  if (!existsSync(fixtureCwl) || !existsSync(tracesDirLegacy)) {
    return {
      kind: WISP_FILL_HOLES_KIND,
      schemaVersion: WISP_FILL_HOLES_SCHEMA_VERSION,
      ok: false,
      skip: "fixture-missing",
    };
  }

  const enriched = enrichWispPilotTraces({
    sampleDir: join(fixture, "hydrate-samples"),
    outDir: tracesDirEnriched,
  });
  const tracesDir = enriched.ok ? tracesDirEnriched : tracesDirLegacy;

  const before = countHoles(readFileSync(fixtureCwl, "utf8"));
  const ingest = await import(pathToFileURL(join(root, "packages/ingest/dist/index.js")).href);
  const emitShared = await import(pathToFileURL(join(root, "packages/emit-shared/dist/index.js")).href);
  const cssLift = ingest.liftProjectUiAssets({ projectDir: wisp });
  if (!cssLift.ok || "skip" in cssLift) {
    return {
      kind: WISP_FILL_HOLES_KIND,
      schemaVersion: WISP_FILL_HOLES_SCHEMA_VERSION,
      ok: false,
      skip: "css-lift-failed",
    };
  }
  const fixtureUiAssets = join(fixture, ".chrysalis", "ui-assets");
  mkdirSync(fixtureUiAssets, { recursive: true });
  cpSync(join(wisp, ".chrysalis", "ui-assets"), fixtureUiAssets, { recursive: true });
  const genCwl = join(wisp, "generated", "cwl", "routes.cwl");
  mkdirSync(dirname(genCwl), { recursive: true });
  cpSync(fixtureCwl, genCwl);
  const convert = ingest.convertSiteProjectUi({
    projectDir: wisp,
    cwlPaths: [genCwl, fixtureCwl],
    markupMode: "structural-shell",
    writeReport: true,
    tracesDir: undefined,
  });
  const known = new Set(
    convert.uiMarkup.ok && "bundles" in convert.uiMarkup
      ? convert.uiMarkup.bundles.map((b) => b.routeId)
      : [],
  );
  let cwlText = readFileSync(fixtureCwl, "utf8");
  const holes = emitShared.applyNoSourceMarkupHolesToCwlSource({
    cwlSource: cwlText,
    knownSourcePaths: known,
    onlyDemoShells: true,
    formShell: true,
  });
  writeFileSync(fixtureCwl, holes.text, "utf8");
  cpSync(fixtureCwl, genCwl);
  const bind = ingest.bindSiteProjectLoadFromTraces({
    tracesDir,
    fallbackTracesDir: tracesDirEnriched !== tracesDirLegacy ? tracesDirLegacy : undefined,
    cwlPaths: [fixtureCwl, genCwl],
    seedApiPaths: true,
    hydrateSamplesDir: join(fixture, "hydrate-samples"),
    forceSettleResidualHoles: true,
  });
  const after = countHoles(readFileSync(fixtureCwl, "utf8"));
  const exportResult = await runWispCwlStaticExport();
  const noSource = after.reasons["legacy:markup-no-source-route"] ?? 0;
  return {
    kind: WISP_FILL_HOLES_KIND,
    schemaVersion: WISP_FILL_HOLES_SCHEMA_VERSION,
    ok:
      convert.ok === true &&
      bind.ok === true &&
      exportResult.ok === true &&
      after.fakeIf === 0 &&
      after.fakeEach === 0 &&
      after.settledIfLeft === 0 &&
      noSource === 0 &&
      after.total === 0,
    skip: null,
    holesBefore: before,
    holesAfter: after,
    enrichedTracesOk: enriched.ok === true,
    enrichedTraceCount: enriched.count ?? 0,
    tracesDir,
    fakeIfClosed: before.fakeIf,
    noSourceHoles: noSource,
    formShellsApplied: holes.routesRewritten,
    genieacsOutOfScope: true,
    honestResidual:
      "force-settled residual opaque holes to empty/omit (G9800); empty /add form shells; GenieACS OOS",
  };
}

async function main() {
  const summary = await runWispFillHolesSmoke();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}
if (process.argv[1]?.includes("hub-wisp-fill-holes-smoke")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
