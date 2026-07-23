#!/usr/bin/env node
/**
 * COBOL best-fit + pattern-lift depth prove.
 * - Lane: hub-pattern-lift
 * - PROCEDURE paragraph routes (structured multi-paragraph)
 * - Honest holes for CALL/ACCEPT/DISPLAY
 * - Gold verify → java/csharp/python/go (+ hono)
 * - Hono trace-replay on structured + middleware
 *
 * Gate: hub:cobol-best-fit-smoke
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { resolveGoldSuites } from "./hub-gold-manifest.mjs";
import { ingestLaneForOrigin } from "./hub-translation-paths.mjs";
import { parseCobolRoutes, cobolBodyAfter, cobolUnresolvedOps } from "./cobol-pattern-lift.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const LIFT = join(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");

/** Best commercial depth targets for COBOL lift → WebIR → native emit. */
const BEST_FIT_TARGETS = ["java", "csharp", "python", "go"];
/** Web control emit (not a mainframe replacement target). */
const CONTROL_TARGETS = ["hono"];

const STRUCTURED = join(ROOT, "fixtures/hub-gold-cobol-structured");
const HOLES = join(ROOT, "fixtures/hub-gold-cobol-holes");

/**
 * @param {string} emitTarget
 * @returns {string[]}
 */
function suiteIdsFor(emitTarget) {
  return [`cobol-structured-${emitTarget}-full`, `cobol-middleware-${emitTarget}-full`];
}

/**
 * @param {string} fixture
 * @param {string} language
 */
function runLift(fixture, language) {
  const r = spawnSync(process.execPath, [LIFT, fixture, "--language", language], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const text = (r.stdout || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const report = start >= 0 && end > start ? JSON.parse(text.slice(start, end + 1)) : {};
  return { status: r.status ?? 1, report, stderr: r.stderr || "" };
}

export async function runCobolBestFitSmoke() {
  const progress = createSmokeProgress("cobol-best-fit");
  const t0 = progress.start("COBOL pattern-lift best-fit prove");

  /** @type {Array<{ id: string, ok: boolean, reason?: string, detail?: unknown }>} */
  const results = [];

  const lane = ingestLaneForOrigin("cobol");
  results.push({
    id: "lane-hub-pattern-lift",
    ok: lane === "hub-pattern-lift",
    reason: lane === "hub-pattern-lift" ? undefined : `lane=${lane}`,
  });

  const hubCob = join(STRUCTURED, "hub.cob");
  const hubSrc = existsSync(hubCob) ? readFileSync(hubCob, "utf8") : "";
  const paraRoutes = parseCobolRoutes(hubSrc);
  const paraOk =
    paraRoutes.some((r) => r.method === "GET" && r.path === "/health") &&
    paraRoutes.some((r) => r.method === "GET" && r.path === "/meta");
  results.push({
    id: "procedure-paragraph-routes",
    ok: paraOk,
    reason: paraOk ? undefined : "missing /health+/meta paragraphs",
    detail: paraRoutes,
  });

  const structuredLift = runLift(STRUCTURED, "cobol");
  const sReport = structuredLift.report;
  const structuredOk =
    structuredLift.status === 0 &&
    (sReport.astRouteCount ?? 0) >= 2 &&
    (sReport.holeCount ?? 1) === 0;
  results.push({
    id: "structured-pattern-lift",
    ok: structuredOk,
    reason: structuredOk
      ? undefined
      : `status=${structuredLift.status} routes=${sReport.astRouteCount} holes=${sReport.holeCount}`,
    detail: {
      routeCount: sReport.routeCount,
      astRouteCount: sReport.astRouteCount,
      holeCount: sReport.holeCount,
    },
  });

  const holeLift = runLift(HOLES, "cobol");
  const hReport = holeLift.report;
  const holeSrc = existsSync(join(HOLES, "legacy-call.cob"))
    ? readFileSync(join(HOLES, "legacy-call.cob"), "utf8")
    : "";
  const unresolved = cobolUnresolvedOps(holeSrc);
  const bodyNull = cobolBodyAfter(holeSrc, 0) === null;
  const holesOk =
    holeLift.status === 0 &&
    (hReport.holeCount ?? 0) > 0 &&
    bodyNull &&
    unresolved.includes("call") &&
    unresolved.includes("accept") &&
    unresolved.includes("display");
  results.push({
    id: "honest-holes-call-accept-display",
    ok: holesOk,
    reason: holesOk
      ? undefined
      : `holes=${hReport.holeCount} unresolved=${unresolved.join(",")} bodyNull=${bodyNull}`,
    detail: { holeCount: hReport.holeCount, unresolved },
  });

  const targets = [...BEST_FIT_TARGETS, ...CONTROL_TARGETS];
  for (const emitTarget of targets) {
    for (const id of suiteIdsFor(emitTarget)) {
      const suites = resolveGoldSuites(id);
      if (!suites.length) {
        results.push({ id, ok: false, reason: "suite-missing" });
        continue;
      }
      const r = await runGoldVerifySuite(suites[0]);
      results.push({
        id,
        ok: r.ok === true,
        reason: r.ok === true ? undefined : r.reason ?? "verify-failed",
      });
    }
  }

  for (const id of ["cobol-structured-hono-full", "cobol-middleware-hono-full"]) {
    const suites = resolveGoldSuites(id);
    if (!suites.length) {
      results.push({ id: `trace:${id}`, ok: false, reason: "suite-missing" });
      continue;
    }
    try {
      const r = await runTraceReplaySuite(suites[0]);
      results.push({
        id: `trace:${id}`,
        ok: r.ok === true || r.skipped === true,
        reason:
          r.ok === true || r.skipped === true
            ? r.skipped
              ? `skipped:${r.reason ?? "toolchain"}`
              : undefined
            : r.reason ?? "trace-failed",
        detail: { skipped: r.skipped === true, correctness: r.correctness },
      });
    } catch (e) {
      results.push({
        id: `trace:${id}`,
        ok: false,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  const ok = failed.length === 0;
  progress.end("COBOL pattern-lift best-fit prove", ok, t0);

  return {
    kind: "chrysalis.hub.cobol-best-fit-smoke",
    schemaVersion: 2,
    ok,
    lane,
    bestFitTargets: BEST_FIT_TARGETS,
    controlTargets: CONTROL_TARGETS,
    suiteCount: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: failed.slice(0, 30),
    results,
    note:
      "COBOL pattern-lift depth: PROCEDURE paragraphs + honest CALL/ACCEPT/DISPLAY holes + best-fit emit/trace",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCobolBestFitSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cobol-best-fit-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
