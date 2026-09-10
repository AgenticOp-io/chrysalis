#!/usr/bin/env node
/**
 * G10134 — Restify honesty prove (L1 cheap honest-hole peel).
 * Does **not** close Restify as a full plugins/complex pre-use runtime 20/20.
 * Never invent plugins.* / non-empty pre|use / lifecycle / next.ifError (**D6447**).
 * Pass-through ceiling already known (G9959).
 *
 * Gate: hub:restify-honesty-smoke
 * Token: RESTIFY_HONESTY_OK
 *
 * Proves:
 * - Expanded Restify residual catalog exists with required hole shapes
 * - Catalog refuses force-close of Restify plugins/complex pre-use runtime 20/20
 * - Existing Restify ORIGIN gold (G9957/G9959/G10005) still peels
 * - Restify gold does not invent plugins/complex middleware
 * - No hub-gold-restify-plugins façade fixture
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_RESTIFY_HONESTY_SMOKE_KIND = "chrysalis.hub.restify-honesty-smoke";
export const HUB_RESTIFY_HONESTY_SMOKE_SCHEMA_VERSION = 1;
export const RESTIFY_HONESTY_OK = "RESTIFY_HONESTY_OK";
export const CONVERT_RESTIFY_HONESTY = "CONVERT_RESTIFY_HONESTY";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_REASONS = [
  "hub-js:restify-middleware",
  "hub-js:restify-plugins",
  "hub-js:restify-lifecycle",
  "hub-js:restify-named-handler",
  "hub-js:restify-versioned",
  "hub-js:restify-plugin-onion",
  "hub-js:restify-logging",
  "hub-js:restify-formatters",
];

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runRestifyHonestySmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const catalogPath = join(root, "fixtures/ci/restify-honest-holes.json");
  let catalog = null;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    catalog = null;
  }
  const catalogOk =
    catalog?.kind === "chrysalis.hub.restify-honest-holes" &&
    catalog?.decision === "honest-residual" &&
    catalog?.gate === "G10134" &&
    catalog?.token === RESTIFY_HONESTY_OK &&
    Array.isArray(catalog?.honestHoles) &&
    catalog.honestHoles.length >= 12;
  checks.push({
    id: "restify-honesty-catalog",
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
    /Restify/i.test(String(refuse?.claim || "")) &&
    /20\/20/.test(String(refuse?.claim || ""));
  checks.push({
    id: "refuse-force-close-restify-runtime",
    ok: refuseOk,
    detail: refuseOk
      ? `claim=${refuse.claim}`
      : `refuseForceClose=${JSON.stringify(refuse)}`,
  });

  // Cross-link: js-secondary catalog still lists Restify plugins/mw as holes.
  const jsPath = join(root, "fixtures/ci/js-secondary-dialect-honest-holes.json");
  let jsCatalog = null;
  try {
    jsCatalog = JSON.parse(readFileSync(jsPath, "utf8"));
  } catch {
    jsCatalog = null;
  }
  const restifySec = jsCatalog?.dialects?.restify;
  const jsHolesOk =
    Array.isArray(restifySec?.honestHoles) &&
    restifySec.honestHoles.some((h) =>
      /plugin|middleware|lifecycle|pre/i.test(String(h?.shape || "")),
    );
  checks.push({
    id: "js-secondary-restify-not-plugin-runtime",
    ok: jsHolesOk,
    detail: jsHolesOk
      ? "js-secondary restify lists plugins/mw/lifecycle; G9957/G9959/G10005 remain sole ORIGIN gold"
      : "js-secondary restify missing plugins/mw residual",
  });

  const goldApp = join(root, "fixtures/hub-gold-restify/src/app.ts");
  let goldSrc = "";
  try {
    goldSrc = readFileSync(goldApp, "utf8");
  } catch {
    goldSrc = "";
  }
  // Strip // and /* */ comments so honesty docs in gold do not false-positive.
  const stripTsComments = (src) =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, ""))
      .join("\n");
  const code = stripTsComments(goldSrc);
  const noPluginInvent =
    existsSync(goldApp) &&
    !/\brestify\.plugins\b/.test(code) &&
    !/\bbodyParser\b/.test(code) &&
    !/\bqueryParser\b/.test(code) &&
    !/\bgzipResponse\b/.test(code) &&
    !/\bthrottle\b/.test(code) &&
    !/\bauditLogger\b/.test(code) &&
    !/\brequestLogger\b/.test(code) &&
    !/\bnext\.ifError\b/.test(code) &&
    !/\bserver\.on\s*\(/.test(code) &&
    !/\bserver\.after\s*\(/.test(code) &&
    !/\bcreateServer\s*\(\s*\{/.test(code) &&
    !/\b\.listen\s*\(/.test(code);
  // Empty/next-only pre/use allowed (G9959). Reject non-empty mw bodies.
  const mwBodies = [
    ...code.matchAll(
      /server\.(?:pre|use)\s*\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{([\s\S]*?)\}\s*\)/g,
    ),
  ];
  const complexMw = mwBodies.some((m) => {
    const body = String(m[1] || "")
      .replace(/\breturn\s+next\s*\(\s*\)\s*;?/g, "")
      .replace(/\bnext\s*\(\s*\)\s*;?/g, "")
      .trim();
    return body.length > 0;
  });
  checks.push({
    id: "restify-gold-no-plugin-mw-invent",
    ok: noPluginInvent && !complexMw,
    detail:
      noPluginInvent && !complexMw
        ? "hub-gold-restify has no plugins.*/lifecycle/complex pre|use invent"
        : "restify gold missing or contains plugin/mw invent",
  });

  const pluginGoldFaçade = existsSync(join(root, "fixtures/hub-gold-restify-plugins"));
  checks.push({
    id: "no-restify-plugins-runtime-gold-facade",
    ok: !pluginGoldFaçade,
    detail: pluginGoldFaçade
      ? "fixtures/hub-gold-restify-plugins must not claim invented runtime"
      : "no Restify plugins/onion runtime gold façade",
  });

  // Prove peel that already exists (G9957/G9959/G10005) — do not invent plugin peel.
  const { runRestifySmoke } = await import(
    pathToFileURL(join(root, "scripts/hub-ingest/hub-restify-smoke.mjs")).href
  );
  const restifyReport = await runRestifySmoke();
  checks.push({
    id: "restify-route-surface-green",
    ok: Boolean(restifyReport?.ok),
    detail: restifyReport?.ok
      ? `G9957/G9959/G10005 routeCount=${restifyReport.routeCount} holeCount=${restifyReport.holeCount ?? 0}`
      : `restify smoke failed skip=${restifyReport?.skip || "ok=false"}`,
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

  // This lane must never set EXTFMAP ABSENT as a side effect of Restify honesty work.
  checks.push({
    id: "extfmap-untouched",
    ok: process.env.CHRYSALIS_EXTFMAP_ABSENT !== "1",
    detail:
      process.env.CHRYSALIS_EXTFMAP_ABSENT === "1"
        ? "CHRYSALIS_EXTFMAP_ABSENT=1 set — Restify honesty must not attest ABSENT"
        : "EXTFMAP env not attested by this smoke",
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: HUB_RESTIFY_HONESTY_SMOKE_KIND,
    schemaVersion: HUB_RESTIFY_HONESTY_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? RESTIFY_HONESTY_OK : undefined,
    convertToken: ok ? CONVERT_RESTIFY_HONESTY : undefined,
    gate: "G10134",
    decision: "honest-residual",
    priorRouteSurface: "G9957/G9959/G10005",
    checks,
    failed: failed.map((c) => c.id),
    note: "Does not close Restify plugins/complex pre-use runtime 20/20 — holes over façades (D6447); pass-through ceiling G9959",
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runRestifyHonestySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok && report.token) console.log(report.token);
  if (report.ok && report.convertToken) console.log(report.convertToken);
  process.exit(report.ok ? 0 : 1);
}
