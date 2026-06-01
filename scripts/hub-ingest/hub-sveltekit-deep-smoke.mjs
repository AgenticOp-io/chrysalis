#!/usr/bin/env node
/**
 * SvelteKit deep fixture smoke (G1158): POST handlers, +page.server load holes, Svelte blocks.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isCataloguedFullstackHole } from "./cwl-fullstack-holes.mjs";
import {
  checkFullstackHoleBudget,
  readFullstackHoleBudget,
} from "./hub-cwl-fullstack-hole-budget.mjs";
import { discoverSvelteKitRouteFiles, liftSvelteKitProjectToWebir } from "./sveltekit-route-lift.mjs";
import { loadWebir } from "./shared.mjs";
import { listCwlRoutes } from "./hub-webir-routes.mjs";

export const HUB_SVELTEKIT_DEEP_SMOKE_KIND = "chrysalis.hub.sveltekit-deep-smoke";
export const HUB_SVELTEKIT_DEEP_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-svelte-kit-deep");

export async function runSveltekitDeepSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const base = {
    kind: HUB_SVELTEKIT_DEEP_SMOKE_KIND,
    schemaVersion: HUB_SVELTEKIT_DEEP_SMOKE_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-svelte-kit-deep",
    ok: false,
  };
  if (!existsSync(join(fixture, "src/routes"))) {
    return { ...base, skip: "missing-routes-dir" };
  }

  const budgetRead = await readFullstackHoleBudget(fixture);
  if (!budgetRead.ok) {
    return { ...base, skip: budgetRead.reason };
  }

  const discovered = await discoverSvelteKitRouteFiles(fixture);
  const webir = await loadWebir();
  const builder = new webir.ModuleBuilder({ sourceApp: "hub-sveltekit-deep-smoke" });
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
  const routes = listCwlRoutes(module);
  const holeReasons = routes.filter((r) => r.holeReason).map((r) => String(r.holeReason));
  const liftedRoutes = routes.filter((r) => !r.holeReason).length;
  const cataloguedOnly = holeReasons.every((r) => isCataloguedFullstackHole(r));
  const budgetCheck = checkFullstackHoleBudget(budgetRead.budget, {
    holeCount: holes,
    routeCount: module.roots.length,
  });
  const hasPost = routes.some((r) => r.method === "POST" && !r.holeReason);
  const hasLoadHole = holeReasons.includes("hub-svelte:load-function");
  const hasBlockHole = holeReasons.includes("hub-svelte:page-component");

  const ok =
    budgetCheck.ok &&
    cataloguedOnly &&
    hasPost &&
    hasLoadHole &&
    hasBlockHole &&
    liftedRoutes >= (budgetRead.budget.minLiftedRoutes ?? 3);

  return {
    ...base,
    ok,
    budgetCheck,
    discovered: { fileCount: discovered.files.length, pageServerDirs: discovered.files.filter((f) => f.hasPageServer).length },
    lifted,
    holeCount: holes,
    liftedRoutes,
    holeReasons,
    hasPost,
    hasLoadHole,
    hasBlockHole,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSveltekitDeepSmoke();
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
