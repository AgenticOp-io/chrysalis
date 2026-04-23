#!/usr/bin/env node
/**
 * `chrysalis` — the CLI entrypoint. Thin wrapper over the package APIs.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ingestDirectory } from "@chrysalis/ingest";
import { countByDialect, countHoles } from "@chrysalis/webir";
import { emit as emitHono } from "@chrysalis/emit-hono";
import { loadObserveConfig, readCorpus, startObserver } from "@chrysalis/oracle";
import { buildReport, replayCorpus, writeReport } from "@chrysalis/verify";
import { emitTypes, runArchaeology } from "@chrysalis/archaeology";
import { startChimera, type Mode, type RouteRule } from "@chrysalis/runtime-chimera";
import {
  DEFAULT_RECOGNIZERS,
  analyzeModule,
  type InsightReport,
  type Opportunity,
  type RecognizerId,
} from "@chrysalis/insight";
import {
  DEFAULT_PASSES,
  applyRewrites,
  applyRewritesAsync,
  type RewriteReport,
  type RewriteResult,
} from "@chrysalis/rewrite";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SUBCOMMANDS = [
  ["init", "Mark a directory as a Chrysalis project"],
  ["observe", "Run the oracle sidecar against a live PHP app"],
  ["corpus", "Read + summarize a traces/ directory"],
  ["ingest", "Translate PHP source into a WebIR module"],
  ["archaeology", "Recover schema from DB + forms + traces"],
  ["emit", "Emit a target project from a WebIR module (e.g. --target=hono)"],
  ["convert", "One-shot ingest + emit (Milestone 1 convenience)"],
  ["verify", "Replay oracle traces against the generated code"],
  ["deploy", "Configure the chimera router (--mode=shadow|canary|cutover)"],
  ["insight", "Catalog anti-patterns on the WebIR and propose idiomatic replacements"],
  ["rewrite", "Apply confidence-gated IR rewrites from insight opportunities, then emit"],
  ["status", "Print the migration dashboard"],
  ["repair", "LLM-driven repair loop for divergent endpoints (Milestone 3)"],
] as const;

function printHelp(): void {
  console.log("chrysalis — grow a modern framework inside a legacy PHP app\n");
  console.log("Usage: chrysalis <command> [...args]\n");
  console.log("Commands:");
  for (const [name, desc] of SUBCOMMANDS) {
    console.log(`  ${name.padEnd(12)} ${desc}`);
  }
  console.log("\nRead DESIGN.md before contributing.");
}

function parseFlags(args: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) {
        out[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith("--")) {
          out[a.slice(2)] = next;
          i += 1;
        } else {
          out[a.slice(2)] = true;
        }
      }
    }
  }
  return out;
}

function positional(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      if (a.indexOf("=") < 0 && args[i + 1] && !args[i + 1]!.startsWith("--")) i += 1;
      continue;
    }
    out.push(a);
  }
  return out;
}

async function cmdIngest(args: string[]): Promise<number> {
  const pos = positional(args);
  const root = pos[0];
  if (!root) {
    console.error("usage: chrysalis ingest <php-project-dir>");
    return 2;
  }
  const mod = await ingestDirectory(resolve(root));
  console.log(`routes:   ${mod.roots.length}`);
  console.log(`nodes:    ${mod.nodes.size}`);
  console.log(`holes:    ${countHoles(mod)}`);
  console.log(`dialects: ${JSON.stringify(countByDialect(mod))}`);
  return 0;
}

async function cmdEmit(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const root = pos[0];
  const outDir = typeof flags.out === "string" ? flags.out : null;
  const target = typeof flags.target === "string" ? flags.target : "hono";
  if (!root || !outDir) {
    console.error("usage: chrysalis emit <php-project-dir> --out <out> [--target=hono]");
    return 2;
  }
  if (target !== "hono") {
    console.error(`error: unsupported emit target '${target}'. Supported: hono`);
    return 2;
  }
  const mod = await ingestDirectory(resolve(root));
  const res = await emitHono({ module: mod, outDir: resolve(outDir) });
  console.log(`handlers:     ${res.handlerCount}`);
  console.log(`files:        ${res.files.length}`);
  console.log(`emit holes:   ${res.holes.length}`);
  for (const [h, effs] of Object.entries(res.effectsByHandler)) {
    console.log(`  ${h.padEnd(25)} effects: ${effs.join(", ") || "(none)"}`);
  }
  return 0;
}

async function cmdConvert(args: string[]): Promise<number> {
  // Same as `emit` for now; kept as a distinct verb because it will grow
  // more pipeline stages (observe → ingest → archaeology → emit → verify).
  return cmdEmit(args);
}

async function cmdObserve(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const root = pos[0];
  if (!root) {
    console.error(
      "usage: chrysalis observe <php-project-dir> [--traces <dir>] [--port 8080] [--host 127.0.0.1]",
    );
    return 2;
  }
  const phpRoot = resolve(root);
  const traceDir = resolve(typeof flags.traces === "string" ? flags.traces : "traces");
  const port = typeof flags.port === "string" ? Number.parseInt(flags.port, 10) : 8080;
  const host = typeof flags.host === "string" ? flags.host : "127.0.0.1";

  // The prelude ships inside the repo at packages/oracle-php/src/bootstrap.php.
  // Resolve its path relative to this CLI's installation root.
  const thisFile = fileURLToPath(import.meta.url);
  const preludePath = resolve(thisFile, "..", "..", "..", "oracle-php", "src", "bootstrap.php");

  const redaction = loadObserveConfig(phpRoot);
  console.log(`[observe] php root:   ${phpRoot}`);
  console.log(`[observe] trace dir:  ${traceDir}`);
  console.log(`[observe] prelude:    ${preludePath}`);
  console.log(`[observe] listening:  http://${host}:${port}`);
  console.log(`[observe] redaction:  ${redaction.rules.length} rule(s)`);

  const handle = startObserver({
    phpRoot,
    traceDir,
    preludePath,
    redaction,
    host,
    port,
    onStdout: (s) => process.stdout.write(s),
    onStderr: (s) => process.stderr.write(s),
  });

  process.on("SIGINT", () => {
    console.log("\n[observe] shutting down...");
    void handle.stop();
  });

  const code = await handle.exited;
  return code;
}

async function cmdCorpus(args: string[]): Promise<number> {
  const pos = positional(args);
  const root = pos[0];
  if (!root) {
    console.error("usage: chrysalis corpus <traces-dir>");
    return 2;
  }
  const corpus = readCorpus({ root: resolve(root) });
  console.log(`traces: ${corpus.traces.length}`);
  const byRoute = new Map<string, number>();
  for (const t of corpus.traces) {
    const req = t.events.find((e) => e.type === "http.request");
    if (!req || req.type !== "http.request") continue;
    const key = `${req.method} ${req.path}`;
    byRoute.set(key, (byRoute.get(key) ?? 0) + 1);
  }
  for (const [route, count] of [...byRoute.entries()].sort()) {
    console.log(`  ${route.padEnd(30)} ${count}`);
  }
  return 0;
}

async function cmdArchaeology(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const schemaPath = pos[0];
  if (!schemaPath) {
    console.error(
      "usage: chrysalis archaeology <schema.sql> [--traces <dir>] [--out <file>]",
    );
    return 2;
  }
  const tracesDir = typeof flags.traces === "string" ? flags.traces : null;
  const outPath = typeof flags.out === "string" ? flags.out : null;

  const input: Parameters<typeof runArchaeology>[0] = { schemaPath: resolve(schemaPath) };
  const corpus = tracesDir ? readCorpus({ root: resolve(tracesDir) }) : null;
  if (corpus) (input as { corpus: typeof corpus }).corpus = corpus;
  const report = runArchaeology(input);

  console.log(
    `[archaeology] schema: ${schemaPath} → ${report.entities.length} entities` +
      (corpus ? ` (corpus: ${corpus.traces.length} traces)` : ""),
  );
  for (const e of report.entities) {
    const ddl = e.fields.filter((f) => f.kind !== "observed-only").length;
    const obs = e.fields.filter((f) => f.kind !== "ddl").length;
    console.log(
      `  ${e.typescriptName.padEnd(16)} table=${e.name.padEnd(12)} fields=${e.fields.length}  (ddl=${ddl}, observed=${obs}, statements=${e.observedStatementCount})`,
    );
  }
  if (report.unknownDdl.length > 0) {
    console.log(`  ⚠ unknown DDL fragments: ${report.unknownDdl.length}`);
  }
  if (report.orphanShapes.length > 0) {
    console.log(`  ⚠ orphan observed shapes: ${report.orphanShapes.length}`);
  }

  if (outPath) {
    const src = emitTypes(report);
    writeFileSync(resolve(outPath), src);
    console.log(`[archaeology] wrote ${outPath}`);
  }
  return 0;
}

async function cmdVerify(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const corpusRoot = pos[0];
  const baseUrl = typeof flags["base-url"] === "string" ? flags["base-url"] : null;
  if (!corpusRoot || !baseUrl) {
    console.error(
      "usage: chrysalis verify <traces-dir> --base-url <url> [--report <dir>] [--threshold 0.9]",
    );
    return 2;
  }
  const reportDir = typeof flags.report === "string" ? flags.report : "reports/verify";
  const threshold = typeof flags.threshold === "string" ? Number.parseFloat(flags.threshold) : 0.8;

  const corpus = readCorpus({ root: resolve(corpusRoot) });
  console.log(`[verify] loaded ${corpus.traces.length} traces from ${corpusRoot}`);
  console.log(`[verify] replaying against ${baseUrl} ...`);

  const outcomes = await replayCorpus(corpus, { baseUrl });
  const report = buildReport(outcomes);
  const written = writeReport(resolve(reportDir), report, outcomes);
  console.log(`[verify] wrote ${written.length} report file(s) under ${reportDir}`);

  console.log("");
  console.log(`aggregate correctness: ${(report.aggregate.correctness * 100).toFixed(1)}%`);
  console.log(`frames passed:         ${report.aggregate.framesPassed} / ${report.aggregate.framesTotal}`);
  console.log("");
  console.log("per-endpoint:");
  for (const e of report.endpoints) {
    const pct = (e.correctness * 100).toFixed(1).padStart(5);
    const sim = e.avgBodySimilarity.toFixed(2);
    console.log(`  ${e.route.padEnd(25)} ${pct}%   body≈${sim}   (${e.framesPassed}/${e.framesTotal})`);
    for (const d of e.divergences) {
      console.log(`    ✗ ${d.traceId}: ${d.kinds.join(", ")}`);
      for (const detail of d.details) console.log(`      · ${detail}`);
    }
  }

  if (report.aggregate.correctness + 1e-9 < threshold) {
    console.error(
      `[verify] correctness ${report.aggregate.correctness.toFixed(3)} below threshold ${threshold}`,
    );
    return 1;
  }
  return 0;
}

interface DeployConfigFile {
  readonly mode?: Mode;
  readonly legacy?: string;
  readonly modern?: string;
  readonly port?: number;
  readonly host?: string;
  readonly rules?: ReadonlyArray<RouteRule>;
  readonly shadowLogDir?: string;
}

async function cmdDeploy(args: string[]): Promise<number> {
  const flags = parseFlags(args);
  const configPath = typeof flags.config === "string" ? resolve(flags.config) : null;
  const fileCfg: DeployConfigFile = configPath
    ? (JSON.parse(readFileSync(configPath, "utf8")) as DeployConfigFile)
    : {};

  const modeRaw = typeof flags.mode === "string" ? flags.mode : fileCfg.mode ?? "legacy";
  if (modeRaw !== "legacy" && modeRaw !== "cutover" && modeRaw !== "shadow") {
    console.error(`usage: chrysalis deploy --mode=legacy|cutover|shadow`);
    console.error(`  unknown mode: ${modeRaw}`);
    return 2;
  }
  const legacy = typeof flags.legacy === "string" ? flags.legacy : fileCfg.legacy;
  const modern = typeof flags.modern === "string" ? flags.modern : fileCfg.modern;
  if (!legacy || !modern) {
    console.error(
      "usage: chrysalis deploy --mode=<legacy|cutover|shadow> --legacy <url> --modern <url>\n" +
        "                       [--port 8080] [--host 127.0.0.1]\n" +
        "                       [--config chimera.json] [--shadow-log-dir reports/shadow]",
    );
    return 2;
  }
  const port =
    typeof flags.port === "string"
      ? Number.parseInt(flags.port, 10)
      : fileCfg.port ?? 8080;
  const host = typeof flags.host === "string" ? flags.host : fileCfg.host ?? "127.0.0.1";
  const rules: ReadonlyArray<RouteRule> = fileCfg.rules ?? [];
  const shadowLogDir =
    typeof flags["shadow-log-dir"] === "string"
      ? flags["shadow-log-dir"]
      : fileCfg.shadowLogDir;

  console.log(`[deploy] mode:       ${modeRaw}`);
  console.log(`[deploy] legacy:     ${legacy}`);
  console.log(`[deploy] modern:     ${modern}`);
  console.log(`[deploy] listening:  http://${host}:${port}`);
  console.log(`[deploy] rules:      ${rules.length}`);
  if (shadowLogDir) console.log(`[deploy] shadow log: ${shadowLogDir}`);

  const handle = await startChimera({
    mode: modeRaw,
    legacy,
    modern,
    rules,
    host,
    port,
    ...(shadowLogDir ? { shadowLogDir: resolve(shadowLogDir) } : {}),
  });

  const printStats = () => {
    const s = handle.stats();
    console.log(
      `[deploy] stats  total=${s.total}  legacy=${s.byTarget.legacy}  modern=${s.byTarget.modern}  ` +
        `shadow(req=${s.shadow.requests} agreed=${s.shadow.agreed} diverged=${s.shadow.diverged})`,
    );
  };
  const statsTimer = setInterval(printStats, 10_000);

  const shutdown = async (): Promise<void> => {
    clearInterval(statsTimer);
    console.log("\n[deploy] shutting down...");
    printStats();
    await handle.stop();
  };
  process.on("SIGINT", () => {
    void shutdown().then(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown().then(() => process.exit(0));
  });

  // Park forever; chimera runs in-process.
  await new Promise<void>(() => {});
  return 0;
}

async function cmdInsight(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const root = pos[0];
  if (!root) {
    console.error(
      "usage: chrysalis insight <php-project-dir>\n" +
        "                         [--traces <dir>] [--out <report.json>]\n" +
        "                         [--only raw-sql-concat,unescaped-output,n-plus-one-queries,scattered-validation,string-dispatch]\n" +
        "                         [--json]",
    );
    return 2;
  }

  const mod = await ingestDirectory(resolve(root));

  const tracesDir = typeof flags.traces === "string" ? resolve(flags.traces) : null;
  let corpus: ReturnType<typeof readCorpus> | null = null;
  if (tracesDir && existsSync(tracesDir)) {
    try {
      corpus = readCorpus({ root: tracesDir });
    } catch (err) {
      console.error(`[insight] could not read corpus at ${tracesDir}: ${String(err)}`);
    }
  }

  const only = typeof flags.only === "string" ? parseOnly(flags.only) : null;

  const report = analyzeModule(mod, {
    ...(corpus ? { corpus } : {}),
    ...(only ? { only } : {}),
  });

  const outPath = typeof flags.out === "string" ? resolve(flags.out) : null;
  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`[insight] report written to ${outPath}`);
  }

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }

  renderInsightReport(report);

  const strict = flags.strict === true || flags.strict === "true";
  if (strict && report.opportunities.length > 0) {
    return 1;
  }
  return 0;
}

function npmInstallEmitted(outDir: string): void {
  const r = spawnSync("npm", ["install", "--no-audit", "--no-fund"], {
    cwd: outDir,
    stdio: "pipe",
    encoding: "utf8",
    shell: true,
  });
  if (r.status !== 0) {
    const detail = (r.stderr || r.stdout || "").toString().trim();
    throw new Error(
      `npm install failed in ${outDir}${detail ? `: ${detail}` : ""}`,
    );
  }
}

async function loadEmittedHonoFetch(outDir: string): Promise<typeof fetch> {
  const { tsImport } = await import("tsx/esm/api");
  const abs = resolve(outDir);
  const parentURL = pathToFileURL(join(abs, "package.json")).href;
  const imported = (await tsImport("./src/server.ts", parentURL)) as {
    app: { fetch: typeof fetch };
  };
  return imported.app.fetch.bind(imported.app) as typeof fetch;
}

async function cmdRewrite(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const root = pos[0];
  const outDir = typeof flags.out === "string" ? flags.out : null;
  if (!root) {
    console.error(
      "usage: chrysalis rewrite <php-project-dir> [--out <ts-out>]\n" +
        "                         [--traces <dir>] [--min-confidence 0.75]\n" +
        "                         [--passes <id,id,...>] [--report <rewrite.json>]\n" +
        "                         [--no-post-verify] [--verify-behavior]\n" +
        "                         [--http-replay <traces-dir>] [--http-replay-skip-install]\n" +
        "                         [--json]",
    );
    return 2;
  }

  const httpReplayRoot =
    typeof flags["http-replay"] === "string" ? resolve(flags["http-replay"]) : null;
  if (httpReplayRoot && !outDir) {
    console.error("error: --http-replay requires --out (emit directory for the generated app)");
    return 2;
  }

  const mod = await ingestDirectory(resolve(root));

  const tracesDir = typeof flags.traces === "string" ? resolve(flags.traces) : null;
  let corpus: ReturnType<typeof readCorpus> | null = null;
  if (tracesDir && existsSync(tracesDir)) {
    try {
      corpus = readCorpus({ root: tracesDir });
    } catch (err) {
      console.error(`[rewrite] could not read corpus at ${tracesDir}: ${String(err)}`);
    }
  }

  let replayCorpusForHttp: ReturnType<typeof readCorpus> | null = null;
  if (httpReplayRoot) {
    if (!existsSync(httpReplayRoot)) {
      console.error(`error: --http-replay directory not found: ${httpReplayRoot}`);
      return 2;
    }
    try {
      replayCorpusForHttp = readCorpus({ root: httpReplayRoot });
    } catch (err) {
      console.error(`[rewrite] could not read http-replay corpus: ${String(err)}`);
      return 2;
    }
  }

  const insight = analyzeModule(mod, { ...(corpus ? { corpus } : {}) });

  const minConfidence =
    typeof flags["min-confidence"] === "string"
      ? Number.parseFloat(flags["min-confidence"])
      : 0.75;
  const passIds =
    typeof flags.passes === "string"
      ? flags.passes.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

  // Post-verify defaults ON: it re-runs each applied opportunity's
  // recognizer on the rewritten module and rolls back the batch if
  // any applied rewrite didn't actually fix its finding. Cheap and
  // directly user-visible; users can disable with `--no-post-verify`
  // if they want to inspect a partial / broken rewrite.
  const postVerifyEnabled = flags["no-post-verify"] !== true;
  // behavior-verify runs the in-process IR simulator against
  // synthesized probe inputs on both pre and post modules and rolls
  // back on unexplained divergence. Opt-in for now because the
  // simulator only covers a subset of ops; it abstains on unknown
  // ops, so false-positive rollbacks are unlikely but the gate is
  // loud by design.
  const behaviorVerifyEnabled = flags["verify-behavior"] === true;
  const httpReplaySkipInstall = flags["http-replay-skip-install"] === true;

  const rewriteOptsBase = {
    minConfidence,
    ...(passIds ? { only: passIds } : {}),
    ...(postVerifyEnabled ? { postVerifyRecognizers: DEFAULT_RECOGNIZERS } : {}),
    ...(behaviorVerifyEnabled ? { behaviorVerify: true } : {}),
  };

  const outAbs = outDir ? resolve(outDir) : "";
  const useHttpReplay = replayCorpusForHttp !== null && outDir !== null;

  let emittedForHttpReplay = false;
  let result: RewriteResult;

  if (useHttpReplay) {
    try {
      result = await applyRewritesAsync(mod, insight.opportunities, DEFAULT_PASSES, {
        ...rewriteOptsBase,
        httpReplay: {
          corpus: replayCorpusForHttp!,
          baseUrl: "http://127.0.0.1",
          resolveFetch: async (rewritten) => {
            await emitHono({ module: rewritten, outDir: outAbs });
            emittedForHttpReplay = true;
            if (!httpReplaySkipInstall) {
              npmInstallEmitted(outAbs);
            }
            return loadEmittedHonoFetch(outAbs);
          },
        },
      });
    } catch (err) {
      console.error(`[rewrite] http-replay pipeline failed: ${String(err)}`);
      return 1;
    }
    if (result.report.httpReplayVerify && !result.report.httpReplayVerify.ok) {
      try {
        await emitHono({ module: result.module, outDir: outAbs });
      } catch (revertErr) {
        console.error(
          `[rewrite] could not re-emit rolled-back module: ${String(revertErr)}`,
        );
      }
    }
  } else {
    result = applyRewrites(mod, insight.opportunities, DEFAULT_PASSES, rewriteOptsBase);
  }

  const reportPath = typeof flags.report === "string" ? resolve(flags.report) : null;
  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(result.report, null, 2), "utf8");
    console.log(`[rewrite] report written to ${reportPath}`);
  }

  if (outDir && !emittedForHttpReplay) {
    const emitRes = await emitHono({ module: result.module, outDir: outAbs });
    console.log(`[rewrite] emitted ${emitRes.files.length} file(s) to ${outAbs}`);
  } else if (emittedForHttpReplay) {
    console.log(`[rewrite] emitted (during http-replay) to ${outAbs}`);
  }

  if (flags.json) {
    console.log(JSON.stringify({ report: result.report }, null, 2));
    return 0;
  }

  renderRewriteReport(result.report, minConfidence);
  return 0;
}

function renderRewriteReport(report: RewriteReport, minConfidence: number): void {
  console.log(`chrysalis rewrite — ${report.sourceApp}`);
  console.log("─".repeat(48));
  console.log(`min-confidence : ${minConfidence.toFixed(2)}`);
  console.log(
    `considered     : ${report.summary.considered} opportunity(ies)`,
  );
  console.log(
    `applied        : ${report.summary.applied}   skipped: ${report.summary.skipped}`,
  );
  for (const [pass, n] of Object.entries(report.summary.byPass)) {
    console.log(`  - ${pass.padEnd(26)} ${n}`);
  }
  if (report.applied.length > 0) {
    console.log("\napplied:");
    for (const a of report.applied) {
      console.log(`  ✓ ${a.pass}  on  ${a.opportunity}   (edits=${a.editCount})`);
    }
  }
  if (report.skipped.length > 0) {
    console.log("\nskipped:");
    for (const s of report.skipped) {
      console.log(`  · ${s.pass}  on  ${s.opportunity}   (${s.reason})`);
    }
  }
  if (report.postVerify) {
    const pv = report.postVerify;
    console.log(
      `\npost-verify    : ${pv.ok ? "ok" : "FAILED"}   ` +
        `(recognizers re-run: ${pv.recognizersRun.join(", ") || "none"})`,
    );
    if (!pv.ok) {
      for (const f of pv.failures) {
        console.log(`  ✗ ${f.pass} on ${f.opportunity} — ${f.detail}`);
      }
      console.log("(batch rolled back — no rewrites committed to module)");
    }
  }
  if (report.behaviorVerify) {
    const bv = report.behaviorVerify;
    console.log(
      `\nbehavior-verify: ${bv.ok ? "ok" : "FAILED"}   ` +
        `(probes=${bv.probesRun} routes=${bv.routesCovered} abstained=${bv.abstained})`,
    );
    if (!bv.ok) {
      for (const d of bv.divergences) {
        console.log(`  ✗ ${d.route} ${d.probe} [${d.kind}] — ${d.detail}`);
        console.log(`      expected: ${d.expected}`);
        console.log(`      actual  : ${d.post}`);
      }
      console.log("(batch rolled back — behavioral regression detected)");
    }
  }
  if (report.httpReplayVerify) {
    const hr = report.httpReplayVerify;
    const n = hr.outcomes.length;
    const passed = hr.outcomes.filter((o) => o.ok).length;
    console.log(
      `\nhttp-replay    : ${hr.ok ? "ok" : "FAILED"}   ` +
        `(frames ${passed}/${n}${hr.failedRoutes.length ? `; failed: ${hr.failedRoutes.join(", ")}` : ""})`,
    );
    if (!hr.ok) {
      for (const o of hr.outcomes) {
        if (o.ok) continue;
        console.log(
          `  ✗ ${o.route} — ${o.diff.divergences.map((d) => d.kind).join(", ") || "divergence"}`,
        );
      }
      console.log("(batch rolled back — HTTP replay diverged from corpus)");
    }
  }
}

function parseOnly(raw: string): ReadonlyArray<RecognizerId> {
  const known = new Set<RecognizerId>(DEFAULT_RECOGNIZERS.map((r) => r.id));
  const out: RecognizerId[] = [];
  for (const tok of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (known.has(tok as RecognizerId)) out.push(tok as RecognizerId);
    else console.error(`[insight] unknown recognizer: ${tok}`);
  }
  return out;
}

function renderInsightReport(report: InsightReport): void {
  console.log(`chrysalis insight — ${report.sourceApp}`);
  console.log("─".repeat(48));
  console.log(`recognizers  : ${report.recognizers.join(", ")}`);
  console.log(
    `opportunities: ${report.summary.total}  ` +
      `(strong=${report.summary.bySeverity.strong} ` +
      `suggestion=${report.summary.bySeverity.suggestion} ` +
      `info=${report.summary.bySeverity.info})`,
  );
  for (const [rec, n] of Object.entries(report.summary.byRecognizer)) {
    console.log(`  - ${rec.padEnd(26)} ${n}`);
  }
  if (report.opportunities.length === 0) {
    console.log("\nno opportunities found.");
    return;
  }
  console.log("");
  const sorted = [...report.opportunities].sort(
    (a, b) => severityRank(b) - severityRank(a) || b.confidence - a.confidence,
  );
  for (const op of sorted) {
    const where = op.route ? `${op.route.method} ${op.route.path}` : "(unscoped)";
    const origin = renderLocator(op.origin);
    console.log(
      `• [${op.severity.toUpperCase()} ${(op.confidence * 100).toFixed(0)}%] ${op.title}`,
    );
    console.log(`    at ${where}   ${origin}`);
    console.log(`    why: ${op.rationale}`);
    console.log(`    fix: ${op.proposedLift.kind} — ${op.proposedLift.sketch}`);
    if (op.proposedLift.requires?.length) {
      console.log(`    requires: ${op.proposedLift.requires.join(", ")}`);
    }
    const corpusConf = op.evidence["corpusConfirmations"];
    if (typeof corpusConf === "number" && corpusConf > 0) {
      console.log(
        `    corpus:   ${corpusConf} trace(s), up to ${op.evidence["observedMaxPerRequest"]} firings/req`,
      );
    }
    console.log("");
  }
}

function severityRank(op: Opportunity): number {
  switch (op.severity) {
    case "strong":
      return 3;
    case "suggestion":
      return 2;
    case "info":
      return 1;
  }
}

function renderLocator(l: Opportunity["origin"]): string {
  switch (l.kind) {
    case "php":
      return `${l.file}:${l.line}`;
    case "db":
      return `db:${l.table}${l.column ? `.${l.column}` : ""}`;
    case "form":
      return `form:${l.file}#${l.fieldName}`;
    case "trace":
      return `trace:${l.corpusId}/${l.frameId}`;
    case "synthetic":
      return `synthetic:${l.reason}`;
  }
}

interface StatusSummary {
  readonly corpus: { traces: number; routes: number } | null;
  readonly correctness: {
    readonly aggregate: number;
    readonly framesPassed: number;
    readonly framesTotal: number;
    readonly perRoute: Array<{ route: string; correctness: number }>;
  } | null;
  readonly archaeology: {
    readonly entities: number;
    readonly fields: number;
    readonly unknownDdl: number;
    readonly orphanShapes: number;
  } | null;
  readonly shadow: {
    readonly requests: number;
    readonly agreed: number;
    readonly diverged: number;
  } | null;
  readonly residualLegacy: {
    readonly holeCount: number;
    readonly dialectCounts: Record<string, number>;
  } | null;
  readonly insights: {
    readonly total: number;
    readonly byRecognizer: Record<string, number>;
    readonly bySeverity: Record<string, number>;
    readonly top: ReadonlyArray<{
      readonly title: string;
      readonly severity: string;
      readonly confidence: number;
      readonly route: string | null;
    }>;
  } | null;
}

function tryReadJson<T>(path: string): T | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

async function cmdStatus(args: string[]): Promise<number> {
  const flags = parseFlags(args);
  const project = typeof flags.project === "string" ? resolve(flags.project) : null;
  const tracesDir = typeof flags.traces === "string" ? resolve(flags.traces) : "traces";
  const reportDir = typeof flags.report === "string" ? resolve(flags.report) : "reports/verify";
  const shadowDir = typeof flags.shadow === "string" ? resolve(flags.shadow) : "reports/shadow";
  const schemaPath = typeof flags.schema === "string" ? resolve(flags.schema) : null;

  const summary: StatusSummary = {
    corpus: null,
    correctness: null,
    archaeology: null,
    shadow: null,
    residualLegacy: null,
    insights: null,
  };

  // Corpus ------------------------------------------------------------
  let corpus: ReturnType<typeof readCorpus> | null = null;
  if (existsSync(tracesDir)) {
    try {
      corpus = readCorpus({ root: tracesDir });
      const routes = new Set<string>();
      for (const t of corpus.traces) {
        const req = t.events.find((e) => e.type === "http.request");
        if (req && req.type === "http.request") routes.add(`${req.method} ${req.path}`);
      }
      (summary as { corpus: StatusSummary["corpus"] }).corpus = {
        traces: corpus.traces.length,
        routes: routes.size,
      };
    } catch {
      // ignore; corpus simply stays null
    }
  }

  // Correctness -------------------------------------------------------
  type ReportFile = {
    aggregate: { correctness: number; framesPassed: number; framesTotal: number };
    endpoints: Array<{ route: string; correctness: number }>;
  };
  const report = tryReadJson<ReportFile>(resolve(reportDir, "correctness.json"));
  if (report) {
    (summary as { correctness: StatusSummary["correctness"] }).correctness = {
      aggregate: report.aggregate.correctness,
      framesPassed: report.aggregate.framesPassed,
      framesTotal: report.aggregate.framesTotal,
      perRoute: report.endpoints.map((e) => ({ route: e.route, correctness: e.correctness })),
    };
  }

  // Archaeology ------------------------------------------------------
  if (schemaPath && existsSync(schemaPath)) {
    try {
      const input: Parameters<typeof runArchaeology>[0] = { schemaPath };
      if (corpus) (input as { corpus: typeof corpus }).corpus = corpus;
      const arch = runArchaeology(input);
      let fields = 0;
      for (const e of arch.entities) fields += e.fields.length;
      (summary as { archaeology: StatusSummary["archaeology"] }).archaeology = {
        entities: arch.entities.length,
        fields,
        unknownDdl: arch.unknownDdl.length,
        orphanShapes: arch.orphanShapes.length,
      };
    } catch {
      // ignore
    }
  }

  // Shadow -----------------------------------------------------------
  const shadowLog = resolve(shadowDir, "shadow.ndjson");
  if (existsSync(shadowLog)) {
    let requests = 0;
    let agreed = 0;
    let diverged = 0;
    for (const line of readFileSync(shadowLog, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line) as { divergences?: ReadonlyArray<unknown> };
        requests += 1;
        if ((rec.divergences?.length ?? 0) === 0) agreed += 1;
        else diverged += 1;
      } catch {
        // skip malformed line
      }
    }
    (summary as { shadow: StatusSummary["shadow"] }).shadow = { requests, agreed, diverged };
  }

  // Residual legacy (holes) + insights --------------------------------
  if (project) {
    try {
      const mod = await ingestDirectory(project);
      (summary as { residualLegacy: StatusSummary["residualLegacy"] }).residualLegacy = {
        holeCount: countHoles(mod),
        dialectCounts: countByDialect(mod),
      };
      const insightReport = analyzeModule(mod, corpus ? { corpus } : undefined);
      const top = [...insightReport.opportunities]
        .sort((a, b) => severityRank(b) - severityRank(a) || b.confidence - a.confidence)
        .slice(0, 5)
        .map((op) => ({
          title: op.title,
          severity: op.severity,
          confidence: op.confidence,
          route: op.route ? `${op.route.method} ${op.route.path}` : null,
        }));
      (summary as { insights: StatusSummary["insights"] }).insights = {
        total: insightReport.summary.total,
        byRecognizer: insightReport.summary.byRecognizer as Record<string, number>,
        bySeverity: insightReport.summary.bySeverity as Record<string, number>,
        top,
      };
    } catch {
      // ignore
    }
  } else {
    // A pre-computed insight report on disk is a valid fallback source.
    const preComputed = tryReadJson<InsightReport>(resolve("reports/insight/opportunities.json"));
    if (preComputed) {
      const top = [...preComputed.opportunities]
        .sort((a, b) => severityRank(b) - severityRank(a) || b.confidence - a.confidence)
        .slice(0, 5)
        .map((op) => ({
          title: op.title,
          severity: op.severity,
          confidence: op.confidence,
          route: op.route ? `${op.route.method} ${op.route.path}` : null,
        }));
      (summary as { insights: StatusSummary["insights"] }).insights = {
        total: preComputed.summary.total,
        byRecognizer: preComputed.summary.byRecognizer as Record<string, number>,
        bySeverity: preComputed.summary.bySeverity as Record<string, number>,
        top,
      };
    }
  }

  // Render -----------------------------------------------------------
  if (flags.json) {
    console.log(JSON.stringify(summary, null, 2));
    return 0;
  }

  console.log("chrysalis status");
  console.log("────────────────");
  if (summary.corpus) {
    console.log(`corpus       : ${summary.corpus.traces} traces, ${summary.corpus.routes} routes`);
  } else {
    console.log(`corpus       : (none — pass --traces <dir>)`);
  }
  if (summary.correctness) {
    const c = summary.correctness;
    const pct = (c.aggregate * 100).toFixed(1);
    console.log(`correctness  : ${pct}%  (${c.framesPassed}/${c.framesTotal} frames passed)`);
    for (const e of c.perRoute) {
      const p = (e.correctness * 100).toFixed(1).padStart(5);
      console.log(`               ${p}%  ${e.route}`);
    }
  } else {
    console.log(`correctness  : (none — run 'chrysalis verify' first)`);
  }
  if (summary.archaeology) {
    const a = summary.archaeology;
    console.log(
      `archaeology  : ${a.entities} entities, ${a.fields} fields, ` +
        `${a.unknownDdl} unknown DDL, ${a.orphanShapes} orphan shapes`,
    );
  } else {
    console.log(`archaeology  : (none — pass --schema <schema.sql>)`);
  }
  if (summary.shadow) {
    const s = summary.shadow;
    const pct = s.requests === 0 ? "0.0" : ((s.agreed / s.requests) * 100).toFixed(1);
    console.log(
      `shadow       : ${s.requests} mirrored, ${s.agreed} agreed (${pct}%), ${s.diverged} diverged`,
    );
  } else {
    console.log(`shadow       : (none — run 'chrysalis deploy --mode=shadow' first)`);
  }
  if (summary.residualLegacy) {
    const r = summary.residualLegacy;
    const dialects = Object.entries(r.dialectCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    console.log(`residual PHP : ${r.holeCount} holes   dialects: ${dialects}`);
  } else {
    console.log(`residual PHP : (none — pass --project <php-dir>)`);
  }
  if (summary.insights) {
    const i = summary.insights;
    console.log(
      `insights     : ${i.total} opportunities  ` +
        `(strong=${i.bySeverity["strong"] ?? 0} ` +
        `suggestion=${i.bySeverity["suggestion"] ?? 0} ` +
        `info=${i.bySeverity["info"] ?? 0})`,
    );
    for (const t of i.top) {
      const p = (t.confidence * 100).toFixed(0).padStart(3);
      const where = t.route ?? "(unscoped)";
      console.log(`               [${t.severity.padEnd(10)} ${p}%] ${where}  ${t.title}`);
    }
  } else {
    console.log(`insights     : (none — pass --project <php-dir> or run 'chrysalis insight')`);
  }
  return 0;
}

const [, , cmd, ...rest] = process.argv;

async function main(): Promise<number> {
  if (!cmd || cmd === "--help" || cmd === "-h") {
    printHelp();
    return 0;
  }
  const known = SUBCOMMANDS.some(([c]) => c === cmd);
  if (!known) {
    console.error(`[chrysalis] unknown command: ${cmd}`);
    console.error("run 'chrysalis --help' to see available commands.");
    return 2;
  }
  switch (cmd) {
    case "ingest":
      return await cmdIngest(rest);
    case "emit":
      return await cmdEmit(rest);
    case "convert":
      return await cmdConvert(rest);
    case "observe":
      return await cmdObserve(rest);
    case "corpus":
      return await cmdCorpus(rest);
    case "archaeology":
      return await cmdArchaeology(rest);
    case "verify":
      return await cmdVerify(rest);
    case "deploy":
      return await cmdDeploy(rest);
    case "insight":
      return await cmdInsight(rest);
    case "rewrite":
      return await cmdRewrite(rest);
    case "status":
      return await cmdStatus(rest);
    default:
      console.log(`[chrysalis] '${cmd}' is not implemented yet (Milestone 0 scaffold).`);
      console.log(`[chrysalis] args: ${JSON.stringify(rest)}`);
      return 0;
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[chrysalis] unhandled error:", err);
    process.exit(1);
  },
);
