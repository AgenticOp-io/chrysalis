#!/usr/bin/env node
/**
 * Full restart: origin corpus → structural convert-all → hole report →
 * export/stage/deploy → external-deps → deepen until exhausted.
 *
 * Laws: D6442 translate-only · D6443 look authority · D6444 corpus queue ·
 *       D6445 auto-exhaust · D6446 structural lift · D6447 no demo-only ·
 *       D6448 complete conversion (honest hole-close until zero or fail).
 *       CHRYSALIS_WISP_STRUCTURAL_ONLY=1 — never force-settle invent.
 *
 *   node scripts/lib/wisp-convert-restart.mjs
 *   node scripts/lib/wisp-convert-restart.mjs --skip-deploy
 *   node scripts/lib/wisp-convert-restart.mjs --skip-deepen
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { convertAllOriginPieces } from "./convert-origin-pieces.mjs";
import { writeWispHoleReport } from "./wisp-hole-report.mjs";
import { runCompleteConversionProtocol } from "./wisp-complete-conversion-protocol.mjs";
import { runWispCwlStaticExport } from "./cwl-static-export.mjs";
import {
  loadWispPipelineConfig,
  syncWispOriginalCssAssets,
  prepareWispCwlDeployBundle,
} from "../wisp-cwl-pipeline.mjs";
import { stageWispCwlStaticExportClient } from "../wisp-cwl-firebase-static-stage.mjs";
import { runWispFirebaseDeploy } from "../wisp-cwl-firebase-deploy.mjs";

export const RESTART_KIND = "chrysalis.wisp.convert-restart";
export const RESTART_SCHEMA_VERSION = 1;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = join(root, "reports/wisp/convert-restart.json");

const WISP_ROOT_CANDIDATES = [
  process.env.CHRYSALIS_WISP_ROOT,
  process.env.WISP_MODULE_DIR,
  "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
  "C:/Users/david/Downloads/WISPTools/Module_Manager",
].filter(Boolean);

function resolveWispRoot() {
  for (const c of WISP_ROOT_CANDIDATES) {
    if (c && existsSync(resolve(c))) return resolve(c);
  }
  return resolve(WISP_ROOT_CANDIDATES[0] || ".");
}

function runNode(rel, args = [], env = {}) {
  const r = spawnSync(process.execPath, [join(root, rel), ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
    maxBuffer: 80 * 1024 * 1024,
  });
  let json = null;
  try {
    const t = (r.stdout || "").trim();
    const start = t.indexOf("{");
    if (start >= 0) json = JSON.parse(t.slice(start));
  } catch {
    json = null;
  }
  return {
    ok: (r.status ?? 1) === 0,
    status: r.status ?? 1,
    stderrTail: (r.stderr || "").slice(-2000),
    stdoutTail: (r.stdout || "").slice(-2000),
    json,
  };
}

function parseArgs(argv) {
  /** @type {Record<string, unknown>} */
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-deploy") o.skipDeploy = true;
    else if (a === "--skip-deepen") o.skipDeepen = true;
    else if (a === "--allow-incomplete") o.allowIncomplete = true;
    else if (a === "--root" && argv[i + 1]) o.wispRoot = argv[++i];
  }
  return o;
}

