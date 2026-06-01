#!/usr/bin/env node
/**
 * Next.js App Router origin smoke (G1167).
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isCataloguedFullstackHole } from "./cwl-fullstack-holes.mjs";
import {
  checkFullstackHoleBudget,
  readFullstackHoleBudget,
} from "./hub-cwl-fullstack-hole-budget.mjs";
import { discoverNextAppRouteFiles, liftNextAppProjectToWebir } from "./nextjs-route-lift.mjs";
import { loadWebir } from "./shared.mjs";
import { listCwlRoutes } from "./hub-webir-routes.mjs";

export const HUB_NEXTJS_APP_SMOKE_KIND = "chrysalis.hub.nextjs-app-smoke";
export const HUB_NEXTJS_APP_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-nextjs-app");

export async function runNextjsAppSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const base = {
    kind: HUB_NEXTJS_APP_SMOKE_KIND,
    schemaVersion: HUB_NEXTJS_APP_SMOKE_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-nextjs-app",
    ok: false,
  };
  if (!existsSync(join(fixture, "app"))) {
    return { ...base, skip: "missing-app-dir" };
  }

  const budgetRead = await readFullstackHoleBudget(fixture);
  if (!budgetRead.ok) {
    return { ...base, skip: budgetRead.reason };
  }

  const discovered = await discoverNextAppRouteFiles(fixture);
  const webir = await loadWebir();
  const builder = new webir.ModuleBuilder({ sourceApp: "hub-nextjs-app-smoke" });
  const wr = webir.webRequest.builders(builder);
  const lifted = await liftNextAppProjectToWebir({
    projectDir: fixture,
    webir,
    builder,
    wr,
    language: "nextjs",
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
  const hasApi = routes.some((r) => r.path.startsWith("/api/") && !r.holeReason);

  const ok =
    budgetCheck.ok &&
    cataloguedOnly &&
    hasApi &&
    liftedRoutes >= (budgetRead.budget.minLiftedRoutes ?? 2) &&
    lifted.usedAst === true;

  return {
    ...base,
    ok,
    budgetCheck,
    discovered: { fileCount: discovered.files.length },
    lifted,
    holeCount: holes,
    liftedRoutes,
    holeReasons,
    hasApi,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runNextjsAppSmoke();
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
