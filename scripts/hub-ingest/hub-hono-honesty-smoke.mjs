#!/usr/bin/env node
/**
 * G10131 — Hono honesty prove (L1 cheap honest-hole peel).
 * Does **not** close Hono as a full middleware/RPC/JSX runtime 20/20.
 * Never invent complex onion / createMiddleware / RPC / JSX (**D6447**).
 * Pass-through ceiling already known (G10044).
 *
 * Gate: hub:hono-honesty-smoke
 * Token: HONO_HONESTY_OK
 *
 * Proves:
 * - Expanded Hono residual catalog exists with required hole shapes
 * - Catalog refuses force-close of Hono middleware/RPC/JSX runtime 20/20
 * - Existing Hono ORIGIN gold (G10019/G10044) still peels
 * - Hono gold does not invent complex middleware/RPC/JSX
 * - No hub-gold-hono-middleware façade fixture
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_HONO_HONESTY_SMOKE_KIND = "chrysalis.hub.hono-honesty-smoke";
export const HUB_HONO_HONESTY_SMOKE_SCHEMA_VERSION = 1;
export const HONO_HONESTY_OK = "HONO_HONESTY_OK";
export const CONVERT_HONO_HONESTY = "CONVERT_HONO_HONESTY";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_REASONS = [
  "hub-js:hono-middleware",
  "hub-js:hono-create-middleware",
  "hub-js:hono-nested-route",
  "hub-js:hono-jsx",
  "hub-js:hono-rpc",
  "hub-js:hono-validator",
  "hub-js:hono-websocket",
  "hub-js:hono-context-vars",
];

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runHonoHonestySmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const catalogPath = join(root, "fixtures/ci/hono-honest-holes.json");
  let catalog = null;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    catalog = null;
  }
  const catalogOk =
    catalog?.kind === "chrysalis.hub.hono-honest-holes" &&
    catalog?.decision === "honest-residual" &&
    catalog?.gate === "G10131" &&
    catalog?.token === HONO_HONESTY_OK &&
    Array.isArray(catalog?.honestHoles) &&
    catalog.honestHoles.length >= 12;
  checks.push({
    id: "hono-honesty-catalog",
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
    /Hono/i.test(String(refuse?.claim || "")) &&
    /20\/20/.test(String(refuse?.claim || ""));
  checks.push({
    id: "refuse-force-close-hono-runtime",
    ok: refuseOk,
    detail: refuseOk
      ? `claim=${refuse.claim}`
      : `refuseForceClose=${JSON.stringify(refuse)}`,
  });

  // Cross-link: js-secondary catalog still lists Hono complex mw as holes.
  const jsPath = join(root, "fixtures/ci/js-secondary-dialect-honest-holes.json");
  let jsCatalog = null;
  try {
    jsCatalog = JSON.parse(readFileSync(jsPath, "utf8"));
  } catch {
    jsCatalog = null;
  }
  const honoSec = jsCatalog?.dialects?.hono;
  const jsHolesOk =
    Array.isArray(honoSec?.honestHoles) &&
    honoSec.honestHoles.some((h) =>
      /middleware|nested|ResponseInit/i.test(String(h?.shape || "")),
    );
  checks.push({
    id: "js-secondary-hono-not-onion",
    ok: jsHolesOk,
    detail: jsHolesOk
      ? "js-secondary hono lists complex mw/nested/ResponseInit; G10019/G10044 remain sole ORIGIN gold"
      : "js-secondary hono missing complex mw/nested residual",
  });

  const goldApp = join(root, "fixtures/hub-gold-hono/src/app.ts");
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
    !/\bcreateMiddleware\b/.test(code) &&
    !/\bcreateFactory\b/.test(code) &&
    !/\bzValidator\b/.test(code) &&
    !/\bvalidator\s*\(/.test(code) &&
    !/\bupgradeWebSocket\b/.test(code) &&
    !/\bhc\s*\(/.test(code) &&
    !/\bfrom\s+["']hono\/jsx["']/.test(code) &&
    !/\bhtml\s*\(/.test(code) &&
    !/\bapp\.route\s*\(/.test(code) &&
    !/\bapp\.basePath\s*\(/.test(code) &&
    !/\bapp\.mount\s*\(/.test(code) &&
    !/\bcors\s*\(/.test(code) &&
    !/\blogger\s*\(/.test(code) &&
    !/\bjwt\s*\(/.test(code);
  // Empty/next-only app.use is allowed (G10044). Reject non-empty mw bodies.
  const useBodies = [...code.matchAll(/app\.use\s*\(\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g)];
  const complexUse = useBodies.some((m) => {
    const body = String(m[1] || "")
      .replace(/\bawait\s+next\s*\(\s*\)\s*;?/g, "")
      .replace(/\breturn\s+next\s*\(\s*\)\s*;?/g, "")
      .replace(/\bnext\s*\(\s*\)\s*;?/g, "")
      .trim();
    return body.length > 0;
  });
  checks.push({
    id: "hono-gold-no-onion-rpc-jsx-invent",
    ok: noOnionInvent && !complexUse,
    detail:
      noOnionInvent && !complexUse
        ? "hub-gold-hono has no createMiddleware/RPC/JSX/complex use invent"
        : "hono gold missing or contains onion/RPC/JSX invent",
  });

  const mwGoldFaçade = existsSync(join(root, "fixtures/hub-gold-hono-middleware"));
  checks.push({
    id: "no-hono-middleware-runtime-gold-facade",
    ok: !mwGoldFaçade,
    detail: mwGoldFaçade
      ? "fixtures/hub-gold-hono-middleware must not claim invented runtime"
      : "no Hono middleware/RPC runtime gold façade",
  });

  // Prove peel that already exists (G10019/G10044) — do not invent onion peel.
  const { runHonoSmoke } = await import(
    pathToFileURL(join(root, "scripts/hub-ingest/hub-hono-smoke.mjs")).href
  );
  const honoReport = await runHonoSmoke();
  checks.push({
    id: "hono-route-surface-green",
    ok: Boolean(honoReport?.ok),
    detail: honoReport?.ok
      ? `G10019/G10044 routeCount=${honoReport.routeCount} holeCount=${honoReport.holeCount ?? 0}`
      : `hono smoke failed skip=${honoReport?.skip || "ok=false"}`,
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

  // This lane must never set EXTFMAP ABSENT as a side effect of Hono honesty work.
  checks.push({
    id: "extfmap-untouched",
    ok: process.env.CHRYSALIS_EXTFMAP_ABSENT !== "1",
    detail:
      process.env.CHRYSALIS_EXTFMAP_ABSENT === "1"
        ? "CHRYSALIS_EXTFMAP_ABSENT=1 set — Hono honesty must not attest ABSENT"
        : "EXTFMAP env not attested by this smoke",
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: HUB_HONO_HONESTY_SMOKE_KIND,
    schemaVersion: HUB_HONO_HONESTY_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? HONO_HONESTY_OK : undefined,
    convertToken: ok ? CONVERT_HONO_HONESTY : undefined,
    gate: "G10131",
    decision: "honest-residual",
    priorRouteSurface: "G10019/G10044",
    checks,
    failed: failed.map((c) => c.id),
    note: "Does not close Hono middleware/RPC/JSX runtime 20/20 — holes over façades (D6447); pass-through ceiling G10044",
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runHonoHonestySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok && report.token) console.log(report.token);
  if (report.ok && report.convertToken) console.log(report.convertToken);
  process.exit(report.ok ? 0 : 1);
}
