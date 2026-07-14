#!/usr/bin/env node
/**
 * G9910–G9912 — dashboard cards, SVG path scrub, sites/work-orders hydrate.
 *
 * Run: pnpm run hub:wisp-cwl-route-depth-smoke
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const WISP_CWL_ROUTE_DEPTH_SMOKE_KIND = "chrysalis.wisp.cwl-route-depth-smoke";

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

function walkHtml(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkHtml(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

export async function runWispCwlRouteDepthSmoke() {
  const clientPath = join(ROOT, "fixtures/hub-wisp-management/wisp-cwl-client.js");
  const client = existsSync(clientPath) ? readFileSync(clientPath, "utf8") : "";

  const g9910 =
    client.includes("initDashboardModules") &&
    client.includes("/modules/customers") &&
    client.includes("/admin/tenant-management") &&
    client.includes('location.pathname.indexOf("/dashboard")') &&
    client.includes("/api/admin");

  const g9912 =
    client.includes(".work-orders-page") &&
    client.includes("/api/network") &&
    client.includes("/api/work-orders") &&
    client.includes("workOrders") &&
    client.includes("work-orders-grid");

  const scrub = await loadScrub();
  const sample = '<path d="M1 2"><//modules/inventory>';
  const cleaned = scrub(sample);
  const scrubUnit =
    cleaned.includes("</path>") &&
    !cleaned.includes("<//modules/") &&
    !cleaned.includes("</modules/inventory>");

  const exportDir = join(ROOT, "fixtures/hub-wisp-management/cwl-static-export");
  let svgJunk = 0;
  let files = 0;
  for (const file of walkHtml(exportDir)) {
    files++;
    const html = readFileSync(file, "utf8");
    const hits = html.match(/<\/?\/modules\/[^>]*>/gi) || [];
    svgJunk += hits.length;
  }
  const g9911 = scrubUnit && svgJunk === 0;

  const sitesHtml = join(exportDir, "modules/sites/index.html");
  const woHtml = join(exportDir, "modules/work-orders/index.html");
  const sitesOk = existsSync(sitesHtml) && readFileSync(sitesHtml, "utf8").includes("sites-page");
  const woOk = existsSync(woHtml) && readFileSync(woHtml, "utf8").includes("work-orders-grid");

  const ok = g9910 && g9911 && g9912 && sitesOk && woOk;
  return {
    kind: WISP_CWL_ROUTE_DEPTH_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    g9910,
    g9911,
    g9912,
    scrubUnit,
    svgJunk,
    exportFiles: files,
    sitesOk,
    woOk,
    note: "Dashboard catalog cards; SVG </modules/> scrub; sites→/api/network + work-orders hydrate",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlRouteDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-route-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
