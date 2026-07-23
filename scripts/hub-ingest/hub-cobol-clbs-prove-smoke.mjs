#!/usr/bin/env node
/**
 * CLBS-aligned COBOL modernization prove (LegacyCodeBench-shaped 3-track score).
 *
 * Tracks: Structural Completeness 30% · Documentation Quality 20% · Behavioral Fidelity 50%
 * Corpus guide: https://github.com/sentientsergio/COBOL-Legacy-Benchmark-Suite
 * Gate: hub:cobol-clbs-prove-smoke
 *
 * Env:
 *   CHRYSALIS_COBOL_CLBS_ROOT — optional local CLBS clone (inventory extra files)
 *   CHRYSALIS_COBOL_COBC — optional path to cobc (GnuCOBOL)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { inventoryCobolSource, parseCobolRoutes } from "./cobol-pattern-lift.mjs";
import { resolveHubPython } from "./shared.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MINI = join(ROOT, "fixtures/hub-cobol-clbs-mini");
const ONLINE = join(MINI, "online/INQONLN.cbl");
const BATCH = join(MINI, "batch/CLBSMATH.cbl");
const EXPECTED = join(MINI, "batch/expected.txt");
const REF_PY = join(MINI, "batch/reference_emit.py");

const W_STRUCT = 30;
const W_DOCS = 20;
const W_BEHAV = 50;

/**
 * @param {string} dir
 * @param {string[]} exts
 * @returns {string[]}
 */
function walkCobolFiles(dir, exts = [".cbl", ".cob", ".cpy"]) {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) break;
    for (const name of readdirSync(cur)) {
      const p = join(cur, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (name === ".git" || name === "node_modules") continue;
        stack.push(p);
      } else if (exts.some((e) => name.toLowerCase().endsWith(e))) {
        out.push(p);
      }
    }
  }
  return out.sort();
}

function resolveCobc() {
  if (process.env.CHRYSALIS_COBOL_COBC) return process.env.CHRYSALIS_COBOL_COBC;
  for (const cmd of ["cobc", "cobcrun"]) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
    if (r.status === 0 || (r.stdout || r.stderr || "").toLowerCase().includes("cobol")) {
      return cmd === "cobcrun" ? "cobc" : cmd;
    }
  }
  return null;
}

/**
 * @param {ReturnType<typeof inventoryCobolSource>} inv
 */
function structuralScore(inv) {
  let pts = 0;
  const max = 10;
  if (inv.programIds.length > 0) pts += 2;
  if (inv.routeCount >= 1) pts += 2;
  if (inv.copybooks.length > 0) pts += 1;
  if (inv.execCics > 0) pts += 1;
  if (inv.performs.length > 0) pts += 1;
  if (inv.evaluateWhens.length > 0) pts += 1;
  if (inv.unresolved.includes("exec-cics") || inv.unresolved.includes("copy")) pts += 1;
  if (inv.hasIdentificationHeader) pts += 1;
  return { pts, max, ratio: pts / max, weighted: (pts / max) * W_STRUCT };
}

/**
 * @param {ReturnType<typeof inventoryCobolSource>} inv
 */
function docsScore(inv) {
  let pts = 0;
  const max = 5;
  if (inv.hasIdentificationHeader) pts += 1;
  if (inv.commentLines >= 3) pts += 2;
  if (inv.commentRatio >= 0.05) pts += 1;
  if (inv.totalLines >= 20) pts += 1;
  return { pts, max, ratio: pts / max, weighted: (pts / max) * W_DOCS };
}

/**
 * @returns {{ ok: boolean, skipped?: boolean, reason?: string, cobolOut?: string, pyOut?: string, expected?: string }}
 */
