#!/usr/bin/env node
/**
 * G10132 — Koa honesty prove (L1 cheap honest-hole peel).
 * Does **not** close Koa as a full onion middleware runtime 20/20.
 * Never invent complex onion / koa-compose / plugins / throw runtime (**D6447**).
 * Pass-through ceiling already known (G9959).
 *
 * Gate: hub:koa-honesty-smoke
 * Token: KOA_HONESTY_OK
 *
 * Proves:
 * - Expanded Koa residual catalog exists with required hole shapes
 * - Catalog refuses force-close of Koa onion middleware runtime 20/20
 * - Existing Koa ORIGIN gold (G9959/G10005) still peels
 * - Koa gold does not invent complex middleware/plugins
 * - No hub-gold-koa-middleware façade fixture
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_KOA_HONESTY_SMOKE_KIND = "chrysalis.hub.koa-honesty-smoke";
export const HUB_KOA_HONESTY_SMOKE_SCHEMA_VERSION = 1;
export const KOA_HONESTY_OK = "KOA_HONESTY_OK";
export const CONVERT_KOA_HONESTY = "CONVERT_KOA_HONESTY";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_REASONS = [
  "hub-js:koa-middleware",
  "hub-js:koa-compose",
  "hub-js:koa-throw",
  "hub-js:koa-cookies-set",
  "hub-js:koa-plugins",
  "hub-js:koa-nested-router",
  "hub-js:koa-generator-mw",
  "hub-js:koa-websocket",
];

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runKoaHonestySmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const catalogPath = join(root, "fixtures/ci/koa-honest-holes.json");
  let catalog = null;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    catalog = null;
  }
  const catalogOk =
    catalog?.kind === "chrysalis.hub.koa-honest-holes" &&
    catalog?.decision === "honest-residual" &&
    catalog?.gate === "G10132" &&
    catalog?.token === KOA_HONESTY_OK &&
    Array.isArray(catalog?.honestHoles) &&
    catalog.honestHoles.length >= 12;
  checks.push({
    id: "koa-honesty-catalog",
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
    /Koa/i.test(String(refuse?.claim || "")) &&
    /20\/20/.test(String(refuse?.claim || ""));
  checks.push({
    id: "refuse-force-close-koa-runtime",
    ok: refuseOk,
    detail: refuseOk
      ? `claim=${refuse.claim}`
      : `refuseForceClose=${JSON.stringify(refuse)}`,
  });

  // Cross-link: js-secondary catalog still lists Koa complex mw as holes.
  const jsPath = join(root, "fixtures/ci/js-secondary-dialect-honest-holes.json");
  let jsCatalog = null;
  try {
    jsCatalog = JSON.parse(readFileSync(jsPath, "utf8"));
  } catch {
    jsCatalog = null;
  }
  const koaSec = jsCatalog?.dialects?.koa;
  const jsHolesOk =
    Array.isArray(koaSec?.honestHoles) &&
    koaSec.honestHoles.some((h) =>
      /middleware|onion|throw|cookies/i.test(String(h?.shape || "")),
    );
  checks.push({
    id: "js-secondary-koa-not-onion",
    ok: jsHolesOk,
    detail: jsHolesOk
      ? "js-secondary koa lists complex mw/throw/cookies; G9959/G10005 remain sole ORIGIN gold"
      : "js-secondary koa missing complex mw/throw residual",
  });

  const goldApp = join(root, "fixtures/hub-gold-koa/src/app.ts");
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
  const noOnionInvent =
    existsSync(goldApp) &&
    !/\bkoa-compose\b/.test(code) &&
    !/\bcompose\s*\(/.test(code) &&
    !/\bctx\.throw\b/.test(code) &&
    !/\bctx\.assert\b/.test(code) &&
    !/\bctx\.respond\s*=/.test(code) &&
    !/\bctx\.cookies\b/.test(code) &&
    !/\bkoa-bodyparser\b/.test(code) &&
    !/\bkoa-static\b/.test(code) &&
    !/\bkoa-session\b/.test(code) &&
    !/\bpassport\b/.test(code) &&
    !/\bkoa-websocket\b/.test(code) &&
    !/\bfunction\s*\*\s*\(/.test(code) &&
    !/\byield\b/.test(code) &&
    !/\bnew\s+Koa\s*\(/.test(code) &&
    !/\b\.listen\s*\(/.test(code);
  // Empty/next-only app.use is allowed (G9959). Reject non-empty mw bodies.
  const useBodies = [
    ...code.matchAll(/app\.use\s*\(\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g),
  ];
  const complexUse = useBodies.some((m) => {
    const body = String(m[1] || "")
      .replace(/\bawait\s+next\s*\(\s*\)\s*;?/g, "")
      .replace(/\breturn\s+next\s*\(\s*\)\s*;?/g, "")
      .replace(/\bnext\s*\(\s*\)\s*;?/g, "")
      .trim();
    return body.length > 0;
  });
  checks.push({
    id: "koa-gold-no-onion-plugin-invent",
    ok: noOnionInvent && !complexUse,
    detail:
      noOnionInvent && !complexUse
        ? "hub-gold-koa has no compose/plugins/throw/complex use invent"
        : "koa gold missing or contains onion/plugin invent",
  });

  const mwGoldFaçade = existsSync(join(root, "fixtures/hub-gold-koa-middleware"));
  checks.push({
    id: "no-koa-middleware-runtime-gold-facade",
    ok: !mwGoldFaçade,
    detail: mwGoldFaçade
      ? "fixtures/hub-gold-koa-middleware must not claim invented runtime"
      : "no Koa middleware onion runtime gold façade",
  });

  // Prove peel that already exists (G9959/G10005) — do not invent onion peel.
  const { runKoaSmoke } = await import(
    pathToFileURL(join(root, "scripts/hub-ingest/hub-koa-smoke.mjs")).href
  );
  const koaReport = await runKoaSmoke();
  checks.push({
    id: "koa-route-surface-green",
    ok: Boolean(koaReport?.ok),
    detail: koaReport?.ok
      ? `G9959/G10005 routeCount=${koaReport.routeCount} holeCount=${koaReport.holeCount ?? 0}`
      : `koa smoke failed skip=${koaReport?.skip || "ok=false"}`,
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

  // This lane must never set EXTFMAP ABSENT as a side effect of Koa honesty work.
  checks.push({
    id: "extfmap-untouched",
    ok: process.env.CHRYSALIS_EXTFMAP_ABSENT !== "1",
    detail:
      process.env.CHRYSALIS_EXTFMAP_ABSENT === "1"
        ? "CHRYSALIS_EXTFMAP_ABSENT=1 set — Koa honesty must not attest ABSENT"
        : "EXTFMAP env not attested by this smoke",
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: HUB_KOA_HONESTY_SMOKE_KIND,
    schemaVersion: HUB_KOA_HONESTY_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? KOA_HONESTY_OK : undefined,
    convertToken: ok ? CONVERT_KOA_HONESTY : undefined,
    gate: "G10132",
    decision: "honest-residual",
    priorRouteSurface: "G9959/G10005",
    checks,
    failed: failed.map((c) => c.id),
    note: "Does not close Koa onion middleware runtime 20/20 — holes over façades (D6447); pass-through ceiling G9959",
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runKoaHonestySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok && report.token) console.log(report.token);
  if (report.ok && report.convertToken) console.log(report.convertToken);
  process.exit(report.ok ? 0 : 1);
}
