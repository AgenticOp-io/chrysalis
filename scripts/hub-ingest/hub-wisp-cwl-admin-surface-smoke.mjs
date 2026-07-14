#!/usr/bin/env node
/**
 * G9917–G9920 — admin/users/tenants + monitoring/HSS/deploy hydrate + catalog/scrub.
 *
 * Run: pnpm run hub:wisp-cwl-admin-surface-smoke
 * Skip live: CHRYSALIS_SKIP_LIVE=1
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const WISP_CWL_ADMIN_SURFACE_SMOKE_KIND = "chrysalis.wisp.cwl-admin-surface-smoke";

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

export async function runWispCwlAdminSurfaceSmoke(opts = {}) {
  const clientPath = join(ROOT, "fixtures/hub-wisp-management/wisp-cwl-client.js");
  const client = existsSync(clientPath) ? readFileSync(clientPath, "utf8") : "";
  const exportDir = join(ROOT, "fixtures/hub-wisp-management/cwl-static-export");

  const g9917 =
    client.includes(".user-management-container") &&
    client.includes(".tenant-management-page") &&
    client.includes("/api/users") &&
    client.includes("/api/tenants") &&
    client.includes("tenants-grid");

  const g9918 =
    client.includes("/api/monitoring") &&
    client.includes("/api/hss") &&
    client.includes(".hss-management") &&
    client.includes('pathPrefix: "/modules/monitoring"');

  const g9919 =
    client.includes("/api/deploy") &&
    client.includes("fillDeployCounts") &&
    client.includes("Approved (");

  const g9920catalog =
    client.includes('id: "deploy"') &&
    client.includes('id: "user-management"') &&
    client.includes('id: "hss-management"');

  const scrub = await loadScrub();
  const sample = '<div class="cwl-widget-shell" data-cwl-widget-shell="X"></div> }\n';
  const cleaned = scrub(sample);
  const scrubUnit = !cleaned.includes("} ") && !/<\/div>\s*\}/.test(cleaned);

  let orphanBrace = 0;
  for (const file of walkHtml(exportDir)) {
    const html = readFileSync(file, "utf8");
    const hits = html.match(/<\/(?:div|nav)>\s*\}/g) || [];
    orphanBrace += hits.length;
  }
  const g9920 = g9920catalog && scrubUnit && orphanBrace === 0;

  const pagesOk =
    existsSync(join(exportDir, "modules/user-management/index.html")) &&
    existsSync(join(exportDir, "modules/tenant-management/index.html")) &&
    existsSync(join(exportDir, "modules/deploy/index.html"));

  let live = { skipped: true };
  if (process.env.CHRYSALIS_SKIP_LIVE !== "1") {
    const base = (opts.baseUrl || process.env.CHRYSALIS_WISP_DEMO_URL || DEFAULT_BASE).replace(
      /\/$/,
      "",
    );
    const apis = {};
    for (const path of ["/api/users", "/api/tenants", "/api/monitoring", "/api/hss", "/api/deploy"]) {
      const r = await fetchText(`${base}${path}`);
      let parseOk = false;
      try {
        JSON.parse(r.text);
        parseOk = true;
      } catch {
        parseOk = false;
      }
      apis[path] = {
        status: r.status,
        proxy: r.headers.get("x-chrysalis-wisp-proxy"),
        parseOk,
        ok:
          r.status === 200 &&
          parseOk &&
          r.headers.get("x-chrysalis-wisp-proxy") === "cwl-native-api",
      };
    }
    live = {
      skipped: false,
      baseUrl: base,
      apis,
      ok: Object.values(apis).every((a) => a.ok),
    };
  }

  const ok = g9917 && g9918 && g9919 && g9920 && pagesOk && (live.skipped || live.ok);
  return {
    kind: WISP_CWL_ADMIN_SURFACE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    g9917,
    g9918,
    g9919,
    g9920,
    scrubUnit,
    orphanBrace,
    pagesOk,
    live,
    note: "Users/tenants + monitoring/HSS/deploy hydrate; dashboard catalog; orphan } scrub",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlAdminSurfaceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-admin-surface-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