function runBehavioralParallel() {
  const expected = readFileSync(EXPECTED, "utf8").trim();
  const py = resolveHubPython();
  const pyRun = spawnSync(py, [REF_PY], { cwd: ROOT, encoding: "utf8" });
  const pyOut = (pyRun.stdout || "").trim();
  if (pyRun.status !== 0 || pyOut !== expected) {
    return {
      ok: false,
      reason: `reference-python-mismatch status=${pyRun.status} out=${JSON.stringify(pyOut)} expected=${JSON.stringify(expected)}`,
      pyOut,
      expected,
    };
  }

  const cobc = resolveCobc();
  if (!cobc) {
    return {
      ok: true,
      skipped: true,
      reason: "no-gnucobol-cobc",
      pyOut,
      expected,
    };
  }

  const outDir = join(MINI, "batch", ".chrysalis-cobc");
  mkdirSync(outDir, { recursive: true });
  const exe = join(outDir, process.platform === "win32" ? "CLBSMATH.exe" : "CLBSMATH");
  const compile = spawnSync(cobc, ["-x", "-free", "-o", exe, BATCH], {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (compile.status !== 0 || !existsSync(exe)) {
    return {
      ok: false,
      reason: `cobc-compile-failed: ${(compile.stderr || compile.stdout || "").slice(0, 400)}`,
      pyOut,
      expected,
    };
  }

  const run = spawnSync(exe, [], { cwd: outDir, encoding: "utf8" });
  const cobolOut = (run.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop() ?? "";
  if (run.status !== 0) {
    return {
      ok: false,
      reason: `cobol-run-failed: ${(run.stderr || run.stdout || "").slice(0, 400)}`,
      cobolOut,
      pyOut,
      expected,
    };
  }

  const match = cobolOut === expected && pyOut === expected;
  return {
    ok: match,
    reason: match ? undefined : `byte-mismatch cobol=${JSON.stringify(cobolOut)} py=${JSON.stringify(pyOut)} expected=${JSON.stringify(expected)}`,
    cobolOut,
    pyOut,
    expected,
  };
}

export async function runCobolClbsProveSmoke() {
  const progress = createSmokeProgress("cobol-clbs-prove");
  const t0 = progress.start("CLBS COBOL modernization prove");

  const onlineSrc = readFileSync(ONLINE, "utf8");
  const batchSrc = readFileSync(BATCH, "utf8");
  const onlineInv = inventoryCobolSource(onlineSrc, "online/INQONLN.cbl");
  const batchInv = inventoryCobolSource(batchSrc, "batch/CLBSMATH.cbl");
  const onlineRoutes = parseCobolRoutes(onlineSrc);

  const struct = structuralScore(onlineInv);
  const docs = docsScore(onlineInv);

  const behavioral = runBehavioralParallel();
  const behavWeighted = behavioral.skipped
    ? null
    : behavioral.ok
      ? W_BEHAV
      : 0;
  const behavRatio = behavioral.skipped ? null : behavioral.ok ? 1 : 0;

  const scoredTracks = W_STRUCT + W_DOCS + (behavioral.skipped ? 0 : W_BEHAV);
  const earned =
    struct.weighted + docs.weighted + (behavWeighted === null ? 0 : behavWeighted);
  const overall = scoredTracks > 0 ? (earned / scoredTracks) * 100 : 0;

  /** @type {Array<{ id: string, ok: boolean, reason?: string }>} */
  const checks = [];

  checks.push({
    id: "online-clbs-shape",
    ok:
      onlineInv.programIds.includes("INQONLN") &&
      onlineInv.execCics > 0 &&
      onlineInv.copybooks.length > 0 &&
      onlineInv.performs.length > 0 &&
      onlineRoutes.length >= 3,
    reason:
      onlineRoutes.length >= 3
        ? undefined
        : `routes=${onlineRoutes.length} cics=${onlineInv.execCics} copy=${onlineInv.copybooks.join(",")}`,
  });

  checks.push({
    id: "batch-math-shape",
    ok: batchInv.programIds.includes("CLBSMATH") && batchInv.computes >= 1,
    reason: batchInv.computes >= 1 ? undefined : "missing COMPUTE",
  });

  checks.push({
    id: "structural-floor",
    ok: struct.ratio >= 0.6,
    reason: struct.ratio >= 0.6 ? undefined : `structRatio=${struct.ratio.toFixed(2)}`,
  });

  checks.push({
    id: "docs-floor",
    ok: docs.ratio >= 0.4,
    reason: docs.ratio >= 0.4 ? undefined : `docsRatio=${docs.ratio.toFixed(2)}`,
  });

  checks.push({
    id: "behavioral-track",
    ok: behavioral.ok === true,
    reason: behavioral.reason,
  });

  const clbsRoot = process.env.CHRYSALIS_COBOL_CLBS_ROOT
    ? resolve(process.env.CHRYSALIS_COBOL_CLBS_ROOT)
    : null;
  let clbsInventory = null;
  if (clbsRoot && existsSync(clbsRoot)) {
    const files = walkCobolFiles(join(clbsRoot, "src")).slice(0, 80);
    const sample = files.slice(0, 12).map((f) => {
      const src = readFileSync(f, "utf8");
      return inventoryCobolSource(src, f.replace(clbsRoot, "").replace(/^[\\/]/, ""));
    });
    clbsInventory = {
      root: clbsRoot,
      fileCount: files.length,
      sampleCount: sample.length,
      sampleProgramIds: sample.flatMap((s) => s.programIds).slice(0, 40),
      sampleCopybooks: [...new Set(sample.flatMap((s) => s.copybooks))].slice(0, 40),
      sampleExecCics: sample.reduce((n, s) => n + s.execCics, 0),
      sampleExecSql: sample.reduce((n, s) => n + s.execSql, 0),
    };
    checks.push({
      id: "clbs-root-inventory",
      ok: files.length > 0,
      reason: files.length > 0 ? undefined : "empty-clbs-src",
    });
  } else {
    checks.push({
      id: "clbs-root-inventory",
      ok: true,
      reason: "skipped-no-CHRYSALIS_COBOL_CLBS_ROOT",
    });
  }

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  progress.end("CLBS COBOL modernization prove", ok, t0);

  const report = {
    kind: "chrysalis.hub.cobol-clbs-prove-smoke",
    schemaVersion: 1,
    ok,
    northStar: {
      corpus: "https://github.com/sentientsergio/COBOL-Legacy-Benchmark-Suite",
      frameworks: ["LegacyCodeBench", "Legacy-Bench", "LegacyBridge/Azure-Legacy-Agents"],
      strategy: ["gnucobol-local", "direct-translate-small", "parallel-execution"],
      doc: "docs/COBOL-MODERNIZATION-PROVE.md",
    },
    scores: {
      structuralCompleteness: {
        weight: W_STRUCT,
        ...struct,
      },
      documentationQuality: {
        weight: W_DOCS,
        ...docs,
      },
      behavioralFidelity: {
        weight: W_BEHAV,
        skipped: behavioral.skipped === true,
        ratio: behavRatio,
        weighted: behavWeighted,
        detail: behavioral,
      },
      overallPercent: Number(overall.toFixed(1)),
      note: behavioral.skipped
        ? "Behavioral track skipped (no cobc) — overall excludes 50% weight; install GnuCOBOL for full score"
        : undefined,
    },
    onlineInventory: onlineInv,
    batchInventory: batchInv,
    clbsInventory,
    checks,
    failed: failed.slice(0, 20),
    generatedAt: new Date().toISOString(),
  };

  const outDir = join(ROOT, "reports", "cobol");
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "clbs-prove.json"), `${JSON.stringify(report, null, 2)}\n`);
  } catch {
    /* reports/ may be gitignored — fine */
  }

  return report;
}

async function main() {
  const r = await runCobolClbsProveSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cobol-clbs-prove-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
