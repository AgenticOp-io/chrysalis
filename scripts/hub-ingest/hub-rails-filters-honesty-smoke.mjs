#!/usr/bin/env node
/**
 * G10130 — Rails filters/resources honesty prove (dual-primary language track).
 * Does **not** close Rails as a full filters/AR runtime 20/20. Never invent
 * before_action / resources / ActiveRecord runtime (**D6447**).
 *
 * Gate: hub:rails-filters-honesty-smoke
 * Token: RAILS_FILTERS_HONESTY_OK
 *
 * Proves:
 * - Expanded Rails filters/resources residual catalog exists with required hole shapes
 * - Catalog refuses force-close of Rails filters/AR runtime 20/20
 * - Existing Rails route-table gold (G10115) still peels
 * - Rails gold does not invent before_action/resources/ActiveRecord
 * - No hub-gold-rails-filters façade fixture
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_RAILS_FILTERS_HONESTY_SMOKE_KIND =
  "chrysalis.hub.rails-filters-honesty-smoke";
export const HUB_RAILS_FILTERS_HONESTY_SMOKE_SCHEMA_VERSION = 1;
export const RAILS_FILTERS_HONESTY_OK = "RAILS_FILTERS_HONESTY_OK";
export const CONVERT_RAILS_FILTERS_HONESTY = "CONVERT_RAILS_FILTERS_HONESTY";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_REASONS = [
  "hub-ruby:rails-before-action",
  "hub-ruby:action-controller-filters",
  "hub-ruby:rails-resources",
  "hub-ruby:rails-route-macro",
  "hub-ruby:activerecord",
  "hub-ruby:strong-params",
  "hub-ruby:rails-runtime",
];

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runRailsFiltersHonestySmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const catalogPath = join(root, "fixtures/ci/rails-filters-honest-holes.json");
  let catalog = null;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    catalog = null;
  }
  const catalogOk =
    catalog?.kind === "chrysalis.hub.rails-filters-honest-holes" &&
    catalog?.decision === "honest-residual" &&
    catalog?.gate === "G10130" &&
    catalog?.token === RAILS_FILTERS_HONESTY_OK &&
    Array.isArray(catalog?.honestHoles) &&
    catalog.honestHoles.length >= 10;
  checks.push({
    id: "rails-filters-catalog",
    ok: catalogOk,
    detail: catalogOk
      ? `holes=${catalog.honestHoles.length} decision=${catalog.decision}`
      : `missing/invalid catalog at ${catalogPath}`,
  });

  const reasons = new Set(
    (catalog?.honestHoles || []).map((h) => String(h?.reason || "")),
  );
  const missingReasons = REQUIRED_REASONS.filter((r) => !reasons.has(r));
  checks.push({
    id: "required-hole-reasons",
    ok: missingReasons.length === 0,
    detail:
      missingReasons.length === 0
        ? `ok ${REQUIRED_REASONS.length}`
        : `missing ${missingReasons.join(",")}`,
  });

  const refuse = catalog?.refuseForceClose;
  const refuseOk =
    refuse?.allowed === false &&
    /Rails/i.test(String(refuse?.claim || "")) &&
    /20\/20/.test(String(refuse?.claim || ""));
  checks.push({
    id: "refuse-force-close-rails-filters-runtime",
    ok: refuseOk,
    detail: refuseOk
      ? `claim=${refuse.claim}`
      : `refuseForceClose=${JSON.stringify(refuse)}`,
  });

  // Cross-link: route-table skip catalog still lists filters/resources/AR as holes.
  const skipPath = join(root, "fixtures/ci/rails-controller-honest-skip.json");
  let skipCatalog = null;
  try {
    skipCatalog = JSON.parse(readFileSync(skipPath, "utf8"));
  } catch {
    skipCatalog = null;
  }
  const skipHolesOk =
    skipCatalog?.kind === "chrysalis.hub.rails-controller-honest-skip" &&
    skipCatalog?.gate === "G10115" &&
    (skipCatalog?.honestHoles || []).some((h) =>
      /filter|resources|ActiveRecord/i.test(String(h?.shape || "")),
    );
  checks.push({
    id: "rails-route-surface-not-filters",
    ok: skipHolesOk,
    detail: skipHolesOk
      ? "rails-controller-honest-skip lists filters/resources/AR; G10115 remains sole Rails ST gold"
      : "rails-controller-honest-skip missing filters/resources/AR hole",
  });

  const goldRoutes = join(
    root,
    "fixtures/hub-gold-rails-routes/config/routes.rb",
  );
  const goldHub = join(
    root,
    "fixtures/hub-gold-rails-routes/app/controllers/hub_controller.rb",
  );
  const goldItems = join(
    root,
    "fixtures/hub-gold-rails-routes/app/controllers/items_controller.rb",
  );
  let routesSrc = "";
  let controllersSrc = "";
  try {
    routesSrc = readFileSync(goldRoutes, "utf8");
  } catch {
    routesSrc = "";
  }
  try {
    controllersSrc = `${readFileSync(goldHub, "utf8")}\n${readFileSync(goldItems, "utf8")}`;
  } catch {
    controllersSrc = "";
  }
  // Strip # comments so honesty docs in gold do not false-positive invent checks.
  const stripRubyComments = (src) =>
    src
      .split("\n")
      .map((line) => line.replace(/#.*$/, ""))
      .join("\n");
  const routesCode = stripRubyComments(routesSrc);
  const controllersCode = stripRubyComments(controllersSrc);
  const noFiltersInvent =
    existsSync(goldRoutes) &&
    existsSync(goldHub) &&
    !/\bresources\b/.test(routesCode) &&
    !/\bnamespace\b/.test(routesCode) &&
    !/\bscope\b/.test(routesCode) &&
    !/\bbefore_action\b/.test(controllersCode) &&
    !/\bafter_action\b/.test(controllersCode) &&
    !/\baround_action\b/.test(controllersCode) &&
    !/\bbefore_filter\b/.test(controllersCode) &&
    !/\bActiveRecord\b/.test(controllersCode) &&
    !/\bApplicationRecord\b/.test(controllersCode) &&
    !/\bpermit\s*\(/.test(controllersCode);
  checks.push({
    id: "rails-gold-no-filters-ar-invent",
    ok: noFiltersInvent,
    detail: noFiltersInvent
      ? "hub-gold-rails-routes has no resources/filters/AR invent (code)"
      : "rails gold missing or contains resources/before_action/AR invent",
  });

  const filtersGoldFaçade = existsSync(
    join(root, "fixtures/hub-gold-rails-filters"),
  );
  checks.push({
    id: "no-rails-filters-runtime-gold-facade",
    ok: !filtersGoldFaçade,
    detail: filtersGoldFaçade
      ? "fixtures/hub-gold-rails-filters must not claim invented runtime"
      : "no Rails filters/AR runtime gold façade",
  });

  // Prove peel that already exists (G10115 route-table) — do not invent filters peel.
  const { runRailsRoutesSmoke } = await import(
    pathToFileURL(join(root, "scripts/hub-ingest/hub-rails-routes-smoke.mjs"))
      .href
  );
  const railsReport = await runRailsRoutesSmoke();
  checks.push({
    id: "rails-route-surface-green",
    ok: Boolean(railsReport?.ok),
    detail: railsReport?.ok
      ? `G10115 routeCount=${railsReport.routeCount} holeCount=${railsReport.holeCount}`
      : `rails routes smoke failed skip=${railsReport?.skip || "ok=false"}`,
  });

  const docs = [
    join(root, "docs/LEADERSHIP-SCOREBOARD.md"),
    join(root, "docs/DO-NOT-INVENT.md"),
  ];
  const docsOk = docs.every((p) => existsSync(p));
  checks.push({
    id: "honesty-docs",
    ok: docsOk,
    detail: docsOk ? "scoreboard + DO-NOT-INVENT present" : "missing docs",
  });

  // This lane must never set EXTFMAP ABSENT as a side effect of Rails honesty work.
  checks.push({
    id: "extfmap-untouched",
    ok: process.env.CHRYSALIS_EXTFMAP_ABSENT !== "1",
    detail:
      process.env.CHRYSALIS_EXTFMAP_ABSENT === "1"
        ? "CHRYSALIS_EXTFMAP_ABSENT=1 set — Rails filters honesty must not attest ABSENT"
        : "EXTFMAP env not attested by this smoke",
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: HUB_RAILS_FILTERS_HONESTY_SMOKE_KIND,
    schemaVersion: HUB_RAILS_FILTERS_HONESTY_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? RAILS_FILTERS_HONESTY_OK : undefined,
    convertToken: ok ? CONVERT_RAILS_FILTERS_HONESTY : undefined,
    gate: "G10130",
    decision: "honest-residual",
    priorRouteSurface: "G10115",
    checks,
    failed: failed.map((c) => c.id),
    note: "Does not close Rails filters/resources/AR runtime 20/20 — holes over façades (D6447)",
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runRailsFiltersHonestySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok && report.token) console.log(report.token);
  if (report.ok && report.convertToken) console.log(report.convertToken);
  process.exit(report.ok ? 0 : 1);
}