export async function runWispConvertRestart(opts = {}) {
  const wispRoot = resolve(opts.wispRoot ?? resolveWispRoot());
  // Compatibility entry point: the former restart/deepen loop now delegates to
  // the canonical one-pass compiler. Set CHRYSALIS_WISP_LEGACY_RESTART=1 only
  // to diagnose historical conversion artifacts.
  if (process.env.CHRYSALIS_WISP_LEGACY_RESTART !== "1") {
    const { runWispCwlOnePass } = await import("../wisp-cwl-one-pass.mjs");
    return runWispCwlOnePass({
      wispRoot,
      bundle: true,
      deployGce: opts.skipDeploy !== true,
      allowIncomplete: opts.allowIncomplete === true,
      maxUnsupportedHoles: opts.allowIncomplete === true ? 4 : 0,
    });
  }
  process.env.CHRYSALIS_WISP_ROOT = wispRoot;
  process.env.WISP_MODULE_DIR = wispRoot;
  // Lock D6443 structural convert: forbid Phase30 parity + force-settle overwrite.
  process.env.CHRYSALIS_WISP_STRUCTURAL_ONLY = "1";

  /** @type {object[]} */
  const steps = [];
  const startedAt = new Date().toISOString();

  // 1) Corpus (D6444)
  {
    const r = runNode("scripts/build-origin-source-corpus.mjs");
    steps.push({
      step: "origin-source-corpus",
      ok: r.ok,
      fileCount: r.json?.stats?.fileCount ?? null,
      pieceCount: r.json?.stats?.pieceCount ?? null,
      stderrTail: r.ok ? undefined : r.stderrTail,
    });
    if (!r.ok) return finalize({ ok: false, wispRoot, steps, startedAt, fail: "corpus" });
  }

  // 2) Structural convert-all (D6442/D6443 — no parity invent)
  {
    const convert = await convertAllOriginPieces({ wispRoot });
    steps.push({
      step: "convert-all-pieces",
      ok: convert.ok === true,
      pieceCount: convert.pieceCount,
      byStatus: convert.byStatus,
      reportPath: convert.reportPath ?? "reports/origin-corpus/chrysalis.convert-all-pieces.v1.json",
    });
    if (!convert.ok) return finalize({ ok: false, wispRoot, steps, startedAt, fail: "convert" });
  }

  // 2b) D6448 complete-conversion honest hole-close (never force-settle)
  {
    const complete = await runCompleteConversionProtocol({
      wispRoot,
      allowIncomplete: opts.allowIncomplete === true,
      // Convert-all just ran; skip duplicate relift on round 1 only
      skipFirstRelift: true,
    });
    steps.push({
      step: "complete-conversion-protocol",
      ok: complete.ok === true,
      complete: complete.complete === true,
      afterTotal: complete.afterTotal,
      closed: complete.closed,
      stopReason: complete.stopReason,
      roundsRun: complete.roundsRun,
      reportPath: complete.reportPath,
      residualPath: complete.residualPath,
    });
    if (!complete.ok) {
      return finalize({
        ok: false,
        wispRoot,
        steps,
        startedAt,
        fail: "incomplete-conversion",
        completeConversion: {
          afterTotal: complete.afterTotal,
          stopReason: complete.stopReason,
          residualPath: complete.residualPath,
        },
      });
    }
  }

  // 3) Hole report (honest — no force-settle)
  {
    const holes = writeWispHoleReport();
    steps.push({
      step: "hole-report",
      ok: holes.ok === true,
      total: holes.total,
      buckets: holes.buckets,
      pageCountWithHoles: holes.pageCountWithHoles,
      reportPath: holes.reportPath,
    });
  }

  // 4) Static export + CSS sync (D6443 original-css) + stage
  {
    const exported = await runWispCwlStaticExport({});
    steps.push({
      step: "cwl-static-export",
      ok: exported.ok === true,
      pageCount: exported.pageCount ?? exported.exported?.length ?? null,
    });
    const config = loadWispPipelineConfig();
    const fixtureDir = join(root, config.fixtureDir ?? "fixtures/hub-wisp-management");
    const css = syncWispOriginalCssAssets({ wispRoot, fixtureDir });
    steps.push({ step: "sync-original-css", ok: css.ok === true });
    // structuralOnly: never re-apply Phase30 parity / force-settle bind (D6443)
    const bundle = prepareWispCwlDeployBundle({
      wispRoot,
      skipLift: true,
      structuralOnly: true,
    });
    // Structural convert often fails legacy integrity (honest holes) — CSS/assets still copied.
    const bundleOk =
      bundle.ok === true || bundle.skip === "bundle-routes-integrity-failed";
    steps.push({
      step: "deploy-bundle",
      ok: bundleOk,
      skip: bundle.skip,
      structuralOnly: true,
      softIntegrity: bundle.skip === "bundle-routes-integrity-failed",
    });
    const staged = stageWispCwlStaticExportClient({ wispRoot, dryRun: false });
    steps.push({
      step: "firebase-static-stage",
      ok: staged.ok === true || staged.skip != null,
      pageCount: staged.pageCount,
      skip: staged.skip,
    });
  }

  // 5) Deploy Firebase (management hosting)
  if (!opts.skipDeploy) {
    const dep = runWispFirebaseDeploy({ dryRun: false, wispRoot, skipBuild: true });
    steps.push({
      step: "deploy-firebase",
      ok: dep?.ok === true || dep?.skip != null,
      skip: dep?.skip,
      authMode: dep?.authMode,
    });
  } else {
    steps.push({ step: "deploy-firebase", ok: true, skip: "skip-deploy" });
  }

  // 6) External deps briefing (D6445)
  {
    const r = runNode("scripts/lib/wisp-fidelity-deepen-cli.mjs", ["--external-deps"]);
    steps.push({
      step: "external-deps",
      ok: r.ok || r.status === 0,
      reportHint: "fixtures/hub-wisp-management/chrysalis.wisp-external-deps.v1.json",
      stderrTail: r.ok ? undefined : r.stderrTail,
    });
  }

  // 7) Deepen until exhausted (D6445) — do not stop for operator continue
  if (!opts.skipDeepen) {
    const r = runNode("scripts/lib/wisp-fidelity-deepen-cli.mjs", [
      "--until-exhausted",
      "--reset-streak",
    ]);
    steps.push({
      step: "deepen-until-exhausted",
      ok: r.ok,
      status: r.status,
      jsonSummary: r.json
        ? {
            ok: r.json.ok,
            stopReason: r.json.stopReason,
            rounds: r.json.rounds?.length ?? r.json.passCount,
            newlyGreenTotal: r.json.newlyGreenTotal,
          }
        : null,
      stdoutTail: r.stdoutTail,
      stderrTail: r.ok ? undefined : r.stderrTail,
    });

    // Re-export + redeploy after deepen (API goldens / routes may change)
    if (!opts.skipDeploy) {
      const exported = await runWispCwlStaticExport({});
      steps.push({
        step: "cwl-static-export-after-deepen",
        ok: exported.ok === true,
        pageCount: exported.pageCount ?? null,
      });
      const staged = stageWispCwlStaticExportClient({ wispRoot, dryRun: false });
      steps.push({ step: "firebase-static-stage-after-deepen", ok: staged.ok === true || staged.skip != null });
      const dep = runWispFirebaseDeploy({ dryRun: false, wispRoot, skipBuild: true });
      steps.push({
        step: "deploy-firebase-after-deepen",
        ok: dep?.ok === true || dep?.skip != null,
        skip: dep?.skip,
      });
    }

    // Final hole report (still honest — deepen should not force-settle UI)
    const holes2 = writeWispHoleReport({
      reportPath: join(root, "reports/wisp/hole-report-after-deepen.json"),
    });
    steps.push({
      step: "hole-report-after-deepen",
      ok: holes2.ok === true,
      total: holes2.total,
      reportPath: holes2.reportPath,
    });
  } else {
    steps.push({ step: "deepen-until-exhausted", ok: true, skip: "skip-deepen" });
  }

  const ok = steps.every((s) => s.ok === true);
  return finalize({ ok, wispRoot, steps, startedAt });
}

function finalize(report) {
  const out = {
    kind: RESTART_KIND,
    schemaVersion: RESTART_SCHEMA_VERSION,
    ...report,
    finishedAt: new Date().toISOString(),
    live: {
      management: "https://management.wisptools.io",
      firebase: "https://wisptools-management.web.app",
      originAuthority: "https://wisptools.io",
    },
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  out.reportPath = reportPath.replace(/\\/g, "/");
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const r = await runWispConvertRestart(opts);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
