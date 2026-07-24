#!/usr/bin/env node
/**
 * External + in-tree modernization-prove corpus smoke.
 *
 * Discovers public corpora (CLBS, LegacyCodeBench), inventories COBOL honestly,
 * and invokes existing Chrysalis gates. Does NOT claim LegacyCodeBench leaderboard
 * scores (D6442 / D6447 — inventory / gate results only).
 *
 * Env:
 *   CHRYSALIS_COBOL_CLBS_ROOT — COBOL-Legacy-Benchmark-Suite clone
 *   CHRYSALIS_LEGACYCODEBENCH_ROOT — Kalmantic/legacycodebench clone
 *   HOME / USERPROFILE — default sibling lookups (~/COBOL-Legacy-Benchmark-Suite, …)
 *
 * Flags:
 *   --quick          skip heavier in-tree flagships (express/plain-php/symfony)
 *   --skip-clbs      skip hub:cobol-clbs-prove-smoke
 *   --skip-best-fit  skip hub:cobol-best-fit-smoke
 *   --skip-site-port skip hub:site-port-close-smoke
 *   --skip-laravel   skip hub:laravel-min-smoke
 *
 * Report: reports/prove/external-corpus-prove.json
 * Gate: hub:external-prove-corpus-smoke
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { inventoryCobolSource } from "./cobol-pattern-lift.mjs";

export const EXTERNAL_PROVE_KIND = "chrysalis.hub.external-prove-corpus-smoke";
export const EXTERNAL_PROVE_SCHEMA_VERSION = 1;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REPORT_PATH = join(ROOT, "reports/prove/external-corpus-prove.json");
const HOME = process.env.HOME || process.env.USERPROFILE || "";

/**
 * @typedef {"ok"|"skip"|"fail"} CorpusResult
 * @typedef {{
 *   corpus: string,
 *   gate: string,
 *   result: CorpusResult,
 *   notes?: string,
 *   detail?: unknown,
 *   durationMs?: number,
 * }} ScoreRow
 */

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, boolean>} */
  const flags = {
    quick: false,
    skipClbs: false,
    skipBestFit: false,
    skipSitePort: false,
    skipLaravel: false,
  };
  for (const a of argv) {
    if (a === "--quick") flags.quick = true;
    if (a === "--skip-clbs") flags.skipClbs = true;
    if (a === "--skip-best-fit") flags.skipBestFit = true;
    if (a === "--skip-site-port") flags.skipSitePort = true;
    if (a === "--skip-laravel") flags.skipLaravel = true;
  }
  return flags;
}

/**
 * @param {string} dir
 * @param {string[]} exts
 * @returns {string[]}
 */
function walkFiles(dir, exts) {
  if (!dir || !existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) break;
    let names;
    try {
      names = readdirSync(cur);
    } catch {
      continue;
    }
    for (const name of names) {
      if (name === ".git" || name === "node_modules" || name === ".venv" || name === "venv") {
        continue;
      }
      const p = join(cur, name);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) stack.push(p);
      else if (exts.some((e) => name.toLowerCase().endsWith(e))) out.push(p);
    }
  }
  return out.sort();
}

/**
 * @param {...string} candidates
 * @returns {string | null}
 */
function firstExistingDir(...candidates) {
  for (const c of candidates) {
    if (!c) continue;
    const p = resolve(c);
    if (existsSync(p) && statSync(p).isDirectory()) return p;
  }
  return null;
}

/**
 * Discover CLBS / LegacyCodeBench roots (env → sibling → $HOME).
 */
export function discoverExternalRoots() {
  const clbs =
    firstExistingDir(
      process.env.CHRYSALIS_COBOL_CLBS_ROOT,
      join(ROOT, "..", "COBOL-Legacy-Benchmark-Suite"),
      HOME ? join(HOME, "COBOL-Legacy-Benchmark-Suite") : "",
    ) ?? null;

  const lcb =
    firstExistingDir(
      process.env.CHRYSALIS_LEGACYCODEBENCH_ROOT,
      join(ROOT, "..", "legacycodebench"),
      join(ROOT, "..", "LegacyCodeBench"),
      HOME ? join(HOME, "legacycodebench") : "",
      HOME ? join(HOME, "LegacyCodeBench") : "",
    ) ?? null;

  return { clbsRoot: clbs, legacyCodeBenchRoot: lcb, home: HOME || null };
}

/**
 * @param {string} root
 * @param {string} [preferSub]
 */
