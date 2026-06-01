#!/usr/bin/env node
/**
 * CWL HTML interpolation round-trip smoke (G1202): ingest → render preserves bare refs.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { liftCwlFileToWebir } from "./cwl-ingest.mjs";
import { listCwlRoutes, renderCwlRoutes } from "./hub-webir-routes.mjs";
import { loadWebir } from "./shared.mjs";

export const HUB_CWL_HTML_ROUNDTRIP_KIND = "chrysalis.hub.cwl-html-roundtrip";
export const HUB_CWL_HTML_ROUNDTRIP_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const flagshipCwl = join(scriptRoot, "fixtures/hub-flagship-cwl-fullstack/routes.cwl");

export async function runCwlHtmlRoundtripSmoke(opts = {}) {
  const cwlPath = resolve(opts.cwlPath ?? flagshipCwl);
  const base = {
    kind: HUB_CWL_HTML_ROUNDTRIP_KIND,
    schemaVersion: HUB_CWL_HTML_ROUNDTRIP_SCHEMA_VERSION,
    ok: false,
  };
  const source = readFileSync(cwlPath, "utf8");
  const webir = await loadWebir();
  const builder = new webir.ModuleBuilder({ sourceApp: "hub-cwl-html-roundtrip" });
  const wr = webir.webRequest.builders(builder);
  await liftCwlFileToWebir({
    webir,
    builder,
    wr,
    language: "cwl",
    entryPath: cwlPath,
    file: cwlPath,
    source,
  });
  const module = builder.finish();
  const routes = listCwlRoutes(module);
  const rendered = renderCwlRoutes(routes, { moduleName: "flagship" });
  const text = rendered.text;
  const ok =
    text.includes('return html "<html><body><h1>Doc</h1><p>slug: slug</p></body></html>"') &&
    text.includes('load { slug: slug, source: "flagship" }') &&
    rendered.holeCount === 0;
  return {
    ...base,
    ok,
    routeCount: rendered.routeCount,
    holeCount: rendered.holeCount,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlHtmlRoundtripSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
