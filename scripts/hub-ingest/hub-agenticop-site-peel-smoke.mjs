#!/usr/bin/env node
/**
 * Emit the AgenticOps public site genome through Convert.
 * Language HTML keeps the year and device tokens. The host pass fills them.
 * Token: CONVERT_AGENTICOP_SITE_OK
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyCwlHostDocumentTokens } from "./cwl-ingest.mjs";
import { applyLayoutsToParsedModule } from "./cwl-layout.mjs";
import { parseCwlModule } from "./cwl-parser.mjs";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { listCwlRoutes, renderCwlRoutes, listCwlModuleUses } from "./hub-webir-routes.mjs";
import { resolveCwlPillarRoot } from "./hub-cwl-language-pillar-smoke.mjs";
import { loadWebir } from "./shared.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const HOST_YEAR = 2026;

const failures = [];
function fail(message) {
  failures.push(message);
}

const cwlRoot = resolveCwlPillarRoot();
const file = join(cwlRoot, "fixtures/sites/agenticop-io/site.cwl");
const source = readFileSync(file, "utf8");
const parsed = parseCwlModule(source, file);
applyLayoutsToParsedModule(parsed);
const byPath = new Map((parsed.routes ?? []).map((route) => [route.path, route]));
const devices = parsed.routes?.find((route) => route.deviceHost)?.deviceHost?.values ?? [];
const below = parsed.routes?.find((route) => Number.isInteger(route.deviceHost?.below))?.deviceHost?.below;

const webir = await loadWebir();
const snapshot = await exportCwlFileToWebirJson(file);
const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
const module = webir.moduleFromGoldenSnapshot(raw);
const routes = listCwlRoutes(module);
const projected = renderCwlRoutes(routes, { moduleUses: listCwlModuleUses(module) }).text;

if (routes.length !== 26) fail(`expected 26 pages, got ${routes.length}`);
if (projected.includes("/ao-layout.js")) fail("projection loads ao-layout.js");
if (projected.includes("userAgent")) fail("projection reads the user agent");

for (const route of routes) {
  const html = route.value?.t === "lit" ? String(route.value.value ?? "") : "";
  const decl = byPath.get(route.path);
  if (!html) {
    fail(`${route.path} has no html body`);
    continue;
  }
  if (html.includes("/ao-layout.js")) fail(`${route.path} loads ao-layout.js`);
  if (html.includes("<!-- cwl:links")) fail(`${route.path} left a links slot`);
  if (html.includes("<!-- cwl:style -->")) fail(`${route.path} left a style slot`);
  if (html.includes("<!-- cwl:image ")) fail(`${route.path} left an image slot`);
  if (html.includes("<!-- cwl:body -->")) fail(`${route.path} left a body slot`);
  if (html.includes("<!-- cwl:head -->")) fail(`${route.path} left a head slot`);
  if (html.includes("userAgent") || html.includes("matchMedia")) fail(`${route.path} reads the client`);
  if (!html.includes('rel="stylesheet" href="/agenticops.css"')) fail(`${route.path} missing stylesheet`);
  if (!html.includes('rel="stylesheet" href="/fonts.css"')) fail(`${route.path} missing owned fonts.css`);
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html)) fail(`${route.path} still loads Google Fonts`);
  if (!html.includes("/logo.svg")) fail(`${route.path} missing logo path`);
  if (/<form[^>]+action="https?:/.test(html)) fail(`${route.path} posts a form off-site`);
  if (decl?.layoutName === "site") {
    if (!html.includes('data-cwl-drawer="1"')) fail(`${route.path} missing drawer script`);
    if (!html.includes("<!-- cwl:year -->")) fail(`${route.path} dropped the year token`);
    if (!html.includes("<!-- cwl:device -->")) fail(`${route.path} dropped the device token`);
    if (!html.includes("cwl-host")) fail(`${route.path} missing firebase host note`);
    if (!html.includes('id="ao-site-nav"')) fail(`${route.path} missing nav`);
    if (!html.includes('href="/chrysalis.html"')) fail(`${route.path} missing CWL link`);
    const nav = decl.navId || decl.name;
    if (!html.includes(`data-ao-page="${nav}"`)) fail(`${route.path} page id is not ${nav}`);
    const hosted = applyCwlHostDocumentTokens(html, { year: HOST_YEAR, devices, below });
    if (hosted.includes("<!-- cwl:year -->")) fail(`${route.path} host left the year token`);
    if (!hosted.includes(String(HOST_YEAR))) fail(`${route.path} host year missing`);
    if (hosted.includes("<!-- cwl:device -->")) fail(`${route.path} host left the device token`);
    if (!hosted.includes('data-cwl-device="1"')) fail(`${route.path} host device script missing`);
    if (!hosted.includes(`max-width: ${below}px`)) fail(`${route.path} host cut is not the declared below`);
    if (hosted.includes("userAgent") || hosted.includes("/ao-layout.js")) fail(`${route.path} host sniff`);
    for (const name of devices) {
      if (!hosted.includes(JSON.stringify(name))) fail(`${route.path} host dropped device ${name}`);
    }
  }
  if (route.handlerName === "home" && !html.includes("is the DNA of the web.")) fail("home heading missing");
  if (route.handlerName === "missing" && html.includes("data-cwl-drawer")) fail("404 gained a drawer");
  if (route.handlerName === "contact" && !html.includes("ao-nav-cta ao-nav-link-active")) {
    fail("contact CTA is not active");
  }
}

const report = {
  kind: "chrysalis.hub.agenticop-site-peel",
  ok: failures.length === 0,
  token: failures.length === 0 ? "CONVERT_AGENTICOP_SITE_OK" : "CONVERT_AGENTICOP_SITE_FAIL",
  pages: routes.length,
  failures,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.ok) process.stdout.write("CONVERT_AGENTICOP_SITE_OK\n");
process.exit(report.ok ? 0 : 1);
