#!/usr/bin/env node
/**
 * G9913–G9916 — ops/billing hydrate + residual markup scrub + live API surface.
 *
 * Run: pnpm run hub:wisp-cwl-ops-surface-smoke
 * Skip live: CHRYSALIS_SKIP_LIVE=1
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const WISP_CWL_OPS_SURFACE_SMOKE_KIND = "chrysalis.wisp.cwl-ops-surface-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_BASE = "http://34.61.255.147:19100";

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

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

export async function runWispCwlOpsSurfaceSmoke(opts = {}) {
  const clientPath = join(ROOT, "fixtures/hub-wisp-management/wisp-cwl-client.js");
  const client = existsSync(clientPath) ? readFileSync(clientPath, "utf8") : "";
  const exportDir = join(ROOT, "fixtures/hub-wisp-management/cwl-static-export");

  const g9913 =
    client.includes(".help-desk-container") &&
    client.includes(".maintain-module") &&
    client.includes("/api/maintain") &&
    client.includes("tickets-grid") &&
    client.includes("report.summary");

  const g9915 =
    client.includes(".billing-module") &&
    client.includes("/api/customer-billing") &&
    client.includes("fillPlans") &&
    client.includes("plans-grid");

  const scrub = await loadScrub();
  const sample =
    "<svelte:head><title>x</title></svelte:head> Dashboard\\r <span>←\u0090</span>";
  const cleaned = scrub(sample);
  const scrubUnit =
    !cleaned.includes("svelte:head") &&
    !cleaned.includes("\\r") &&
    !/←[\u0080-\u009F]/.test(cleaned);

  let svelteLeft = 0;
  let crLeft = 0;
  let files = 0;
  for (const file of walkHtml(exportDir)) {
    files++;
    const html = readFileSync(file, "utf8");
    if (/<svelte:(?:head|window|body|document)\b/i.test(html)) svelteLeft++;
    if (/\\r/.test(html)) crLeft++;
  }
  const g9914 = scrubUnit && svelteLeft === 0 && crLeft === 0;

  const helpOk =
    existsSync(join(exportDir, "modules/help-desk/index.html")) &&
    readFileSync(join(exportDir, "modules/help-desk/index.html"), "utf8").includes("tickets-grid");
  const billOk =
    existsSync(join(exportDir, "modules/billing/index.html")) &&
    readFileSync(join(exportDir, "modules/billing/index.html"), "utf8").includes("plans-grid");

  let live = { skipped: true };
  if (process.env.CHRYSALIS_SKIP_LIVE !== "1") {
    const base = (opts.baseUrl || process.env.CHRYSALIS_WISP_DEMO_URL || DEFAULT_BASE).replace(
      /\/$/,
      "",
    );
    const apis = {};
    for (const path of ["/api/maintain", "/api/customer-billing"]) {
      const r = await fetchText(`${base}${path}`);
      let parseOk = false;
      let keys = [];
      try {
        const j = JSON.parse(r.text);
        parseOk = true;
        keys = Object.keys(j || {});
      } catch {
        parseOk = false;
      }
      apis[path] = {
        status: r.status,
        proxy: r.headers.get("x-chrysalis-wisp-proxy"),
        parseOk,
        keys,
        ok:
          r.status === 200 &&
          parseOk &&
          r.headers.get("x-chrysalis-wisp-proxy") === "cwl-native-api",
      };
    }
    const liveClient = await fetchText(`${base}/assets/wisp-cwl-client.js`);
    const liveClientOk =
      liveClient.status === 200 &&
      liveClient.text.includes("/api/maintain") &&
      liveClient.text.includes("fillPlans");
    const apisOk = Object.values(apis).every((a) => a.ok);
    live = {
      skipped: false,
      baseUrl: base,
      apis,
      liveClientOk,
      // Client string asserted post-deploy by island-live-hydrate; APIs must be healthy now.
      ok: apisOk,
    };
  }

  const g9916 = live.skipped === true || live.ok === true;
  const ok = g9913 && g9914 && g9915 && g9916 && helpOk && billOk;

  return {
    kind: WISP_CWL_OPS_SURFACE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    g9913,
    g9914,
    g9915,
    g9916,
    scrubUnit,
    svelteLeft,
    crLeft,
    exportFiles: files,
    helpOk,
    billOk,
    live,
    note: "Help-desk/maintain + billing hydrate; svelte/\\r/mojibake scrub; live maintain/billing APIs",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlOpsSurfaceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-ops-surface-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
