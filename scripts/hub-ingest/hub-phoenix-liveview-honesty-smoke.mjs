#!/usr/bin/env node
/**
 * G10128 — Phoenix LiveView honesty prove (dual-primary language track).
 * Does **not** close LiveView as a full runtime 20/20. Never invent
 * LiveView / HEEx / channel runtime (**D6447**).
 *
 * Gate: hub:phoenix-liveview-honesty-smoke
 * Token: LIVEVIEW_HONESTY_OK
 *
 * Proves:
 * - Expanded LiveView residual catalog exists with required hole shapes
 * - Catalog refuses force-close of LiveView runtime 20/20
 * - Existing Phoenix controller route-surface gold (G10126) still peels
 * - Controller gold does not invent live "/…"
 * - No hub-gold-phoenix-liveview façade fixture
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_PHOENIX_LIVEVIEW_HONESTY_SMOKE_KIND =
  "chrysalis.hub.phoenix-liveview-honesty-smoke";
export const HUB_PHOENIX_LIVEVIEW_HONESTY_SMOKE_SCHEMA_VERSION = 1;
export const LIVEVIEW_HONESTY_OK = "LIVEVIEW_HONESTY_OK";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_REASONS = [
  "hub-elixir:liveview-route",
  "hub-elixir:liveview-module",
  "hub-elixir:liveview-callbacks",
  "hub-elixir:heex",
  "hub-elixir:liveview-socket",
  "hub-elixir:phoenix-channel",
];

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runPhoenixLiveviewHonestySmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const catalogPath = join(root, "fixtures/ci/phoenix-liveview-honest-holes.json");
  let catalog = null;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    catalog = null;
  }
  const catalogOk =
    catalog?.kind === "chrysalis.hub.phoenix-liveview-honest-holes" &&
    catalog?.decision === "honest-residual" &&
    catalog?.gate === "G10128" &&
    catalog?.token === LIVEVIEW_HONESTY_OK &&
    Array.isArray(catalog?.honestHoles) &&
    catalog.honestHoles.length >= 10;
  checks.push({
    id: "liveview-catalog",
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
    /LiveView/i.test(String(refuse?.claim || "")) &&
    /20\/20/.test(String(refuse?.claim || ""));
  checks.push({
    id: "refuse-force-close-liveview-runtime",
    ok: refuseOk,
    detail: refuseOk
      ? `claim=${refuse.claim}`
      : `refuseForceClose=${JSON.stringify(refuse)}`,
  });

  // Cross-link: controllers remain the only closed Phoenix secondary route-surface.
  const ctrlSkipPath = join(root, "fixtures/ci/phoenix-controller-honest-skip.json");
  let ctrlSkip = null;
  try {
    ctrlSkip = JSON.parse(readFileSync(ctrlSkipPath, "utf8"));
  } catch {
    ctrlSkip = null;
  }
  const ctrlSkipOk =
    ctrlSkip?.gate === "G10126" &&
    ctrlSkip?.decision === "closed-route-surface" &&
    (ctrlSkip?.honestHoles || []).some((h) =>
      /LiveView/i.test(String(h?.shape || "")),
    );
  checks.push({
    id: "controllers-route-surface-not-liveview",
    ok: ctrlSkipOk,
    detail: ctrlSkipOk
      ? "G10126 closed-route-surface; LiveView still listed as honest hole"
      : "phoenix-controller-honest-skip missing LiveView hole or wrong decision",
  });

  const goldRouter = join(
    root,
    "fixtures/hub-gold-phoenix-controllers/lib/hub_gold_web/router.ex",
  );
  let routerSrc = "";
  try {
    routerSrc = readFileSync(goldRouter, "utf8");
  } catch {
    routerSrc = "";
  }
  // Strip # comments so honesty docs in gold do not false-positive invent checks.
  const routerCode = routerSrc
    .split("\n")
    .map((line) => line.replace(/#.*$/, ""))
    .join("\n");
  const noLiveInvent =
    existsSync(goldRouter) &&
    !/\blive\s+"/.test(routerCode) &&
    !/\buse\s+Phoenix\.LiveView\b/.test(routerCode) &&
    !/~H/.test(routerCode);
  checks.push({
    id: "controller-gold-no-liveview-invent",
    ok: noLiveInvent,
    detail: noLiveInvent
      ? "hub-gold-phoenix-controllers has no live/HEEx invent (code)"
      : "controller gold missing or contains live/LiveView/HEEx code",
  });

  const liveviewGoldFaçade = existsSync(
    join(root, "fixtures/hub-gold-phoenix-liveview"),
  );
  checks.push({
    id: "no-liveview-runtime-gold-facade",
    ok: !liveviewGoldFaçade,
    detail: liveviewGoldFaçade
      ? "fixtures/hub-gold-phoenix-liveview must not claim invented runtime"
      : "no LiveView runtime gold façade",
  });

  // Prove peel that already exists (controllers) — do not invent LiveView peel.
  const { runPhoenixControllersSmoke } = await import(
    pathToFileURL(join(root, "scripts/hub-ingest/hub-phoenix-controllers-smoke.mjs"))
      .href
  );
  const ctrlReport = await runPhoenixControllersSmoke();
  checks.push({
    id: "phoenix-controllers-route-surface-green",
    ok: Boolean(ctrlReport?.ok),
    detail: ctrlReport?.ok
      ? `G10126 routeCount=${ctrlReport.routeCount} holeCount=${ctrlReport.holeCount}`
      : `controllers smoke failed skip=${ctrlReport?.skip || "ok=false"}`,
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

  // This lane must never set EXTFMAP ABSENT as a side effect of LiveView work.
  checks.push({
    id: "extfmap-untouched",
    ok: process.env.CHRYSALIS_EXTFMAP_ABSENT !== "1",
    detail:
      process.env.CHRYSALIS_EXTFMAP_ABSENT === "1"
        ? "CHRYSALIS_EXTFMAP_ABSENT=1 set — LiveView honesty must not attest ABSENT"
        : "EXTFMAP env not attested by this smoke",
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: HUB_PHOENIX_LIVEVIEW_HONESTY_SMOKE_KIND,
    schemaVersion: HUB_PHOENIX_LIVEVIEW_HONESTY_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? LIVEVIEW_HONESTY_OK : undefined,
    gate: "G10128",
    decision: "honest-residual",
    priorRouteSurface: "G10126",
    checks,
    failed: failed.map((c) => c.id),
    note: "Does not close LiveView runtime 20/20 — holes over façades (D6447)",
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runPhoenixLiveviewHonestySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok && report.token) console.log(report.token);
  process.exit(report.ok ? 0 : 1);
}
