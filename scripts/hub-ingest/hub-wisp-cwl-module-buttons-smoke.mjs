#!/usr/bin/env node
/**
 * G9950 — Module_Manager button chrome converted into working CWL actions
 * (plan/deploy toolbars + structural demo secondary actions).
 *
 * Run: pnpm run hub:wisp-cwl-module-buttons-smoke
 * Skip live: CHRYSALIS_SKIP_LIVE=1
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_CWL_MODULE_BUTTONS_SMOKE_KIND = "chrysalis.wisp.cwl-module-buttons-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_BASE = "http://34.61.255.147:19100";

/** CWL route HTML stores attributes as data-action=\"…\"; live HTML may be unescaped. */
function hasAttr(haystack, attr, value) {
  const esc = `${attr}=\\"${value}\\"`;
  const raw = `${attr}="${value}"`;
  return haystack.includes(esc) || haystack.includes(raw);
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  return { status: res.status, text: await res.text() };
}

function loadPlansGolden(fixture) {
  for (const rel of [
    "wisp-api-goldens/GET-api-plans.golden.json",
    "api-goldens/GET-api-plans.golden.json",
  ]) {
    const p = join(fixture, rel);
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  }
  return null;
}

export async function runWispCwlModuleButtonsSmoke(opts = {}) {
  const fixture = join(ROOT, "fixtures/hub-wisp-management");
  const routes = existsSync(join(fixture, "routes.cwl"))
    ? readFileSync(join(fixture, "routes.cwl"), "utf8")
    : "";
  const mods = existsSync(join(fixture, "wisp-cwl-modules.js"))
    ? readFileSync(join(fixture, "wisp-cwl-modules.js"), "utf8")
    : "";
  const client = existsSync(join(fixture, "wisp-cwl-client.js"))
    ? readFileSync(join(fixture, "wisp-cwl-client.js"), "utf8")
    : "";
  const plans = loadPlansGolden(fixture);

  const planHtmlOk =
    hasAttr(routes, "data-wisp-page", "plan") &&
    routes.includes("module-control-btn") &&
    (routes.includes("data-cwl-action") || routes.includes("data-cwl-toggle")) &&
    !routes.includes('data-cwl-hole=');

  const deployHtmlOk =
    hasAttr(routes, "data-wisp-page", "deploy") &&
    routes.includes("module-control-btn") &&
    routes.includes("data-cwl-action") &&
    !routes.includes('data-cwl-hole=');

  const modulesJsOk =
    mods.includes("discoverMarketingLeads") &&
    mods.includes('action === "deploy-plan"') &&
    mods.includes('action === "create-project"') &&
    mods.includes("openHardwarePanel") &&
    mods.includes("postToMapBoth") &&
    mods.includes("setActivePlan");

  const clientOk =
    client.includes("function routeCwlAction") &&
    client.includes("applyClientFilters") &&
    client.includes("genericOverlaySave") &&
    client.includes("Final delegated strategy");

  const demosOk =
    routes.includes("data-cwl-action") &&
    routes.includes("data-cwl-nav") &&
    (routes.includes('href="/modules/inventory/bundles"') ||
      routes.includes('href=\\"/modules/inventory/bundles\\"'));

  const plansOk =
    Array.isArray(plans?.plans) &&
    plans.plans.some((p) => p.status === "draft") &&
    plans.plans.some((p) => p.status === "approved") &&
    plans.plans.some((p) => p.lat != null);

  let live = { skipped: true };
  if (
    process.env.CHRYSALIS_SKIP_LIVE !== "1" &&
    (opts.baseUrl || process.env.CHRYSALIS_WISP_DEMO_URL)
  ) {
    const base = (opts.baseUrl || process.env.CHRYSALIS_WISP_DEMO_URL || DEFAULT_BASE).replace(
      /\/$/,
      "",
    );
    const planPage = await fetchText(`${base}/modules/plan`);
    const deployPage = await fetchText(`${base}/modules/deploy`);
    const hardware = await fetchText(`${base}/modules/hardware`);
    const modsAsset = await fetchText(`${base}/assets/wisp-cwl-modules.js`);
    const plansApi = await fetchText(`${base}/api/plans`);
    live = {
      skipped: false,
      base,
      ok:
        planPage.status === 200 &&
        deployPage.status === 200 &&
        hardware.status === 200 &&
        (planPage.text.includes("data-cwl-action") ||
          planPage.text.includes("data-cwl-toggle")) &&
        deployPage.text.includes("data-cwl-action") &&
        modsAsset.status === 200 &&
        plansApi.status === 200,
    };
  }

  const ok =
    planHtmlOk &&
    deployHtmlOk &&
    modulesJsOk &&
    clientOk &&
    demosOk &&
    plansOk &&
    (live.skipped || live.ok === true);

  return {
    kind: WISP_CWL_MODULE_BUTTONS_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    planHtmlOk,
    deployHtmlOk,
    modulesJsOk,
    clientOk,
    demosOk,
    plansOk,
    live,
    note:
      "Module_Manager button chrome converted: plan/deploy toolbars + structural search/export/scan; marketing uses spatial filter over API geometry",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlModuleButtonsSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-module-buttons-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
