#!/usr/bin/env node
/**
 * Gold gate: hub literal-only lift must be hole-free and emit target framework.
 * Usage:
 *   node scripts/hub-ingest/hub-gold-verify.mjs
 *   node scripts/hub-ingest/hub-gold-verify.mjs --suite js-literal-hono
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { HUB_GOLD_SUITES, resolveGoldSuites } from "./hub-gold-manifest.mjs";
import { isHubNativeGoldEmitTarget, runNativeGoldEmit } from "./hub-gold-native-emit.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const emitTsScript = join(scriptRoot, "scripts/hub-ingest/emit-from-hub.mjs");
const emitCwlScript = join(scriptRoot, "scripts/hub-ingest/emit-cwl-from-hub.mjs");

function parseArgs(argv) {
  let suiteId = null;
  let fixture = null;
  let origin = "javascript";
  let emitTarget = "hono";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--suite" && argv[i + 1]) suiteId = argv[++i];
    else if (argv[i] === "--fixture" && argv[i + 1]) fixture = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--target" && argv[i + 1]) emitTarget = argv[++i];
  }
  return { suiteId, fixture, origin, emitTarget };
}

/**
 * @param {string} fixture
 * @param {string} origin
 * @param {import('./hub-gold-manifest.mjs').HubGoldEmitTarget} emitTarget
 */
function runEmit(fixture, origin, emitTarget) {
  if (emitTarget === "cwl") {
    return spawnSync(process.execPath, [emitCwlScript, fixture, "--origin", origin], {
      cwd: scriptRoot,
      encoding: "utf8",
    });
  }
  if (isHubNativeGoldEmitTarget(emitTarget)) {
    return runNativeGoldEmit(fixture, origin, emitTarget);
  }
  return spawnSync(process.execPath, [emitTsScript, fixture, "--origin", origin, "--target", emitTarget], {
    cwd: scriptRoot,
    encoding: "utf8",
  });
}

/**
 * @param {{ fixture: string, origin: string, emitTarget: import('./hub-gold-manifest.mjs').HubGoldEmitTarget, id?: string, roundTrip?: boolean }} suite
 */
export async function runGoldVerifySuite(suite) {
  const fixture = suite.fixture;
  const origin = suite.origin;
  const emitTarget = suite.emitTarget;

  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", origin], {
    cwd: scriptRoot,
    encoding: "utf8",
  });
  if (lift.status !== 0) {
    return { ok: false, reason: "lift-failed", stderr: lift.stderr, stdout: lift.stdout };
  }
  const liftReport = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");
  if ((liftReport.holeCount ?? 1) !== 0) {
    return { ok: false, reason: "lift-holes", liftReport };
  }

  const webir = await import(pathToFileURL(join(scriptRoot, "packages/webir/dist/index.js")).href);
  const raw = JSON.parse(await readFile(join(fixture, ".chrysalis", `hub.${origin}.webir.json`), "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const footprint = webir.computeOracleFootprint(mod);
  if (footprint.totalHoleCount !== 0) {
    return { ok: false, reason: "footprint-holes", footprint };
  }

  const emit = runEmit(fixture, origin, emitTarget);
  if (emit.status !== 0) {
    return { ok: false, reason: "emit-failed", stderr: emit.stderr, stdout: emit.stdout };
  }
  const emitReport = JSON.parse(emit.stdout.trim().split("\n").pop() ?? "{}");
  if ((emitReport.holeCount ?? 0) !== 0) {
    return { ok: false, reason: "emit-holes", emitReport };
  }

  let roundTrip = null;
  if (suite.roundTrip && emitTarget === "cwl") {
    const roundDir = join(fixture, "generated", "cwl");
    const lift2 = spawnSync(process.execPath, [liftScript, roundDir, "--language", "cwl"], {
      cwd: scriptRoot,
      encoding: "utf8",
    });
    if (lift2.status !== 0) {
      return { ok: false, reason: "roundtrip-lift-failed", stderr: lift2.stderr };
    }
    const lift2Report = JSON.parse(lift2.stdout.trim().split("\n").pop() ?? "{}");
    if ((lift2Report.holeCount ?? 1) !== 0) {
      return { ok: false, reason: "roundtrip-lift-holes", lift2Report };
    }
    if ((lift2Report.routeCount ?? 0) !== (liftReport.routeCount ?? 0)) {
      return {
        ok: false,
        reason: "roundtrip-route-mismatch",
        before: liftReport.routeCount,
        after: lift2Report.routeCount,
      };
    }
    roundTrip = lift2Report;
  }

  return {
    ok: true,
    id: suite.id,
    fixture,
    origin,
    output: emitTarget,
    lift: liftReport,
    footprint,
    emit: emitReport,
    roundTrip,
  };
}

async function main() {
  const { suiteId, fixture, origin, emitTarget } = parseArgs(process.argv);
  const suites = fixture
    ? [{ id: "custom", fixture, origin, emitTarget, structural: true, traceReplay: false }]
    : resolveGoldSuites(suiteId ?? undefined);

  const results = [];
  for (const suite of suites) {
    if (!suite.structural) continue;
    const r = await runGoldVerifySuite(suite);
    results.push(r);
    if (!r.ok) {
      console.error(JSON.stringify({ kind: "chrysalis.hub.gold-verify", ok: false, results }, null, 2));
      process.exit(1);
    }
  }

  console.log(
    JSON.stringify(
      {
        kind: "chrysalis.hub.gold-verify",
        schemaVersion: 1,
        ok: true,
        suiteCount: results.length,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