function inventoryCobolTree(root, preferSub) {
  const prefer = preferSub ? join(root, preferSub) : null;
  const searchRoots = [];
  if (prefer && existsSync(prefer)) searchRoots.push(prefer);
  searchRoots.push(root);

  /** @type {string[]} */
  let all = [];
  const seen = new Set();
  for (const sr of searchRoots) {
    for (const f of walkFiles(sr, [".cbl", ".cob", ".cpy"])) {
      const key = f.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(f);
    }
  }

  const programs = all.filter((f) => {
    const lower = f.toLowerCase().replace(/\\/g, "/");
    return lower.endsWith(".cbl") || lower.endsWith(".cob");
  });
  const copybooks = all.filter((f) => f.toLowerCase().endsWith(".cpy"));

  // Stratified sample: prefer non-copy first, then copies.
  const sampleFiles = [...programs.slice(0, 24), ...copybooks.slice(0, 8)];
  const sample = sampleFiles.map((f) => {
    const src = readFileSync(f, "utf8");
    const rel = f.replace(root, "").replace(/^[\\/]/, "");
    return inventoryCobolSource(src, rel);
  });

  const programIds = [...new Set(sample.flatMap((s) => s.programIds))];
  const execCics = sample.reduce((n, s) => n + s.execCics, 0);
  const execSql = sample.reduce((n, s) => n + s.execSql, 0);

  return {
    root,
    fileCount: all.length,
    programFileCount: programs.length,
    copybookFileCount: copybooks.length,
    sampleCount: sample.length,
    sampleProgramIds: programIds.slice(0, 40),
    sampleExecCics: execCics,
    sampleExecSql: execSql,
    sampleUnresolved: [...new Set(sample.flatMap((s) => s.unresolved))].slice(0, 20),
  };
}

/**
 * @param {string} scriptRel
 * @param {string[]} [extraArgs]
 * @param {number} [timeoutMs]
 * @param {NodeJS.ProcessEnv} [env]
 */
function runNodeSmoke(scriptRel, extraArgs = [], timeoutMs = 600_000, env = process.env) {
  const script = join(ROOT, scriptRel);
  if (!existsSync(script)) {
    return {
      status: 0,
      skipped: true,
      reason: `missing-script:${scriptRel}`,
      report: null,
      durationMs: 0,
    };
  }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [script, ...extraArgs], {
    cwd: ROOT,
    encoding: "utf8",
    env,
    timeout: timeoutMs,
    maxBuffer: 20 * 1024 * 1024,
  });
  const durationMs = Date.now() - t0;
  const text = `${r.stdout || ""}\n${r.stderr || ""}`;
  let report = null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      report = JSON.parse(text.slice(start, end + 1));
    } catch {
      report = null;
    }
  }
  if (r.error && /** @type {NodeJS.ErrnoException} */ (r.error).code === "ETIMEDOUT") {
    return {
      status: 1,
      skipped: false,
      reason: `timeout-after-${timeoutMs}ms`,
      report,
      durationMs,
    };
  }
  const ok = r.status === 0 && (report == null || report.ok === true || report.skipped === true);
  return {
    status: r.status ?? 1,
    skipped: false,
    ok,
    reason: ok
      ? undefined
      : report?.failed?.[0]?.reason ||
        report?.reason ||
        `exit=${r.status} ${(r.stderr || "").slice(0, 240)}`,
    report,
    durationMs,
  };
}

/**
 * @param {ScoreRow[]} rows
 * @param {ScoreRow} row
 */
function pushRow(rows, row) {
  rows.push(row);
}

/**
 * @param {ReturnType<typeof parseArgs>} flags
 */
