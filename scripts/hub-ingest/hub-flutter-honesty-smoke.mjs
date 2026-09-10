#!/usr/bin/env node
/**
 * G10129 — Flutter honesty prove (dual-primary language track).
 * Does **not** close Flutter as a full runtime 20/20. Never invent
 * Flutter / engine / widget / Dart Frog runtime (**D6447**).
 *
 * Gate: hub:flutter-honesty-smoke
 * Token: FLUTTER_HONESTY_OK
 *
 * Proves:
 * - Expanded Flutter residual catalog exists with required hole shapes
 * - Catalog refuses force-close of Flutter runtime 20/20
 * - Existing Dart Shelf route-surface gold (G9956/G10007) still peels
 * - Shelf gold does not invent Flutter/runApp/Material
 * - No hub-gold-flutter façade fixture
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HUB_FLUTTER_HONESTY_SMOKE_KIND =
  "chrysalis.hub.flutter-honesty-smoke";
export const HUB_FLUTTER_HONESTY_SMOKE_SCHEMA_VERSION = 1;
export const FLUTTER_HONESTY_OK = "FLUTTER_HONESTY_OK";
export const CONVERT_FLUTTER_HONESTY = "CONVERT_FLUTTER_HONESTY";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_REASONS = [
  "hub-dart:flutter-app",
  "hub-dart:flutter-widget",
  "hub-dart:flutter-build",
  "hub-dart:flutter-material",
  "hub-dart:flutter-engine",
  "hub-dart:dart-frog",
];

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runFlutterHonestySmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const catalogPath = join(root, "fixtures/ci/flutter-honest-holes.json");
  let catalog = null;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    catalog = null;
  }
  const catalogOk =
    catalog?.kind === "chrysalis.hub.flutter-honest-holes" &&
    catalog?.decision === "honest-residual" &&
    catalog?.gate === "G10129" &&
    catalog?.token === FLUTTER_HONESTY_OK &&
    Array.isArray(catalog?.honestHoles) &&
    catalog.honestHoles.length >= 10;
  checks.push({
    id: "flutter-catalog",
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
    /Flutter/i.test(String(refuse?.claim || "")) &&
    /20\/20/.test(String(refuse?.claim || ""));
  checks.push({
    id: "refuse-force-close-flutter-runtime",
    ok: refuseOk,
    detail: refuseOk
      ? `claim=${refuse.claim}`
      : `refuseForceClose=${JSON.stringify(refuse)}`,
  });

  // Cross-link: Shelf remains the only closed Dart route-surface; Flutter listed as hole.
  const shelfHolesPath = join(root, "fixtures/ci/dart-shelf-honest-holes.json");
  let shelfHoles = null;
  try {
    shelfHoles = JSON.parse(readFileSync(shelfHolesPath, "utf8"));
  } catch {
    shelfHoles = null;
  }
  const shelfHolesOk =
    shelfHoles?.kind === "chrysalis.hub.dart-shelf-honest-holes" &&
    (shelfHoles?.honestHoles || []).some((h) =>
      /Flutter/i.test(String(h?.shape || "")),
    );
  checks.push({
    id: "shelf-route-surface-not-flutter",
    ok: shelfHolesOk,
    detail: shelfHolesOk
      ? "dart-shelf honest holes list Flutter; Shelf remains sole Dart ST"
      : "dart-shelf-honest-holes missing Flutter hole",
  });

  const goldDart = join(root, "fixtures/hub-gold-dart-shelf/lib/hub_gold.dart");
  let dartSrc = "";
  try {
    dartSrc = readFileSync(goldDart, "utf8");
  } catch {
    dartSrc = "";
  }
  // Strip // comments so honesty docs in gold do not false-positive invent checks.
  const dartCode = dartSrc
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
  const noFlutterInvent =
    existsSync(goldDart) &&
    !/\bpackage:flutter\b/.test(dartCode) &&
    !/\brunApp\s*\(/.test(dartCode) &&
    !/\b(StatelessWidget|StatefulWidget|MaterialApp|CupertinoApp)\b/.test(
      dartCode,
    ) &&
    !/\bpackage:dart_frog\b/.test(dartCode);
  checks.push({
    id: "shelf-gold-no-flutter-invent",
    ok: noFlutterInvent,
    detail: noFlutterInvent
      ? "hub-gold-dart-shelf has no Flutter/Frog invent (code)"
      : "shelf gold missing or contains Flutter/runApp/Material/Frog code",
  });

  const flutterGoldFaçade = existsSync(join(root, "fixtures/hub-gold-flutter"));
  checks.push({
    id: "no-flutter-runtime-gold-facade",
    ok: !flutterGoldFaçade,
    detail: flutterGoldFaçade
      ? "fixtures/hub-gold-flutter must not claim invented runtime"
      : "no Flutter runtime gold façade",
  });

  // Prove peel that already exists (Shelf) — do not invent Flutter peel.
  const { runDartSmoke } = await import(
    pathToFileURL(join(root, "scripts/hub-ingest/hub-dart-smoke.mjs")).href
  );
  const dartReport = await runDartSmoke();
  checks.push({
    id: "dart-shelf-route-surface-green",
    ok: Boolean(dartReport?.ok),
    detail: dartReport?.ok
      ? `G9954/G10007 routeCount=${dartReport.routeCount} holeCount=${dartReport.holeCount}`
      : `dart smoke failed skip=${dartReport?.skip || "ok=false"}`,
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

  // This lane must never set EXTFMAP ABSENT as a side effect of Flutter work.
  checks.push({
    id: "extfmap-untouched",
    ok: process.env.CHRYSALIS_EXTFMAP_ABSENT !== "1",
    detail:
      process.env.CHRYSALIS_EXTFMAP_ABSENT === "1"
        ? "CHRYSALIS_EXTFMAP_ABSENT=1 set — Flutter honesty must not attest ABSENT"
        : "EXTFMAP env not attested by this smoke",
  });

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: HUB_FLUTTER_HONESTY_SMOKE_KIND,
    schemaVersion: HUB_FLUTTER_HONESTY_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? FLUTTER_HONESTY_OK : undefined,
    convertToken: ok ? CONVERT_FLUTTER_HONESTY : undefined,
    gate: "G10129",
    decision: "honest-residual",
    priorRouteSurface: "G9956",
    checks,
    failed: failed.map((c) => c.id),
    note: "Does not close Flutter runtime 20/20 — holes over façades (D6447)",
    generatedAt: new Date().toISOString(),
  };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = await runFlutterHonestySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok && report.token) console.log(report.token);
  if (report.ok && report.convertToken) console.log(report.convertToken);
  process.exit(report.ok ? 0 : 1);
}
