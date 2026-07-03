#!/usr/bin/env node
/** Phase 41d — Native emit gold composite (G8740). */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { exportPhpHubWebir } from "./hub-php-hub-webir.mjs";
import { runNativeGoldEmit, isHubNativeGoldEmitTarget } from "./hub-gold-native-emit.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runWptpGoldSmoke } from "./hub-wptp-gold-smoke.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { runPhpPythonOracleProductGate } from "./hub-php-python-oracle-product-smoke.mjs";
import { runPhpJavaOracleProductGate } from "./hub-php-java-oracle-product-smoke.mjs";
import { runPhpGoOracleProductGate } from "./hub-php-go-oracle-product-smoke.mjs";
import { runPhpRubyOracleProductGate } from "./hub-php-ruby-oracle-product-smoke.mjs";
import { runPhpCsharpOracleProductGate } from "./hub-php-csharp-oracle-product-smoke.mjs";
import { runNativeOracleProductGate } from "./hub-native-oracle-product-smoke.mjs";
import { runExpressNativeOracleProductGate } from "./hub-express-native-oracle-product-smoke.mjs";
import { runPythonCrossNativeOracleProductGate } from "./hub-python-cross-native-oracle-product-smoke.mjs";
import { runJavaCrossNativeOracleProductGate } from "./hub-java-cross-native-oracle-product-smoke.mjs";
import { runGoCrossNativeOracleProductGate } from "./hub-go-cross-native-oracle-product-smoke.mjs";
import { runRubyCrossNativeOracleProductGate } from "./hub-ruby-cross-native-oracle-product-smoke.mjs";
import { runCsharpCrossNativeOracleProductGate } from "./hub-csharp-cross-native-oracle-product-smoke.mjs";
import { runTypescriptCrossNativeOracleProductGate } from "./hub-typescript-cross-native-oracle-product-smoke.mjs";
import { runJavascriptOracleProductGate } from "./hub-javascript-oracle-product-smoke.mjs";

export const PHASE41D_NATIVE_EMIT_SMOKE_KIND = "chrysalis.phase41d-native-emit-smoke";
export const PHASE41D_NATIVE_EMIT_SMOKE_SCHEMA_VERSION = 14;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const phpFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

const PHP_NATIVE_TARGETS = ["python", "java", "go", "ruby", "csharp"];

const NATIVE_LITERAL_SUITES = [
  "python-native-python",
  "java-native-java",
  "go-native-go",
  "ruby-native-ruby",
  "csharp-native-csharp",
];

/** G8741 — PHP WebIR → native emit hole-free on flagship subset. */
export async function runPhpNativeEmitG8741Gate() {
  const phpExport = await exportPhpHubWebir(phpFixture);
  if (phpExport.skip || !phpExport.ok) {
    return { ok: false, skip: phpExport.skip ?? "php-export-failed", phpExport };
  }
  const targets = {};
  let allOk = true;
  for (const target of PHP_NATIVE_TARGETS) {
    if (!isHubNativeGoldEmitTarget(target)) {
      targets[target] = { ok: false, skip: "not-native-target" };
      allOk = false;
      continue;
    }
    const emit = runNativeGoldEmit(phpFixture, "php", target);
    const emitOk = emit.status === 0;
    let routeCount = 0;
    let holeCount = 0;
    if (emitOk) {
      try {
        const report = JSON.parse(emit.stdout.trim().split("\n").pop() ?? "{}");
        holeCount = report.holeCount ?? 0;
        routeCount = report.routeCount ?? 0;
      } catch {
        holeCount = 1;
      }
    }
    targets[target] = {
      ok: emitOk && routeCount > 0 && holeCount === 0,
      holeCount,
      routeCount,
      holeFree: holeCount === 0,
    };
    if (!targets[target].ok) allOk = false;
  }
  return { ok: allOk, targets, phpRouteCount: phpExport.routeCount ?? 0 };
}

/** G8742 — all core native literal suites structural gold. */
export async function runNativeLiteralGoldG8742Gate() {
  const { HUB_GOLD_SUITES } = await import("./hub-gold-manifest.mjs");
  const suites = HUB_GOLD_SUITES.filter((s) => NATIVE_LITERAL_SUITES.includes(s.id));
  const results = {};
  let allOk = true;
  for (const suite of suites) {
    const r = await runGoldVerifySuite(suite);
    results[suite.id] = { ok: r.ok === true };
    if (!r.ok) allOk = false;
  }
  return { ok: allOk, suites: results };
}

/** G8743 — WPTP contract path (skip-ok when matrix sibling absent). */
export function runWptpContractG8743Gate() {
  const wptp = runWptpGoldSmoke();
  if (wptp.skip) {
    return { ok: true, skipped: true, reason: wptp.skip };
  }
  return { ok: wptp.ok === true, skipped: false };
}

