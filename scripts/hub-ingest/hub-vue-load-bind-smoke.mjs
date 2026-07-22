#!/usr/bin/env node
/**
 * G9927 — Vue structural holes hydrate via shared load-bind (not Svelte-only).
 *
 * Run: pnpm run hub:vue-load-bind-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VUE_LOAD_BIND_SMOKE_KIND = "chrysalis.hub.vue-load-bind-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runVueLoadBindSmoke() {
  const fixture = join(ROOT, "fixtures/ui-markup-vue");
  if (!existsSync(fixture)) {
    return { kind: VUE_LOAD_BIND_SMOKE_KIND, schemaVersion: 1, ok: false, skip: "missing-vue-fixture" };
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
  const login = bundles.find((b) => b.routeId === "/login");
  const html = login?.html ?? "";

  const wrapOk =
    html.includes('data-cwl-hole="legacy:markup-lift-vue-for"') &&
    html.includes('data-cwl-hole="legacy:markup-lift-vue-interp"') &&
    (html.includes('data-cwl-hole="legacy:markup-lift-vue-if"') ||
      html.includes('data-cwl-shell-key="showHint"'));

  const body = {
    title: "Vue Sign in",
    showHint: true,
    items: [{ id: 1, label: "Alpha" }, { id: 2, label: "Beta" }],
  };
  const hydrated = ingest.hydrateStructuralHtmlFromApiBody(html, body);
  const hydrateOk =
    hydrated.includes("Vue Sign in") &&
    hydrated.includes("Enter credentials") &&
    hydrated.includes("Alpha") &&
    hydrated.includes("Beta") &&
    !hydrated.includes("legacy:markup-lift-vue-for") &&
    !hydrated.includes("legacy:markup-lift-vue-interp");

  const parsed = ingest.parseEachHeader("item in items");
  const parseOk = parsed?.collection === "items" && parsed?.itemName === "item";

  const ok = convert.ok === true && wrapOk && hydrateOk && parseOk;

  return {
    kind: VUE_LOAD_BIND_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    wrapOk,
    hydrateOk,
    parseOk,
    sharedApi: "hydrateStructuralHtmlFromApiBody",
    note: "Vue holes hydrate on the shared load-bind path — not a Svelte-only fork",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runVueLoadBindSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-vue-load-bind-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
