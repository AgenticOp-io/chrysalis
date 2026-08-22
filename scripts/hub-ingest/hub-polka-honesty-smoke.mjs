#!/usr/bin/env node
/**
 * G10135 — Polka honesty prove (L1 cheap honest-hole peel).
 * Does **not** close Polka as a full plugins/onion middleware runtime 20/20.
 * Never invent plugins/sirv/body-parser / non-empty app.use / nested mounts (**D6447**).
 * Pass-through ceiling already known (G9959).
 *
 * Gate: hub:polka-honesty-smoke
 * Token: POLKA_HONESTY_OK
 *
 * Proves:
 * - Expanded Polka residual catalog exists with required hole shapes
 * - Catalog refuses force-close of Polka plugins/onion middleware runtime 20/20
 * - Existing Polka ORIGIN gold (G9958/G9959/G10005) still peels
 * - Polka gold does not invent plugins/complex middleware
 * - No hub-gold-polka-plugins façade fixture
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_POLKA_HONESTY_SMOKE_KIND = "chrysalis.hub.polka-honesty-smoke";
export const HUB_POLKA_HONESTY_SMOKE_SCHEMA_VERSION = 1;
export const POLKA_HONESTY_OK = "POLKA_HONESTY_OK";
export const CONVERT_POLKA_HONESTY = "CONVERT_POLKA_HONESTY";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_REASONS = [
  "hub-js:polka-middleware",
  "hub-js:polka-plugins",
  "hub-js:polka-named-handler",
  "hub-js:polka-stream",
  "hub-js:polka-nested-mount",
  "hub-js:polka-bootstrap",
  "hub-js:polka-send",
  "hub-js:polka-session",
];

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runPolkaHonestySmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const catalogPath = join(root, "fixtures/ci/polka-honest-holes.json");
  let catalog = null;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    catalog = null;
  }
  const catalogOk =
    catalog?.kind === "chrysalis.hub.polka-honest-holes" &&
    catalog?.decision === "honest-residual" &&
    catalog?.gate === "G10135" &&
    catalog?.token === POLKA_HONESTY_OK &&
    Array.isArray(catalog?.honestHoles) &&
    catalog.honestHoles.length >= 12;
  checks.push({
    id: "polka-honesty-catalog",
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
    /Polka/i.test(String(refuse?.claim || "")) &&
    /20\/20/.test(String(refuse?.claim || ""));
  checks.push({
    id: "refuse-force-close-polka-runtime",
    ok: refuseOk,
    detail: refuseOk
      ? `claim=${refuse.claim}`
      : `refuseForceClose=${JSON.stringify(refuse)}`,
  });

  // Cross-link: js-secondary catalog still lists Polka plugins/mw as holes.
  const jsPath = join(root, "fixtures/ci/js-secondary-dialect-honest-holes.json");
  let jsCatalog = null;
  try {
    jsCatalog = JSON.parse(readFileSync(jsPath, "utf8"));
  } catch {
    jsCatalog = null;
  }
  const polkaSec = jsCatalog?.dialects?.polka;
  const jsHolesOk =
    Array.isArray(polkaSec?.honestHoles) &&
    polkaSec.honestHoles.some((h) =>
      /plugin|middleware|mount|stream/i.test(String(h?.shape || "")),
    );
  checks.push({
    id: "js-secondary-polka-not-plugin-runtime",
    ok: jsHolesOk,
    detail: jsHolesOk
      ? "js-secondary polka lists plugins/mw/mount; G9958/G9959/G10005 remain sole ORIGIN gold"
      : "js-secondary polka missing plugins/mw residual",
  });

  const goldApp = join(root, "fixtures/hub-gold-polka/src/app.ts");
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
    !/\bsirv\b/.test(code) &&
    !/\bbody-parser\b/.test(code) &&
    !/\bbodyParser\b/.test(code) &&
    !/\bcompression\b/.test(code) &&
    !/\b@polka\/send\b/.test(code) &&
    !/\bpassport\b/.test(code) &&
    !/\bcookie\b/.test(code) &&
    !/\bsession\b/.test(code) &&
    !/\b\.listen\s*\(/.test(code) &&
    !/\bcreateServer\s*\(/.test(code) &&
    !/\bres\.write\s*\(/.test(code) &&
    !/\b\.pipe\s*\(/.test(code);
  // Empty/next-only app.use allowed (G9959). Reject non-empty mw bodies.
  const mwBodies = [
    ...code.matchAll(
      /app\.use\s*\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{([\s\S]*?)\}\s*\)/g,
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
    id: "polka-gold-no-plugin-mw-invent",
    ok: noPluginInvent && !complexMw,
    detail:
      noPluginInvent && !complexMw
        ? "hub-gold-polka has no plugins/sirv/complex app.use invent"
        : "polka gold missing or contains plugin/mw invent",
  });

  const pluginGoldFaçade = existsSync(join(root, "fixtures/hub-gold-polka-plugins"));
  checks.push({
    id: "no-polka-plugins-runtime-gold-facade",
    ok: !pluginGoldFaçade,
    detail: pluginGoldFaçade
      ? "fixtures/hub-gold-polka-plugins must not claim invented runtime"
      : "no Polka plugins/onion runtime gold façade",
  });

  // Prove peel that already exists (G9958/G9959/G10005) — do not invent plugin peel.
  const { runPolkaSmoke } = await import(
    pathToFileURL(join(root, "scripts/hub-ingest/hub-polka-smoke.mjs")).href
  );
  const polkaReport = await runPolkaSmoke();
  checks.push({
    id: "polka-route-surface-green",
    ok: Boolean(polkaReport?.ok),
    detail: polkaReport?.ok
      ? `G9958/G9959/G10005 routeCount=${polkaReport.routeCount} holeCount=${polkaReport.holeCount ?? 0}`
      : `polka smoke failed skip=${polkaReport?.skip || "ok=false"}`,
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

  // This lane must never set EXTFMAP ABSENT as a side effect of Polka honesty work.
  checks.push({
    id: "extfmap-untouched",
    ok: process.env.CHRYSALIS_EXTFMAP_ABSENT !== "1",
    detail:
      process.env.CHRYSALIS_EXTFMAP_ABSENT === "1"
        ? "CHRYSALIS_EXTFMAP_ABSENT=1 set — Polka honesty must not attest ABSENT"
        : "EXTFMAP env not attested by this smoke",
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: HUB_POLKA_HONESTY_SMOKE_KIND,
    schemaVersion: HUB_POLKA_HONESTY_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? POLKA_HONESTY_OK : undefined,
    convertToken: ok ? CONVERT_POLKA_HONESTY : undefined,
    gate: "G10135",
    decision: "honest-residual",
    priorRouteSurface: "G9958/G9959/G10005",
    checks,
    failed: failed.map((c) => c.id),
    note: "Does not close Polka plugins/onion middleware runtime 20/20 — holes over façades (D6447); pass-through ceiling G9959",
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runPolkaHonestySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok && report.token) console.log(report.token);
  if (report.ok && report.convertToken) console.log(report.convertToken);
  process.exit(report.ok ? 0 : 1);
}
