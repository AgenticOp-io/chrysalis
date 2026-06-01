#!/usr/bin/env node
/**
 * SvelteKit origin lift smoke (G1144).
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSvelteKitRouteFiles, liftSvelteKitProjectToWebir, svelteKitFileToHttpPath } from "./sveltekit-route-lift.mjs";
import { loadWebir } from "./shared.mjs";

export const HUB_SVELTE_KIT_SMOKE_KIND = "chrysalis.hub.sveltekit-smoke";
export const HUB_SVELTE_KIT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-svelte-kit");

export async function runSvelteKitSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const base = {
    kind: HUB_SVELTE_KIT_SMOKE_KIND,
    schemaVersion: HUB_SVELTE_KIT_SMOKE_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-svelte-kit",
    ok: false,
  };
  if (!existsSync(join(fixture, "src/routes"))) {
    return { ...base, skip: "missing-routes-dir" };
  }

  const discovered = await discoverSvelteKitRouteFiles(fixture);
  const blogServer = join(fixture, "src/routes/blog/[slug]/+server.ts");
  const blogPath = discovered.routesRoot
    ? svelteKitFileToHttpPath(discovered.routesRoot, blogServer)
    : null;

  const webir = await loadWebir();
  const builder = new webir.ModuleBuilder({ sourceApp: "hub-sveltekit-smoke" });
  const wr = webir.webRequest.builders(builder);
  const lifted = await liftSvelteKitProjectToWebir({
    projectDir: fixture,
    webir,
    builder,
    wr,
    language: "svelte",
  });
  const module = builder.finish();
  const holes = webir.countHoles(module);

  const ok =
    discovered.files.length >= 2 &&
    blogPath === "/blog/:slug" &&
    lifted.routeCount >= 3 &&
    module.roots.length >= 3 &&
    holes === 0;

  return {
    ...base,
    ok,
    discovered: { routesRoot: discovered.routesRoot, fileCount: discovered.files.length, blogPath },
    lifted,
    holeCount: holes,
    routeCount: module.roots.length,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSvelteKitSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
