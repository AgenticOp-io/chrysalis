#!/usr/bin/env node
/**
 * Prove svelte/WISP origin → all 24 hub emit targets.
 *
 * Primary bar: gold-verify every svelte structured + middleware `-full` suite (48).
 * Secondary: lift real WISP `routes.cwl` as CWL and emit to each of the 24 targets
 * (emitOk + routeCount>0; holeCount reported — full corpus may retain holes).
 *
 *   node scripts/hub-ingest/hub-wisp-multi-target-prove-smoke.mjs
 *   node scripts/hub-ingest/hub-wisp-multi-target-prove-smoke.mjs --skip-wisp-emit
 *   node scripts/hub-ingest/hub-wisp-multi-target-prove-smoke.mjs --gold-only
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { isHubNativeGoldEmitTarget, runNativeGoldEmit } from "./hub-gold-native-emit.mjs";
import { isHubAssetGoldEmitTarget, runAssetGoldEmit } from "./hub-gold-asset-emit.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_MULTI_TARGET_PROVE_KIND = "chrysalis.hub.wisp-multi-target-prove-smoke";
export const WISP_MULTI_TARGET_PROVE_SCHEMA_VERSION = 1;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REPORT = join(ROOT, "reports/wisp/wisp-multi-target-prove.json");
const WISP_FIXTURE = join(ROOT, "fixtures/hub-wisp-management");
const liftScript = join(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
const emitTsScript = join(ROOT, "scripts/hub-ingest/emit-from-hub.mjs");
const emitNextjsScript = join(ROOT, "scripts/hub-ingest/emit-nextjs-from-hub.mjs");
const emitCwlScript = join(ROOT, "scripts/hub-ingest/emit-cwl-from-hub.mjs");

const EMIT_TARGETS = [
  "c",
  "cpp",
  "csharp",
  "css",
  "cwl",
  "fastify",
  "go",
  "hono",
  "html",
  "java",
  "json",
  "kotlin",
  "markdown",
  "nextjs",
  "php",
  "python",
  "ruby",
  "rust",
  "scala",
  "scss",
  "sql",
  "swift",
  "vue",
  "yaml",
];

function parseArgs(argv) {
  /** @type {Record<string, unknown>} */
  const o = {};
  for (const a of argv) {
    if (a === "--skip-wisp-emit" || a === "--gold-only") o.skipWispEmit = true;
  }
  return o;
}

function svelteFullSuites() {
  return HUB_GOLD_SUITES.filter(
    (s) =>
      s.origin === "svelte" &&
      s.traceReplay &&
      (s.id.includes("-structured-") || s.id.includes("-middleware-")) &&
      s.id.endsWith("-full"),
  );
}

function verifySuite(id) {
  const r = spawnSync(process.execPath, ["scripts/hub-ingest/hub-gold-verify.mjs", "--suite", id], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const oks = [...out.matchAll(/"ok":\s*(true|false)/g)].map((m) => m[1]);
  const passed = r.status === 0 && oks.length > 0 && oks[oks.length - 1] === "true";
  const reason = out.match(/"reason":\s*"([^"]+)"/)?.[1] ?? null;
  const hole = out.match(/"holeCount":\s*(\d+)/)?.[1];
  return {
    id,
    ok: passed,
    reason,
    status: r.status,
    holeCount: hole != null ? Number(hole) : null,
  };
}

/**
 * @param {string} fixture
 * @param {string} origin
 * @param {string} emitTarget
 */
