#!/usr/bin/env node
/**
 * G10133 — Elysia honesty prove (L1 cheap honest-hole peel).
 * Does **not** close Elysia as a full plugins/lifecycle/macros runtime 20/20.
 * Never invent plugins / non-empty lifecycle / macros / derive / guard (**D6447**).
 * Empty-lifecycle pass-through ceiling already known (G10053).
 *
 * Gate: hub:elysia-honesty-smoke
 * Token: ELYSIA_HONESTY_OK
 *
 * Proves:
 * - Expanded Elysia residual catalog exists with required hole shapes
 * - Catalog refuses force-close of Elysia plugins/lifecycle/macros runtime 20/20
 * - Existing Elysia ORIGIN gold (G10025/G10053) still peels
 * - Elysia gold does not invent plugins/macros/non-empty lifecycle
 * - No hub-gold-elysia-plugins façade fixture
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_ELYSIA_HONESTY_SMOKE_KIND = "chrysalis.hub.elysia-honesty-smoke";
export const HUB_ELYSIA_HONESTY_SMOKE_SCHEMA_VERSION = 1;
export const ELYSIA_HONESTY_OK = "ELYSIA_HONESTY_OK";
export const CONVERT_ELYSIA_HONESTY = "CONVERT_ELYSIA_HONESTY";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_REASONS = [
  "hub-js:elysia-plugins",
  "hub-js:elysia-lifecycle",
  "hub-js:elysia-macros",
  "hub-js:elysia-nested-route",
  "hub-js:elysia-derive",
  "hub-js:elysia-guard",
  "hub-js:elysia-websocket",
  "hub-js:elysia-schema",
];

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runElysiaHonestySmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const catalogPath = join(root, "fixtures/ci/elysia-honest-holes.json");
  let catalog = null;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    catalog = null;
  }
  const catalogOk =
    catalog?.kind === "chrysalis.hub.elysia-honest-holes" &&
    catalog?.decision === "honest-residual" &&
    catalog?.gate === "G10133" &&
    catalog?.token === ELYSIA_HONESTY_OK &&
    Array.isArray(catalog?.honestHoles) &&
    catalog.honestHoles.length >= 12;
  checks.push({
    id: "elysia-honesty-catalog",
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
    /Elysia/i.test(String(refuse?.claim || "")) &&
    /20\/20/.test(String(refuse?.claim || ""));
  checks.push({
    id: "refuse-force-close-elysia-runtime",
    ok: refuseOk,
    detail: refuseOk
      ? `claim=${refuse.claim}`
      : `refuseForceClose=${JSON.stringify(refuse)}`,
  });

  // Cross-link: js-secondary catalog still lists Elysia plugins/lifecycle as holes.
  const jsPath = join(root, "fixtures/ci/js-secondary-dialect-honest-holes.json");
  let jsCatalog = null;
  try {
    jsCatalog = JSON.parse(readFileSync(jsPath, "utf8"));
  } catch {
    jsCatalog = null;
  }
  const elysiaSec = jsCatalog?.dialects?.elysia;
  const jsHolesOk =
    Array.isArray(elysiaSec?.honestHoles) &&
    elysiaSec.honestHoles.some((h) =>
      /plugin|lifecycle|macro/i.test(String(h?.shape || "")),
    );
  checks.push({
    id: "js-secondary-elysia-not-plugin-runtime",
    ok: jsHolesOk,
    detail: jsHolesOk
      ? "js-secondary elysia lists plugins/lifecycle/macros; G10025/G10053 remain sole ORIGIN gold"
      : "js-secondary elysia missing plugins/lifecycle residual",
  });

  const goldApp = join(root, "fixtures/hub-gold-elysia/src/app.ts");
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
    !/\.use\s*\(/.test(code) &&
    !/\.macro\s*\(/.test(code) &&
    !/\.derive\s*\(/.test(code) &&
    !/\.guard\s*\(/.test(code) &&
    !/\.group\s*\(/.test(code) &&
    !/\.mount\s*\(/.test(code) &&
    !/\.ws\s*\(/.test(code) &&
    !/\bt\.Object\b/.test(code) &&
    !/\bType\.Object\b/.test(code) &&
    !/\.listen\s*\(/.test(code) &&
    !/\bnew\s+Elysia\s*\(\s*\{/.test(code);
  // Empty lifecycle shells allowed (G10053). Reject non-empty bodies.
  const lifecycleBodies = [
    ...code.matchAll(
      /\.(?:onRequest|onBeforeHandle|onAfterHandle|onError)\s*\(\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g,
    ),
  ];
  const complexLifecycle = lifecycleBodies.some((m) => {
    const body = String(m[1] || "").trim();
    return body.length > 0;
  });
  checks.push({
    id: "elysia-gold-no-plugin-lifecycle-invent",
    ok: noPluginInvent && !complexLifecycle,
    detail:
      noPluginInvent && !complexLifecycle
        ? "hub-gold-elysia has no .use/macro/derive/group/non-empty lifecycle invent"
        : "elysia gold missing or contains plugin/lifecycle invent",
  });

  const pluginGoldFaçade = existsSync(join(root, "fixtures/hub-gold-elysia-plugins"));
  checks.push({
    id: "no-elysia-plugins-runtime-gold-facade",
    ok: !pluginGoldFaçade,
    detail: pluginGoldFaçade
      ? "fixtures/hub-gold-elysia-plugins must not claim invented runtime"
      : "no Elysia plugins/lifecycle runtime gold façade",
  });

  // Prove peel that already exists (G10025/G10053) — do not invent plugin peel.
  const { runElysiaSmoke } = await import(
    pathToFileURL(join(root, "scripts/hub-ingest/hub-elysia-smoke.mjs")).href
  );
  const elysiaReport = await runElysiaSmoke();
  checks.push({
    id: "elysia-route-surface-green",
    ok: Boolean(elysiaReport?.ok),
    detail: elysiaReport?.ok
      ? `G10025/G10053 routeCount=${elysiaReport.routeCount} holeCount=${elysiaReport.holeCount ?? 0}`
      : `elysia smoke failed skip=${elysiaReport?.skip || "ok=false"}`,
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

  // This lane must never set EXTFMAP ABSENT as a side effect of Elysia honesty work.
  checks.push({
    id: "extfmap-untouched",
    ok: process.env.CHRYSALIS_EXTFMAP_ABSENT !== "1",
    detail:
      process.env.CHRYSALIS_EXTFMAP_ABSENT === "1"
        ? "CHRYSALIS_EXTFMAP_ABSENT=1 set — Elysia honesty must not attest ABSENT"
        : "EXTFMAP env not attested by this smoke",
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: HUB_ELYSIA_HONESTY_SMOKE_KIND,
    schemaVersion: HUB_ELYSIA_HONESTY_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? ELYSIA_HONESTY_OK : undefined,
    convertToken: ok ? CONVERT_ELYSIA_HONESTY : undefined,
    gate: "G10133",
    decision: "honest-residual",
    priorRouteSurface: "G10025/G10053",
    checks,
    failed: failed.map((c) => c.id),
    note: "Does not close Elysia plugins/lifecycle/macros runtime 20/20 — holes over façades (D6447); empty-lifecycle ceiling G10053",
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runElysiaHonestySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok && report.token) console.log(report.token);
  if (report.ok && report.convertToken) console.log(report.convertToken);
  process.exit(report.ok ? 0 : 1);
}
