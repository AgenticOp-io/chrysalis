#!/usr/bin/env node
/**
 * Next.js App Router deep smoke (G1172): POST + page component hole.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isCataloguedFullstackHole } from "./cwl-fullstack-holes.mjs";
import {
  checkFullstackHoleBudget,
  readFullstackHoleBudget,
} from "./hub-cwl-fullstack-hole-budget.mjs";
import { liftNextAppProjectToWebir } from "./nextjs-route-lift.mjs";
import { loadWebir } from "./shared.mjs";
import { listCwlRoutes } from "./hub-webir-routes.mjs";

export const HUB_NEXTJS_DEEP_SMOKE_KIND = "chrysalis.hub.nextjs-deep-smoke";
export const HUB_NEXTJS_DEEP_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldFixture = join(scriptRoot, "fixtures/hub-gold-nextjs-app-deep");

export async function runNextjsDeepSmoke(opts = {}) {
  const fixture = resolve(opts.fixture ?? goldFixture);
  const base = {
    kind: HUB_NEXTJS_DEEP_SMOKE_KIND,
    schemaVersion: HUB_NEXTJS_DEEP_SMOKE_SCHEMA_VERSION,
    fixture: "fixtures/hub-gold-nextjs-app-deep",
    ok: false,
  };
  if (!existsSync(join(fixture, "app"))) {
    return { ...base, skip: "missing-app-dir" };
  }

  const budgetRead = await readFullstackHoleBudget(fixture);
  if (!budgetRead.ok) {
    return { ...base, skip: budgetRead.reason };
  }

  const webir = await loadWebir();
  const builder = new webir.ModuleBuilder({ sourceApp: "hub-nextjs-deep-smoke" });
  const wr = webir.webRequest.builders(builder);
  await liftNextAppProjectToWebir({ projectDir: fixture, webir, builder, wr, language: "nextjs" });
  const module = builder.finish();
  const routes = listCwlRoutes(module);
  const holeReasons = routes.filter((r) => r.holeReason).map((r) => String(r.holeReason));
  const budgetCheck = checkFullstackHoleBudget(budgetRead.budget, {
    holeCount: webir.countHoles(module),
    routeCount: module.roots.length,
  });
  const hasPost = routes.some((r) => r.method === "POST" && !r.holeReason);
  const hasBlockHole = holeReasons.includes("hub-next:page-component");
  const hasLoadHole = holeReasons.includes("hub-next:load-function");
  const loadRouteLifted = routes.some((r) => r.path.includes("/blog/") && !r.holeReason && r.loadData);

  const ok =
    budgetCheck.ok &&
    hasPost &&
    hasBlockHole &&
    !hasLoadHole &&
    loadRouteLifted &&
    holeReasons.every((r) => isCataloguedFullstackHole(r));

  return {
    ...base,
    ok,
    budgetCheck,
    holeReasons,
    hasPost,
    hasBlockHole,
    hasLoadHole,
    loadRouteLifted,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runNextjsDeepSmoke();
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