export async function runPhase41dNativeEmitGate() {
  const g8741 = await runPhpNativeEmitG8741Gate();
  const g8742 = await runNativeLiteralGoldG8742Gate();
  const g8743 = runWptpContractG8743Gate();
  const g8763 = await runPhpPythonOracleProductGate();
  const g8764 = await runPhpJavaOracleProductGate();
  const g8765 = await runPhpGoOracleProductGate();
  const g8766 = await runPhpRubyOracleProductGate();
  const g8767 = await runPhpCsharpOracleProductGate();
  const g8768 = await runNativeOracleProductGate();
  const g8769 = await runExpressNativeOracleProductGate();
  const g8770 = await runPythonCrossNativeOracleProductGate();
  const g8771 = await runJavaCrossNativeOracleProductGate();
  const g8772 = await runGoCrossNativeOracleProductGate();
  const g8773 = await runRubyCrossNativeOracleProductGate();
  const g8774 = await runCsharpCrossNativeOracleProductGate();
  const g8775 = await runTypescriptCrossNativeOracleProductGate();
  const g8776 = await runJavascriptOracleProductGate();
  const matrixProgress = runFullMatrixOracleProgressGate();
  const g8765Ok = g8765.ok === true || g8765.skip === "go-not-on-path";
  const g8766Ok = g8766.ok === true || g8766.skip === "ruby-not-on-path";
  const g8767Ok = g8767.ok === true || g8767.skip === "dotnet-not-on-path";
  const g8768Ok = g8768.ok === true;
  const g8769Ok = g8769.ok === true;
  const g8770Ok = g8770.ok === true;
  const g8771Ok = g8771.ok === true;
  const g8772Ok = g8772.ok === true;
  const g8773Ok = g8773.ok === true;
  const g8774Ok = g8774.ok === true;
  const g8775Ok = g8775.ok === true;
  const g8776Ok = g8776.ok === true;
  const ok =
    g8741.ok === true &&
    g8742.ok === true &&
    g8743.ok === true &&
    g8763.ok === true &&
    g8764.ok === true &&
    g8765Ok &&
    g8766Ok &&
    g8767Ok &&
    g8768Ok &&
    g8769Ok &&
    g8770Ok &&
    g8771Ok &&
    g8772Ok &&
    g8773Ok &&
    g8774Ok &&
    g8775Ok &&
    g8776Ok &&
    matrixProgress.ok === true;
  return {
    kind: PHASE41D_NATIVE_EMIT_SMOKE_KIND,
    schemaVersion: PHASE41D_NATIVE_EMIT_SMOKE_SCHEMA_VERSION,
    ok,
    phpNativeEmit: { ok: g8741.ok === true, gate: "G8741", ...g8741 },
    nativeLiteralGold: { ok: g8742.ok === true, gate: "G8742", ...g8742 },
    wptpContract: { ok: g8743.ok === true, gate: "G8743", ...g8743 },
    phpPythonOracleProduct: { ok: g8763.ok === true, gate: "G8763", ...g8763 },
    phpJavaOracleProduct: { ok: g8764.ok === true, gate: "G8764", ...g8764 },
    phpGoOracleProduct: { ok: g8765Ok, gate: "G8765", ...g8765 },
    phpRubyOracleProduct: { ok: g8766Ok, gate: "G8766", ...g8766 },
    phpCsharpOracleProduct: { ok: g8767Ok, gate: "G8767", ...g8767 },
    nativeOracleProduct: { ok: g8768Ok, gate: "G8768", ...g8768 },
    expressNativeOracleProduct: { ok: g8769Ok, gate: "G8769", ...g8769 },
    pythonCrossNativeOracleProduct: { ok: g8770Ok, gate: "G8770", ...g8770 },
    javaCrossNativeOracleProduct: { ok: g8771Ok, gate: "G8771", ...g8771 },
    goCrossNativeOracleProduct: { ok: g8772Ok, gate: "G8772", ...g8772 },
    rubyCrossNativeOracleProduct: { ok: g8773Ok, gate: "G8773", ...g8773 },
    csharpCrossNativeOracleProduct: { ok: g8774Ok, gate: "G8774", ...g8774 },
    typescriptCrossNativeOracleProduct: { ok: g8775Ok, gate: "G8775", ...g8775 },
    javascriptOracleProduct: { ok: g8776Ok, gate: "G8776", ...g8776 },
    matrixProgress: {
      ok: matrixProgress.ok === true,
      gate: "G8701",
      programComplete: matrixProgress.programComplete,
      belowTarget: matrixProgress.belowTarget,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase41dNativeEmitSmoke() {
  const progress = createSmokeProgress("phase41d-native-emit");
  const t0 = progress.start("Phase 41d native emit gold");
  const gate = await runPhase41dNativeEmitGate();
  progress.end("Phase 41d native emit gold", gate.ok === true, t0);
  return { kind: PHASE41D_NATIVE_EMIT_SMOKE_KIND, schemaVersion: PHASE41D_NATIVE_EMIT_SMOKE_SCHEMA_VERSION, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase41dNativeEmitSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase41d-native-emit-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
