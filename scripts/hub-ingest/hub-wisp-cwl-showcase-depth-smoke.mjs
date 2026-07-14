#!/usr/bin/env node
/**
 * G9905–G9908 — deeper island hydrate, attr scrub, wizard/nav chrome, filter honesty.
 *
 * Run: pnpm run hub:wisp-cwl-showcase-depth-smoke
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const WISP_CWL_SHOWCASE_DEPTH_SMOKE_KIND = "chrysalis.wisp.cwl-showcase-depth-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadScrub() {
  try {
    const ingest = await import("@chrysalis/ingest");
    return ingest.scrubStructuralMarkupArtifacts;
  } catch {
    const mod = await import(
      pathToFileURL(join(ROOT, "packages/ingest/dist/ui-markup-svelte-structural.js")).href
    );
    return mod.scrubStructuralMarkupArtifacts;
  }
}

export async function runWispCwlShowcaseDepthSmoke() {
  const clientPath = join(ROOT, "fixtures/hub-wisp-management/wisp-cwl-client.js");
  const cssPath = join(ROOT, "fixtures/hub-wisp-management/wisp-cwl-app.css");
  const client = existsSync(clientPath) ? readFileSync(clientPath, "utf8") : "";
  const css = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";

  const g9905 =
    client.includes("fillStats(data, rows)") &&
    client.includes("fillList(rows)") &&
    client.includes("customer-grid") &&
    client.includes("data-cwl-hydrated-list") &&
    client.includes("stats.active");
  const g9907 =
    client.includes("data-cwl-wizard-shell") &&
    client.includes("data-cwl-nav-shell") &&
    client.includes("cwl-wizard-shell-ready") &&
    css.includes("cwl-wizard-shell.cwl-shell-open");
  const g9908 =
    client.includes("initFilterHonesty") &&
    client.includes("Filter not lifted") &&
    client.includes("dropdown-toggle");

  const scrub = await loadScrub();
  const sample =
    '<button class="btn-secondary"}>X</button> <form}>' +
    '<svg></modules/inventory d="M1 2"></svg> on:submit|preventDefault=';
  const cleaned = scrub(sample);
  const g9906 =
    !cleaned.includes('btn-secondary"}') &&
    !cleaned.includes("form}>") &&
    !cleaned.includes("</modules/inventory") &&
    !/on:submit/.test(cleaned);

  const inventory = join(
    ROOT,
    "fixtures/hub-wisp-management/cwl-static-export/modules/inventory/index.html",
  );
  let inventoryClean = true;
  if (existsSync(inventory)) {
    const html = readFileSync(inventory, "utf8");
    inventoryClean = !/btn-secondary"\}/.test(html);
  }

  const ok = g9905 && g9906 && g9907 && g9908 && inventoryClean;
  return {
    kind: WISP_CWL_SHOWCASE_DEPTH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    g9905,
    g9906,
    g9907,
    g9908,
    inventoryClean,
    note: "Secondary stats + list hydrate; attr scrub; wizard/nav shells; filter honesty",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlShowcaseDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-showcase-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
