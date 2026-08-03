#!/usr/bin/env node
/**
 * G9480 / D6369 — WISP whole-site finish smoke (showcase lab on product APIs).
 *
 * CSS lift → structural-shell convert → no-source holes → load-bind → runtime
 * document shell + CSS + intact hole HTML (hyphen/mid-token guard).
 *
 * Requires CHRYSALIS_WISP_ROOT (default: sibling WISPTools/Module_Manager).
 * Skips cleanly when the WISP tree is absent.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runCwlHtmlTemplateHyphenGuardGate } from "./hub-cwl-html-template-hyphen-smoke.mjs";
import { resolveWispModuleRoot } from "../lib/wisp-origin-paths.mjs";

export const WISP_WHOLE_SITE_FINISH_KIND = "chrysalis.hub.wisp-whole-site-finish";
export const WISP_WHOLE_SITE_FINISH_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runWispWholeSiteFinishSmoke(opts = {}) {
  const root = resolve(opts.repoRoot ?? scriptRoot);
  const wisp = resolve(
    opts.wispRoot ?? resolveWispModuleRoot(process.env.CHRYSALIS_WISP_ROOT),
  );
  const fixture = join(root, "fixtures/hub-wisp-management");
  const fixtureCwl = join(fixture, "routes.cwl");
  const tracesDir = join(fixture, "wisp-api-pilot-traces");

  const hyphen = runCwlHtmlTemplateHyphenGuardGate();
  if (!hyphen.ok) {
    return {
      kind: WISP_WHOLE_SITE_FINISH_KIND,
      schemaVersion: WISP_WHOLE_SITE_FINISH_SCHEMA_VERSION,
      ok: false,
      skip: null,
      hyphen,
    };
  }

  if (!existsSync(join(wisp, "src", "routes")) && !existsSync(join(wisp, "package.json"))) {
    return {
      kind: WISP_WHOLE_SITE_FINISH_KIND,
      schemaVersion: WISP_WHOLE_SITE_FINISH_SCHEMA_VERSION,
      ok: true,
      skip: "wisp-root-missing",
      hyphen,
      wispRoot: wisp,
    };
  }
  if (!existsSync(fixtureCwl) || !existsSync(tracesDir)) {
    return {
      kind: WISP_WHOLE_SITE_FINISH_KIND,
      schemaVersion: WISP_WHOLE_SITE_FINISH_SCHEMA_VERSION,
      ok: false,
      skip: "fixture-missing",
      hyphen,
    };
  }

  const ingest = await import(pathToFileURL(join(root, "packages/ingest/dist/index.js")).href);
  const emitShared = await import(pathToFileURL(join(root, "packages/emit-shared/dist/index.js")).href);
  const runtime = await import(pathToFileURL(join(root, "packages/runtime-cwl/dist/index.js")).href);

  const cssLift = ingest.liftProjectUiAssets({ projectDir: wisp });
  if (!cssLift.ok || "skip" in cssLift) {
    return {
      kind: WISP_WHOLE_SITE_FINISH_KIND,
      schemaVersion: WISP_WHOLE_SITE_FINISH_SCHEMA_VERSION,
      ok: false,
      skip: "css-lift-failed",
      cssLift,
      hyphen,
    };
  }

  const fixtureUiAssets = join(fixture, ".chrysalis", "ui-assets");
  mkdirSync(fixtureUiAssets, { recursive: true });
  cpSync(join(wisp, ".chrysalis", "ui-assets"), fixtureUiAssets, { recursive: true });
  cpSync(
    join(fixtureUiAssets, "ui-route-style-map.json"),
    join(fixture, "wisp-cwl-original-css-map.json"),
  );
  if (existsSync(join(fixtureUiAssets, "original-css"))) {
    const destCss = join(fixture, "original-css");
    mkdirSync(destCss, { recursive: true });
    cpSync(join(fixtureUiAssets, "original-css"), destCss, { recursive: true });
  }

  const genCwl = join(wisp, "generated", "cwl", "routes.cwl");
  mkdirSync(dirname(genCwl), { recursive: true });
  cpSync(fixtureCwl, genCwl);

  const { wispPackageUiLiftSkipPaths } = await import(
    pathToFileURL(join(root, "scripts/wisp-cwl-package-ui-lift.mjs")).href
  );
  const { applyWispClientRedirects } = await import(
    pathToFileURL(join(root, "scripts/wisp-cwl-apply-client-redirects.mjs")).href
  );
  const skipHttpPaths = [...wispPackageUiLiftSkipPaths()];

  const convert = ingest.convertSiteProjectUi({
    projectDir: wisp,
    cwlPaths: [genCwl, fixtureCwl],
    markupMode: "structural-shell",
    writeReport: true,
    tracesDir: undefined,
    skipHttpPaths,
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
  cwlText = holes.text;
  writeFileSync(fixtureCwl, cwlText, "utf8");
  cpSync(fixtureCwl, genCwl);

  const bind = ingest.bindSiteProjectLoadFromTraces({
    tracesDir,
    cwlPaths: [fixtureCwl, genCwl],
    seedApiPaths: true,
    forceSettleResidualHoles: true,
  });

  // Client redirects last — bind/force-settle can leave dead-end spinner shells (G9830).
  const redirects = applyWispClientRedirects();
  if (redirects.ok !== true) {
    return {
      kind: WISP_WHOLE_SITE_FINISH_KIND,
      schemaVersion: WISP_WHOLE_SITE_FINISH_SCHEMA_VERSION,
      ok: false,
      skip: "client-redirects-failed",
      redirects,
      hyphen,
    };
  }
  cpSync(fixtureCwl, genCwl);
  cwlText = readFileSync(fixtureCwl, "utf8");
  const demoLeft = (cwlText.match(/wisp-module-demo/g) ?? []).length;
  const noSourceHoles = (cwlText.match(/legacy:markup-no-source-route/g) ?? []).length;
  const formShells = (cwlText.match(/data-cwl-form-shell/g) ?? []).length;
  const traced = (cwlText.match(/tracedApiStatus/g) ?? []).length;
  const apiPaths = (cwlText.match(/apiPath:/g) ?? []).length;
  const boundOk = bind.routes.filter((r) => r.skip === null).length;
  const noTrace = bind.routes.filter((r) => r.skip === "no-trace").length;
  const noApi = bind.routes.filter((r) => r.skip === "no-api-path").length;

  const uiAssets = runtime.loadCwlUiAssetsFromProject(fixture);
  const rt = runtime.createCwlRuntime({
    module: runtime.loadModuleFromCwlFile(fixtureCwl, root),
    ...(uiAssets ? { uiAssets } : {}),
  });
  const login = await rt.fetch({ method: "GET", url: "http://127.0.0.1/login" });
  const loginBody = await login.text();
  const css = await rt.fetch({
    method: "GET",
    url: "http://127.0.0.1/assets/original-css/login.css",
  });
  const hardwareAdd = await rt.fetch({
    method: "GET",
    url: "http://127.0.0.1/modules/hardware/add",
  });
  const hardwareAddBody = await hardwareAdd.text();

  const hardwareAddHasShell =
    (hardwareAddBody.includes("legacy:markup-no-source-route") ||
      hardwareAddBody.includes("data-cwl-form-shell")) &&
    hardwareAddBody.includes("data-cwl-route=");
  const noCorruptedHole =
    !hardwareAddBody.includes("markup-no-markup-no-source") &&
    !hardwareAddBody.includes("data-cwl-data-cwl-");

  const summary = {
    kind: WISP_WHOLE_SITE_FINISH_KIND,
    schemaVersion: WISP_WHOLE_SITE_FINISH_SCHEMA_VERSION,
    ok:
      convert.ok === true &&
      bind.ok === true &&
      demoLeft === 0 &&
      (noSourceHoles >= 30 || formShells >= 30) &&
      login.status === 200 &&
      loginBody.includes("stylesheet") &&
      css.status === 200 &&
      hardwareAddHasShell &&
      noCorruptedHole &&
      uiAssets !== null &&
      hyphen.ok === true,
    skip: null,
    hyphen,
    cssBundles: cssLift.bundles.length,
    convertPatches: convert.cwlPatches,
    holesRewritten: holes.routesRewritten,
    demoLeft,
    noSourceHoles,
    formShells,
    bind: {
      ok: bind.ok,
      tracesIndexed: bind.tracesIndexed,
      boundOk,
      noTrace,
      noApi,
      apiPathsInCwl: apiPaths,
      tracedApiStatusMentions: traced,
    },
    runtime: {
      loginStatus: login.status,
      loginHasShell: loginBody.includes("<!DOCTYPE html>"),
      loginHasCssLink: loginBody.includes("/assets/original-css/login.css"),
      cssStatus: css.status,
      hardwareAddHasShell,
      noCorruptedHole,
    },
  };
  return summary;
}

async function main() {
  const summary = await runWispWholeSiteFinishSmoke();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-whole-site-finish-smoke")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