export async function runExternalProveCorpusSmoke(flags = parseArgs([])) {
  const progress = createSmokeProgress("external-prove-corpus");
  const tAll = progress.start("external prove corpora");
  /** @type {ScoreRow[]} */
  const scoreboard = [];
  const roots = discoverExternalRoots();

  // --- CLBS external corpus ---
  {
    const inv =
      roots.clbsRoot != null
        ? inventoryCobolTree(roots.clbsRoot, "src")
        : null;
    if (!roots.clbsRoot) {
      pushRow(scoreboard, {
        corpus: "cobol-legacy-benchmark-suite",
        gate: "inventory",
        result: "skip",
        notes:
          "no CHRYSALIS_COBOL_CLBS_ROOT / ~/COBOL-Legacy-Benchmark-Suite — in-tree mini still used by clbs prove",
      });
    } else {
      const invOk = (inv?.fileCount ?? 0) > 0 && (inv?.programFileCount ?? 0) >= 1;
      pushRow(scoreboard, {
        corpus: "cobol-legacy-benchmark-suite",
        gate: "inventoryCobolSource",
        result: invOk ? "ok" : "fail",
        notes: invOk
          ? `files=${inv?.fileCount} programs=${inv?.programFileCount} cics=${inv?.sampleExecCics} sql=${inv?.sampleExecSql} ids=${(inv?.sampleProgramIds || []).slice(0, 6).join(",")}`
          : `empty-or-thin inventory under ${roots.clbsRoot}`,
        detail: inv,
      });
    }

    if (flags.skipClbs) {
      pushRow(scoreboard, {
        corpus: "cobol-legacy-benchmark-suite",
        gate: "hub:cobol-clbs-prove-smoke",
        result: "skip",
        notes: "--skip-clbs",
      });
    } else {
      progress.info("running hub:cobol-clbs-prove-smoke");
      /** @type {NodeJS.ProcessEnv} */
      const clbsEnv = { ...process.env };
      if (roots.clbsRoot) clbsEnv.CHRYSALIS_COBOL_CLBS_ROOT = roots.clbsRoot;
      const r = runNodeSmoke(
        "scripts/hub-ingest/hub-cobol-clbs-prove-smoke.mjs",
        [],
        600_000,
        clbsEnv,
      );
      pushRow(scoreboard, {
        corpus: "cobol-legacy-benchmark-suite",
        gate: "hub:cobol-clbs-prove-smoke",
        result: r.skipped ? "skip" : r.ok ? "ok" : "fail",
        notes: r.reason,
        detail: r.report
          ? {
              ok: r.report.ok,
              overallPercent: r.report.scores?.overallPercent,
              behavioralSkipped: r.report.scores?.behavioralFidelity?.skipped,
              failed: r.report.failed,
            }
          : undefined,
        durationMs: r.durationMs,
      });
    }
  }

  // --- LegacyCodeBench (inventory only — no leaderboard claim) ---
  {
    if (!roots.legacyCodeBenchRoot) {
      pushRow(scoreboard, {
        corpus: "legacycodebench",
        gate: "inventory",
        result: "skip",
        notes:
          "no CHRYSALIS_LEGACYCODEBENCH_ROOT / ~/legacycodebench — clone https://github.com/Kalmantic/legacycodebench.git",
      });
    } else {
      const datasetsDir = join(roots.legacyCodeBenchRoot, "datasets");
      const hasDatasets = existsSync(datasetsDir);
      const inv = inventoryCobolTree(
        roots.legacyCodeBenchRoot,
        hasDatasets ? "datasets" : undefined,
      );
      if (inv.fileCount === 0) {
        pushRow(scoreboard, {
          corpus: "legacycodebench",
          gate: "inventoryCobolSource",
          result: "skip",
          notes:
            "clone present but no .cbl/.cob/.cpy yet — run `legacycodebench load-datasets` (datasets/ is auto-cloned; not vendored in git). Chrysalis does not claim LCB leaderboard scores.",
          detail: {
            root: roots.legacyCodeBenchRoot,
            datasetsDir,
            datasetsExists: hasDatasets,
            disclaimer: "inventory-only; not an LCB leaderboard run",
          },
        });
      } else {
        const invOk = inv.programFileCount >= 1 || inv.copybookFileCount >= 1;
        pushRow(scoreboard, {
          corpus: "legacycodebench",
          gate: "inventoryCobolSource",
          result: invOk ? "ok" : "fail",
          notes: invOk
            ? `inventory-only (not LCB leaderboard) files=${inv.fileCount} programs=${inv.programFileCount} cics=${inv.sampleExecCics} sql=${inv.sampleExecSql}`
            : "files found but no programs/copybooks classified",
          detail: { ...inv, disclaimer: "inventory-only; not an LCB leaderboard run" },
        });
      }
    }
  }

  // --- In-tree Chrysalis demos ---
  if (flags.skipBestFit) {
    pushRow(scoreboard, {
      corpus: "in-tree-cobol-gold",
      gate: "hub:cobol-best-fit-smoke",
      result: "skip",
      notes: "--skip-best-fit",
    });
  } else {
    progress.info("running hub:cobol-best-fit-smoke");
    const r = runNodeSmoke("scripts/hub-ingest/hub-cobol-best-fit-smoke.mjs", [], 900_000);
    pushRow(scoreboard, {
      corpus: "in-tree-cobol-gold",
      gate: "hub:cobol-best-fit-smoke",
      result: r.skipped ? "skip" : r.ok ? "ok" : "fail",
      notes: r.reason,
      detail: r.report
        ? { ok: r.report.ok, passed: r.report.passed, failed: r.report.failed }
        : undefined,
      durationMs: r.durationMs,
    });
  }

  if (flags.skipSitePort) {
    pushRow(scoreboard, {
      corpus: "in-tree-tiny-blog",
      gate: "hub:site-port-close-smoke",
      result: "skip",
      notes: "--skip-site-port",
    });
  } else {
    progress.info("running hub:site-port-close-smoke");
    const r = runNodeSmoke("scripts/hub-ingest/hub-site-port-close-smoke.mjs", [], 600_000);
    pushRow(scoreboard, {
      corpus: "in-tree-tiny-blog",
      gate: "hub:site-port-close-smoke",
      result: r.skipped ? "skip" : r.ok ? "ok" : "fail",
      notes: r.reason,
      detail: r.report
        ? { ok: r.report.ok, checks: r.report.checks, fixture: r.report.fixture }
        : undefined,
      durationMs: r.durationMs,
    });
  }

  if (flags.skipLaravel) {
    pushRow(scoreboard, {
      corpus: "in-tree-laravel-min",
      gate: "hub:laravel-min-smoke",
      result: "skip",
      notes: "--skip-laravel",
    });
  } else {
    progress.info("running hub:laravel-min-smoke");
    const r = runNodeSmoke(
      "scripts/hub-ingest/hub-laravel-min-smoke.mjs",
      ["--json-out", join(ROOT, "reports/ci/hub-laravel-min-smoke.json")],
      120_000,
    );
    pushRow(scoreboard, {
      corpus: "in-tree-laravel-min",
      gate: "hub:laravel-min-smoke",
      result: r.skipped ? "skip" : r.ok ? "ok" : "fail",
      notes: r.reason,
      detail: r.report
        ? { ok: r.report.ok, routeCount: r.report.routeCount }
        : undefined,
      durationMs: r.durationMs,
    });
  }

  if (!flags.quick) {
    for (const [corpus, script, gate] of [
      ["in-tree-express", "scripts/hub-ingest/hub-express-flagship.mjs", "hub:express-flagship"],
      ["in-tree-plain-php", "scripts/hub-ingest/hub-plain-php-flagship.mjs", "hub:plain-php-flagship"],
      ["in-tree-symfony", "scripts/hub-ingest/hub-symfony-flagship.mjs", "hub:symfony-flagship"],
      [
        "in-tree-node-express-oracle",
        "scripts/hub-ingest/hub-node-express-oracle-verify.mjs",
        "hub:node-express-oracle-verify",
      ],
    ]) {
      progress.info(`running ${gate}`);
      const r = runNodeSmoke(script, [], 600_000);
      pushRow(scoreboard, {
        corpus,
        gate,
        result: r.skipped ? "skip" : r.ok ? "ok" : "fail",
        notes: r.reason,
        detail: r.report ? { ok: r.report.ok } : undefined,
        durationMs: r.durationMs,
      });
    }
  } else {
    pushRow(scoreboard, {
      corpus: "in-tree-flagships",
      gate: "express/plain-php/symfony/node-express-oracle",
      result: "skip",
      notes: "--quick",
    });
  }

  const failed = scoreboard.filter((r) => r.result === "fail");
  const skipped = scoreboard.filter((r) => r.result === "skip");
  const passed = scoreboard.filter((r) => r.result === "ok");
  // Overall ok if no hard fails (skips are honest).
  const ok = failed.length === 0;
  progress.end("external prove corpora", ok, tAll);

  const report = {
    kind: EXTERNAL_PROVE_KIND,
    schemaVersion: EXTERNAL_PROVE_SCHEMA_VERSION,
    ok,
    roots,
    flags,
    scoreboard,
    summary: {
      ok: passed.length,
      skip: skipped.length,
      fail: failed.length,
      total: scoreboard.length,
    },
    laws: {
      d6442: "translate-only — no invented façades",
      d6447: "honest holes/skips; no demo-only substitutes",
      legacyCodeBench: "inventory / Chrysalis gates only — not an LCB leaderboard claim",
    },
    reportPath: REPORT_PATH,
    generatedAt: new Date().toISOString(),
  };

  try {
    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  } catch {
    /* reports/ may be absent in some sandboxes */
  }

  return report;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const r = await runExternalProveCorpusSmoke(flags);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

const isCli =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