function runEmit(fixture, origin, emitTarget) {
  if (emitTarget === "cwl") {
    return spawnSync(process.execPath, [emitCwlScript, fixture, "--origin", origin], {
      cwd: ROOT,
      encoding: "utf8",
    });
  }
  if (emitTarget === "nextjs") {
    return spawnSync(process.execPath, [emitNextjsScript, fixture, "--origin", origin], {
      cwd: ROOT,
      encoding: "utf8",
    });
  }
  if (isHubNativeGoldEmitTarget(emitTarget)) {
    return runNativeGoldEmit(fixture, origin, emitTarget);
  }
  if (isHubAssetGoldEmitTarget(emitTarget)) {
    return runAssetGoldEmit(fixture, origin, emitTarget);
  }
  return spawnSync(process.execPath, [emitTsScript, fixture, "--origin", origin, "--target", emitTarget], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function parseEmitReport(stdout) {
  const text = stdout ?? "";
  /** @type {Record<string, unknown>[]} */
  const objs = [];
  // Prefer whole-stdout JSON objects (pretty or compact).
  const re = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let m;
  while ((m = re.exec(text))) {
    try {
      objs.push(JSON.parse(m[0]));
    } catch {
      /* skip */
    }
  }
  // Fallback: last non-empty line
  if (objs.length === 0) {
    try {
      objs.push(JSON.parse(text.trim().split(/\r?\n/).pop() ?? "{}"));
    } catch {
      return {};
    }
  }
  let best = objs[0] ?? {};
  for (const j of objs) {
    const routes = Number(j.routeCount ?? j.handlerCount ?? 0);
    const bestRoutes = Number(best.routeCount ?? best.handlerCount ?? 0);
    if (routes > bestRoutes) best = j;
  }
  // Regex fallback when pretty-print nesting defeats shallow JSON match
  if (Number(best.routeCount ?? best.handlerCount ?? 0) === 0) {
    const hc = text.match(/"handlerCount"\s*:\s*(\d+)/);
    const rc = text.match(/"routeCount"\s*:\s*(\d+)/);
    if (hc || rc) {
      best = {
        ...best,
        handlerCount: hc ? Number(hc[1]) : best.handlerCount,
        routeCount: rc ? Number(rc[1]) : best.routeCount,
      };
    }
  }
  return best;
}

/**
 * Emit real WISP CWL corpus to each target (secondary evidence).
 */
function runWispCwlOutboundEmits() {
  if (!existsSync(join(WISP_FIXTURE, "routes.cwl"))) {
    return { ok: false, skip: "missing-wisp-routes-cwl", results: [] };
  }
  const lift = spawnSync(process.execPath, [liftScript, WISP_FIXTURE, "--language", "cwl"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (lift.status !== 0) {
    return {
      ok: false,
      skip: "wisp-cwl-lift-failed",
      stderr: (lift.stderr || "").slice(-800),
      results: [],
    };
  }

  /** @type {object[]} */
  const results = [];
  for (const target of EMIT_TARGETS) {
    const emitR = runEmit(WISP_FIXTURE, "cwl", target);
    const report = parseEmitReport(emitR.stdout);
    const routeCount = Number(report.routeCount ?? report.handlerCount ?? 0);
    const holeCount = report.holeCount != null ? Number(report.holeCount) : null;
    // Secondary: emit must succeed and produce routes; holes allowed on full WISP corpus.
    const ok = emitR.status === 0 && routeCount > 0;
    results.push({
      target,
      ok,
      status: emitR.status,
      routeCount,
      holeCount,
      reason: ok ? null : emitR.status !== 0 ? "emit-failed" : "no-routes",
    });
  }
  return {
    ok: results.every((r) => r.ok),
    passCount: results.filter((r) => r.ok).length,
    failCount: results.filter((r) => !r.ok).length,
    results,
    note: "Full WISP CWL outbound — emitOk+routes required; holeCount may be >0 (not ST bar)",
  };
}

/**
 * @param {object} [opts]
 */
export async function runWispMultiTargetProveSmoke(opts = {}) {
  const progress = createSmokeProgress("wisp-multi-target-prove");
  const t0 = progress.start("WISP multi-target prove");

  const suites = svelteFullSuites();
  const goldResults = suites.map((s) => {
    const row = verifySuite(s.id);
    return { ...row, emitTarget: s.emitTarget };
  });
  const goldFails = goldResults.filter((r) => !r.ok);
  const goldOk = goldFails.length === 0 && suites.length >= EMIT_TARGETS.length * 2;

  const targetsCovered = [...new Set(goldResults.filter((r) => r.ok).map((r) => r.emitTarget))].sort();
  const missingTargets = EMIT_TARGETS.filter((t) => !targetsCovered.includes(t));

  /** @type {object | null} */
  let wispEmit = null;
  if (!opts.skipWispEmit) {
    wispEmit = runWispCwlOutboundEmits();
  } else {
    wispEmit = { ok: true, skip: "skip-wisp-emit", results: [] };
  }

  // Gate: gold bar (svelte origin cells) + real WISP CWL outbound emit (unless skipped).
  const wispEmitOk = opts.skipWispEmit ? true : wispEmit?.ok === true;
  const ok = goldOk && missingTargets.length === 0 && wispEmitOk;

  progress.end("WISP multi-target prove", ok, t0);

  const report = {
    kind: WISP_MULTI_TARGET_PROVE_KIND,
    schemaVersion: WISP_MULTI_TARGET_PROVE_SCHEMA_VERSION,
    ok,
    goldOk,
    targetCount: EMIT_TARGETS.length,
    targets: EMIT_TARGETS,
    targetsCovered,
    missingTargets,
    goldSuiteCount: suites.length,
    goldPassCount: goldResults.filter((r) => r.ok).length,
    goldFailCount: goldFails.length,
    goldFails: goldFails.slice(0, 40),
    wispEmit,
    note: ok
      ? "Svelte/WISP origin proved to all 24 hub emit targets (structured+middleware gold)"
      : "Gold-verify failed for one or more svelte→target pairs",
    generatedAt: new Date().toISOString(),
    reportPath: REPORT,
  };

  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const r = await runWispMultiTargetProveSmoke(args);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exitCode = 1;
}

if (process.argv[1]?.includes("hub-wisp-multi-target-prove-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
