#!/usr/bin/env node
/**
 * G10136 — Nest DI honesty prove (L1 cheap honest-hole peel).
 * Does **not** close Nest as a full DI/modules/providers runtime 20/20.
 * Never invent @Module / providers / constructor DI / guards / NestFactory (**D6442** / **D6447**).
 *
 * Gate: hub:nestjs-honesty-smoke
 * Token: NEST_DI_HONESTY_OK
 *
 * Proves:
 * - Expanded Nest DI residual catalog exists with required hole shapes
 * - Catalog refuses force-close of Nest DI/modules/providers runtime 20/20
 * - Existing Nest route-surface gold (G9950/G10015) still peels
 * - Nest gold does not invent DI/modules/providers
 * - No hub-gold-nestjs-di façade fixture
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_NESTJS_HONESTY_SMOKE_KIND = "chrysalis.hub.nestjs-honesty-smoke";
export const HUB_NESTJS_HONESTY_SMOKE_SCHEMA_VERSION = 1;
export const NEST_DI_HONESTY_OK = "NEST_DI_HONESTY_OK";
export const CONVERT_NEST_DI_HONESTY = "CONVERT_NEST_DI_HONESTY";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_REASONS = [
  "hub-js:nest-di",
  "hub-js:nest-di-scope",
  "hub-js:nest-guards",
  "hub-js:nest-res-escape",
  "hub-js:nest-bootstrap",
  "hub-js:nest-dynamic-module",
  "hub-js:nest-middleware",
  "hub-js:nest-versioning",
];

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runNestjsHonestySmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const catalogPath = join(root, "fixtures/ci/nestjs-honest-holes.json");
  let catalog = null;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    catalog = null;
  }
  const catalogOk =
    catalog?.kind === "chrysalis.hub.nestjs-honest-holes" &&
    catalog?.decision === "honest-residual" &&
    catalog?.gate === "G10136" &&
    catalog?.token === NEST_DI_HONESTY_OK &&
    Array.isArray(catalog?.honestHoles) &&
    catalog.honestHoles.length >= 12;
  checks.push({
    id: "nestjs-honesty-catalog",
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
    /Nest\s*DI/i.test(String(refuse?.claim || "")) &&
    /20\/20/.test(String(refuse?.claim || ""));
  checks.push({
    id: "refuse-force-close-nest-di-runtime",
    ok: refuseOk,
    detail: refuseOk
      ? `claim=${refuse.claim}`
      : `refuseForceClose=${JSON.stringify(refuse)}`,
  });

  // Cross-link: js-secondary catalog still lists Nest DI/guards as holes.
  const jsPath = join(root, "fixtures/ci/js-secondary-dialect-honest-holes.json");
  let jsCatalog = null;
  try {
    jsCatalog = JSON.parse(readFileSync(jsPath, "utf8"));
  } catch {
    jsCatalog = null;
  }
  const nestSec = jsCatalog?.dialects?.nestjs;
  const jsHolesOk =
    Array.isArray(nestSec?.honestHoles) &&
    nestSec.honestHoles.some((h) =>
      /DI|providers|guards|Module|bootstrap/i.test(String(h?.shape || "")),
    );
  checks.push({
    id: "js-secondary-nestjs-not-di-runtime",
    ok: jsHolesOk,
    detail: jsHolesOk
      ? "js-secondary nestjs lists DI/providers/guards; G9950/G10015 remain sole route-surface gold"
      : "js-secondary nestjs missing DI/guards residual",
  });

  const goldApp = join(root, "fixtures/hub-gold-nestjs/src/app.ts");
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
  const noDiInvent =
    existsSync(goldApp) &&
    !/@Module\b/.test(code) &&
    !/@Injectable\b/.test(code) &&
    !/@Inject\b/.test(code) &&
    !/\bproviders\s*:/.test(code) &&
    !/\bNestFactory\b/.test(code) &&
    !/@UseGuards\b/.test(code) &&
    !/@UseInterceptors\b/.test(code) &&
    !/@UsePipes\b/.test(code) &&
    !/@UseFilters\b/.test(code) &&
    !/@Res\s*\(/.test(code) &&
    !/@Next\s*\(/.test(code) &&
    !/\bMiddlewareConsumer\b/.test(code) &&
    !/\bforRoot\s*\(/.test(code) &&
    !/\bforFeature\s*\(/.test(code) &&
    !/\bTestingModule\b/.test(code);
  checks.push({
    id: "nestjs-gold-no-di-invent",
    ok: noDiInvent,
    detail: noDiInvent
      ? "hub-gold-nestjs has no @Module/providers/NestFactory/guards invent"
      : "nestjs gold missing or contains DI/modules/providers invent",
  });

  const diGoldFaçade = existsSync(join(root, "fixtures/hub-gold-nestjs-di"));
  checks.push({
    id: "no-nestjs-di-runtime-gold-facade",
    ok: !diGoldFaçade,
    detail: diGoldFaçade
      ? "fixtures/hub-gold-nestjs-di must not claim invented DI runtime"
      : "no Nest DI/modules/providers runtime gold façade",
  });

  // Prove peel that already exists (G9950/G10015) — do not invent DI peel.
  const { runNestjsSmoke } = await import(
    pathToFileURL(join(root, "scripts/hub-ingest/hub-nestjs-smoke.mjs")).href
  );
  const nestReport = await runNestjsSmoke();
  checks.push({
    id: "nestjs-route-surface-green",
    ok: Boolean(nestReport?.ok),
    detail: nestReport?.ok
      ? `G9950/G10015 routeCount=${nestReport.routeCount} holeCount=${nestReport.holeCount ?? 0}`
      : `nestjs smoke failed skip=${nestReport?.skip || "ok=false"}`,
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

  // This lane must never set EXTFMAP ABSENT as a side effect of Nest DI honesty work.
  checks.push({
    id: "extfmap-untouched",
    ok: process.env.CHRYSALIS_EXTFMAP_ABSENT !== "1",
    detail:
      process.env.CHRYSALIS_EXTFMAP_ABSENT === "1"
        ? "CHRYSALIS_EXTFMAP_ABSENT=1 set — Nest DI honesty must not attest ABSENT"
        : "EXTFMAP env not attested by this smoke",
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: HUB_NESTJS_HONESTY_SMOKE_KIND,
    schemaVersion: HUB_NESTJS_HONESTY_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? NEST_DI_HONESTY_OK : undefined,
    convertToken: ok ? CONVERT_NEST_DI_HONESTY : undefined,
    gate: "G10136",
    decision: "honest-residual",
    priorRouteSurface: "G9950/G10015",
    checks,
    failed: failed.map((c) => c.id),
    note: "Does not close Nest DI/modules/providers runtime 20/20 — holes over façades (D6442/D6447)",
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runNestjsHonestySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok && report.token) console.log(report.token);
  if (report.ok && report.convertToken) console.log(report.convertToken);
  process.exit(report.ok ? 0 : 1);
}
