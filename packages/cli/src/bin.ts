#!/usr/bin/env node
/**
 * `chrysalis` — the CLI entrypoint. Thin wrapper over the package APIs.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ingestDirectory } from "@chrysalis/ingest";
import { countByDialect, countHoles, irCoverageStats, type Module } from "@chrysalis/webir";
import { emit as emitFastify } from "@chrysalis/emit-fastify";
import { emit as emitHono } from "@chrysalis/emit-hono";
import { loadObserveConfig, readCorpus, startObserver } from "@chrysalis/oracle";
import { buildReport, replayCorpus, writeReport } from "@chrysalis/verify";
import {
  domainTypesByTable,
  emitTypes,
  runArchaeology,
  TRACE_LITERAL_UNION_PROVENANCE_PREFIX,
} from "@chrysalis/archaeology";
import {
  startChimera,
  type CanarySettings,
  type Mode,
  type RouteRule,
} from "@chrysalis/runtime-chimera";
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
import { runVerifiedRepairLoop, stubRepairProposer } from "@chrysalis/repair";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SUBCOMMANDS = [
  ["init", "Mark a directory as a Chrysalis project"],
  ["observe", "Run the oracle sidecar against a live PHP app"],
  ["corpus", "Read + summarize a traces/ directory"],
  ["ingest", "Translate PHP source into a WebIR module"],
  ["archaeology", "Recover schema from DB + forms + traces"],
  ["emit", "Emit a target project from a WebIR module (e.g. --target=hono|fastify)"],
  ["convert", "One-shot ingest + emit (Milestone 1 convenience)"],
  ["verify", "Replay oracle traces against the generated code"],
  ["deploy", "Configure the chimera router (--mode=shadow|canary|cutover)"],
  ["insight", "Catalog anti-patterns on the WebIR and propose idiomatic replacements"],
  [
    "rewrite",
    "Apply IR rewrites from insight; optional --http-replay-backends=hono,fastify",
  ],
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
    console.error(
      "usage: chrysalis emit <php-project-dir> --out <out> [--target=hono|fastify] [--schema <schema.sql>]",
    );
    return 2;
  }
  if (target !== "hono" && target !== "fastify") {
    console.error(`error: unsupported emit target '${target}'. Supported: hono, fastify`);
    return 2;
  }
  const mod = await ingestDirectory(resolve(root));
  const outAbs = resolve(outDir);
  const schemaPath = typeof flags.schema === "string" ? resolve(flags.schema) : null;
  let domainMap: Record<string, string> | undefined;
  let schemaReport: ReturnType<typeof runArchaeology> | undefined;
  if (schemaPath) {
    schemaReport = runArchaeology({ schemaPath });
    domainMap = domainTypesByTable(schemaReport);
    mkdirSync(join(outAbs, "src"), { recursive: true });
    writeFileSync(join(outAbs, "src", "domain.ts"), emitTypes(schemaReport));
  }
  const emitOpts = {
    module: mod,
    outDir: outAbs,
    ...(schemaReport ? { schemaReport } : {}),
    ...(domainMap ? { domainTypesByTable: domainMap } : {}),
  };
  const res =
    target === "fastify" ? await emitFastify(emitOpts) : await emitHono(emitOpts);
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
  let outboundHttp = 0;
  let mailSend = 0;
  for (const t of corpus.traces) {
    for (const e of t.events) {
      if (e.type === "http.outbound") outboundHttp += 1;
      if (e.type === "mail.send") mailSend += 1;
    }
    const req = t.events.find((e) => e.type === "http.request");
    if (!req || req.type !== "http.request") continue;
    const key = `${req.method} ${req.path}`;
    byRoute.set(key, (byRoute.get(key) ?? 0) + 1);
  }
  for (const [route, count] of [...byRoute.entries()].sort()) {
    console.log(`  ${route.padEnd(30)} ${count}`);
  }
  if (outboundHttp > 0 || mailSend > 0) {
    console.log(`  side effects: http.outbound=${outboundHttp} mail.send=${mailSend}`);
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
      "usage: chrysalis verify <traces-dir> --base-url <url> [--report <dir>] [--threshold 0.9] [--no-recorded-sql] [--project <php-root>]",
    );
    return 2;
  }
  const reportDir = typeof flags.report === "string" ? flags.report : "reports/verify";
  const threshold = typeof flags.threshold === "string" ? Number.parseFloat(flags.threshold) : 0.8;
  const projectRoot = typeof flags.project === "string" ? resolve(flags.project) : null;

  const corpus = readCorpus({ root: resolve(corpusRoot) });
  console.log(`[verify] loaded ${corpus.traces.length} traces from ${corpusRoot}`);
  let verifyModule: Module | undefined;
  if (projectRoot) {
    verifyModule = await ingestDirectory(projectRoot);
    console.log(`[verify] IR divergence attribution enabled (--project ${projectRoot})`);
  }
  console.log(`[verify] replaying against ${baseUrl} ...`);

  const outcomes = await replayCorpus(corpus, {
    baseUrl,
    recordedSqlReplay: flags["no-recorded-sql"] !== true,
    ...(verifyModule ? { module: verifyModule } : {}),
  });
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
      if (d.attributedNodeIds && d.attributedNodeIds.length > 0) {
        console.log(`      IR nodes: ${d.attributedNodeIds.join(", ")}`);
      }
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

async function cmdRepair(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const corpusRoot = pos[0];
  const baseUrl = typeof flags["base-url"] === "string" ? flags["base-url"] : null;
  const projectRoot = typeof flags.project === "string" ? resolve(flags.project) : null;
  if (!corpusRoot || !baseUrl || !projectRoot) {
    console.error(
      "usage: chrysalis repair <traces-dir> --base-url <url> --project <php-root> [--max-iter 5] [--endpoint \"METHOD /path\"] [--no-recorded-sql]",
    );
    return 2;
  }
  const maxIterRaw =
    typeof flags["max-iter"] === "string" ? Number.parseInt(flags["max-iter"], 10) : 5;
  const maxIterations = Number.isFinite(maxIterRaw) && maxIterRaw > 0 ? maxIterRaw : 5;
  const endpoint = typeof flags.endpoint === "string" ? flags.endpoint : undefined;

  const corpus = readCorpus({ root: resolve(corpusRoot) });
  const webirModule = await ingestDirectory(projectRoot);
  console.log(`[repair] corpus ${corpus.traces.length} traces; IR from ${projectRoot}`);

  const result = await runVerifiedRepairLoop({
    corpus,
    initialModule: webirModule,
    replayBase: {
      baseUrl,
      recordedSqlReplay: flags["no-recorded-sql"] !== true,
    },
    proposer: stubRepairProposer(),
    maxIterations,
    ...(endpoint !== undefined ? { endpoint } : {}),
  });

  if (result.ok) {
    console.log(`[repair] corpus verifies (${result.iterationsRun} repair iteration(s))`);
    return 0;
  }

  const failed = result.finalOutcomes.filter((o) => !o.ok);
  console.error(`[repair] still failing: ${failed.length} trace(s)`);
  if (result.message) console.error(`[repair] ${result.message}`);
  for (const o of failed.slice(0, 5)) {
    console.error(`  ${o.route} trace=${o.traceId}`);
    if (o.attributedNodeIds?.length) {
      console.error(`    IR nodes: ${o.attributedNodeIds.join(", ")}`);
    }
  }
  console.error(
    "[repair] default proposer is a stub; implement RepairProposer or integrate an LLM (see @chrysalis/repair).",
  );
  return 1;
}

interface DeployConfigFile {
  readonly mode?: Mode;
  readonly legacy?: string;
  readonly modern?: string;
  readonly port?: number;
  readonly host?: string;
  readonly rules?: ReadonlyArray<RouteRule>;
  readonly shadowLogDir?: string;
  readonly canary?: {
    readonly percentModern?: number;
    readonly salt?: string;
    readonly stickinessCookie?: string;
    readonly stickinessHeader?: string;
  };
}

async function cmdDeploy(args: string[]): Promise<number> {
  const flags = parseFlags(args);
  const configPath = typeof flags.config === "string" ? resolve(flags.config) : null;
  const fileCfg: DeployConfigFile = configPath
    ? (JSON.parse(readFileSync(configPath, "utf8")) as DeployConfigFile)
    : {};

  const modeRaw = typeof flags.mode === "string" ? flags.mode : fileCfg.mode ?? "legacy";
  if (
    modeRaw !== "legacy" &&
    modeRaw !== "cutover" &&
    modeRaw !== "shadow" &&
    modeRaw !== "canary"
  ) {
    console.error(`usage: chrysalis deploy --mode=legacy|cutover|shadow|canary`);
    console.error(`  unknown mode: ${modeRaw}`);
    return 2;
  }
  const legacy = typeof flags.legacy === "string" ? flags.legacy : fileCfg.legacy;
  const modern = typeof flags.modern === "string" ? flags.modern : fileCfg.modern;
  if (!legacy || !modern) {
    console.error(
      "usage: chrysalis deploy --mode=<legacy|cutover|shadow|canary> --legacy <url> --modern <url>\n" +
        "                       [--port 8080] [--host 127.0.0.1]\n" +
        "                       [--config chimera.json] [--shadow-log-dir reports/shadow]\n" +
        "                       [--canary-percent 0-100] [--canary-salt <str>]\n" +
        "                       [--canary-cookie <name>] [--canary-header <name>]",
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

  let canary: CanarySettings | undefined;
  if (modeRaw === "canary") {
    const pctFlag = flags["canary-percent"];
    const pctRaw =
      typeof pctFlag === "string"
        ? Number.parseFloat(pctFlag)
        : fileCfg.canary?.percentModern;
    if (pctRaw === undefined || Number.isNaN(pctRaw)) {
      console.error(
        "error: canary mode requires --canary-percent <0-100> or config.canary.percentModern",
      );
      return 2;
    }
    const saltFlag = flags["canary-salt"];
    const salt =
      typeof saltFlag === "string"
        ? saltFlag
        : fileCfg.canary?.salt ?? "chrysalis-canary-v1";
    const cookieFlag = flags["canary-cookie"];
    const stickinessCookie =
      typeof cookieFlag === "string" ? cookieFlag : fileCfg.canary?.stickinessCookie;
    const headerFlag = flags["canary-header"];
    const stickinessHeader =
      typeof headerFlag === "string" ? headerFlag : fileCfg.canary?.stickinessHeader;
    canary = {
      percentModern: Math.min(100, Math.max(0, pctRaw)),
      salt,
      ...(stickinessCookie ? { stickinessCookie } : {}),
      ...(stickinessHeader ? { stickinessHeader } : {}),
    };
  }

  console.log(`[deploy] mode:       ${modeRaw}`);
  console.log(`[deploy] legacy:     ${legacy}`);
  console.log(`[deploy] modern:     ${modern}`);
  console.log(`[deploy] listening:  http://${host}:${port}`);
  console.log(`[deploy] rules:      ${rules.length}`);
  if (shadowLogDir) console.log(`[deploy] shadow log: ${shadowLogDir}`);
  if (canary) {
    console.log(`[deploy] canary:     ${canary.percentModern}% modern (salt len=${canary.salt.length})`);
    if (canary.stickinessCookie) console.log(`[deploy] canary cookie: ${canary.stickinessCookie}`);
    if (canary.stickinessHeader) console.log(`[deploy] canary header: ${canary.stickinessHeader}`);
  }

  const handle = await startChimera({
    mode: modeRaw,
    legacy,
    modern,
    rules,
    host,
    port,
    ...(shadowLogDir ? { shadowLogDir: resolve(shadowLogDir) } : {}),
    ...(canary ? { canary } : {}),
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

type EmitTarget = "hono" | "fastify";

async function loadEmittedFetch(
  outDir: string,
  target: EmitTarget,
): Promise<typeof fetch> {
  const { tsImport } = await import("tsx/esm/api");
  const abs = resolve(outDir);
  const parentURL = pathToFileURL(join(abs, "package.json")).href;
  if (target === "hono") {
    const imported = (await tsImport("./src/server.ts", parentURL)) as {
      app: { fetch: typeof fetch };
    };
    return imported.app.fetch.bind(imported.app) as typeof fetch;
  }
  const imported = (await tsImport("./src/server.ts", parentURL)) as {
    fetch: typeof fetch;
  };
  return imported.fetch;
}

function emitDirForBackend(
  baseOut: string,
  backend: EmitTarget,
  backends: ReadonlyArray<EmitTarget>,
): string {
  if (backend === "hono") return resolve(baseOut);
  if (backends.length === 1 && backends[0] === "fastify") return resolve(baseOut);
  return resolve(`${baseOut}-fastify`);
}

/** Comma-separated `hono`, `fastify`; default `[fallback]`. */
function parseHttpReplayBackends(
  raw: string | boolean | undefined,
  fallback: EmitTarget,
): EmitTarget[] | null {
  if (raw === undefined || typeof raw === "boolean") {
    return [fallback];
  }
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) return [fallback];
  const out: EmitTarget[] = [];
  for (const p of parts) {
    if (p !== "hono" && p !== "fastify") {
      console.error(
        `error: --http-replay-backends entries must be hono and/or fastify (got '${p}')`,
      );
      return null;
    }
    const t = p as EmitTarget;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

async function cmdRewrite(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const root = pos[0];
  const outDir = typeof flags.out === "string" ? flags.out : null;
  const emitTarget: EmitTarget =
    typeof flags.target === "string" && flags.target === "fastify" ? "fastify" : "hono";
  if (typeof flags.target === "string" && flags.target !== "hono" && flags.target !== "fastify") {
    console.error(`error: unsupported --target '${flags.target}'. Supported: hono, fastify`);
    return 2;
  }
  if (!root) {
    console.error(
      "usage: chrysalis rewrite <php-project-dir> [--out <ts-out>]\n" +
        "                         [--target=hono|fastify]\n" +
        "                         [--traces <dir>] [--min-confidence 0.75]\n" +
        "                         [--passes <id,id,...>] [--report <rewrite.json>]\n" +
        "                         [--no-post-verify] [--verify-behavior]\n" +
        "                         [--http-replay <traces-dir>] [--http-replay-backends=hono,fastify]\n" +
        "                         [--http-replay-skip-install]\n" +
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
  const httpReplayTargets = httpReplayRoot
    ? parseHttpReplayBackends(flags["http-replay-backends"], emitTarget)
    : null;
  if (httpReplayRoot && httpReplayTargets === null) {
    return 2;
  }

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
    const backends = httpReplayTargets!;
    try {
      result = await applyRewritesAsync(mod, insight.opportunities, DEFAULT_PASSES, {
        ...rewriteOptsBase,
        httpReplay: {
          corpus: replayCorpusForHttp!,
          baseUrl: "http://127.0.0.1",
          resolveFetches: backends.map((t) => ({
            label: t,
            resolveFetch: async (rewritten) => {
              const dir = emitDirForBackend(outAbs, t, backends);
              if (t === "fastify") {
                await emitFastify({ module: rewritten, outDir: dir });
              } else {
                await emitHono({ module: rewritten, outDir: dir });
              }
              emittedForHttpReplay = true;
              if (!httpReplaySkipInstall) {
                npmInstallEmitted(dir);
              }
              return loadEmittedFetch(dir, t);
            },
          })),
        },
      });
    } catch (err) {
      console.error(`[rewrite] http-replay pipeline failed: ${String(err)}`);
      return 1;
    }
    if (result.report.httpReplayVerify && !result.report.httpReplayVerify.ok) {
      try {
        for (const t of backends) {
          const dir = emitDirForBackend(outAbs, t, backends);
          if (t === "fastify") {
            await emitFastify({ module: result.module, outDir: dir });
          } else {
            await emitHono({ module: result.module, outDir: dir });
          }
        }
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
    const emitRes =
      emitTarget === "fastify"
        ? await emitFastify({ module: result.module, outDir: outAbs })
        : await emitHono({ module: result.module, outDir: outAbs });
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
    if (hr.backends && hr.backends.length > 1) {
      for (const b of hr.backends) {
        const n = b.outcomes.length;
        const passed = b.outcomes.filter((o) => o.ok).length;
        console.log(
          `\nhttp-replay (${b.label}) : ${b.ok ? "ok" : "FAILED"}   ` +
            `(frames ${passed}/${n}${b.failedRoutes.length ? `; failed: ${b.failedRoutes.join(", ")}` : ""})`,
        );
        if (!b.ok) {
          for (const o of b.outcomes) {
            if (o.ok) continue;
            console.log(
              `  ✗ ${o.route} — ${o.diff.divergences.map((d) => d.kind).join(", ") || "divergence"}`,
            );
          }
        }
      }
      if (!hr.ok) {
        console.log("(batch rolled back — HTTP replay diverged from corpus)");
      }
    } else {
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

interface StatusCorrectnessBackend {
  readonly label: string;
  readonly aggregate: number;
  readonly framesPassed: number;
  readonly framesTotal: number;
  readonly perRoute: Array<{ route: string; correctness: number }>;
}

interface StatusSummary {
  readonly corpus: {
    traces: number;
    routes: number;
    /** D32: `http.outbound` events summed across all traces. */
    httpOutbound?: number;
    /** D32: `mail.send` events summed across all traces. */
    mailSend?: number;
  } | null;
  readonly correctness: {
    /** Worst backend when `byBackend` is set (portability bar). */
    readonly aggregate: number;
    readonly framesPassed: number;
    readonly framesTotal: number;
    readonly perRoute: Array<{ route: string; correctness: number }>;
    /** D25-style layout: `reports/verify/hono`, `reports/verify/fastify`. */
    readonly byBackend?: ReadonlyArray<StatusCorrectnessBackend>;
  } | null;
  readonly archaeology: {
    readonly entities: number;
    readonly fields: number;
    readonly unknownDdl: number;
    readonly orphanShapes: number;
    /** Fields with at least one `@chrysalis-conflict` (DDL vs traces, enum mismatch, …). */
    readonly fieldsWithConflicts: number;
    /** Fields promoted to string-literal unions from `sql.query.rows` (D28). */
    readonly fieldsWithTraceLiteralUnions: number;
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
  /**
   * Milestone 4 dashboard roll-up (DESIGN success metrics). Optional sidecars:
   * `reports/migration/idiomaticity.json` `{ "pct": 0..1 }`,
   * `residual-legacy.json` `{ "legacyRequestPct": 0..100 }`.
   */
  migration: {
    readonly coverage: {
      readonly pct: number;
      readonly nodes: number;
      readonly holes: number;
    } | null;
    readonly correctness: number | null;
    readonly idiomaticity: number | null;
    readonly residualLegacyRequestPct: number | null;
  };
}

function tryReadJson<T>(path: string): T | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

type VerifyReportJson = {
  aggregate: { correctness: number; framesPassed: number; framesTotal: number };
  endpoints: Array<{ route: string; correctness: number }>;
};

function archaeologyDashboardStats(arch: ReturnType<typeof runArchaeology>): NonNullable<
  StatusSummary["archaeology"]
> {
  let fields = 0;
  let fieldsWithConflicts = 0;
  let fieldsWithTraceLiteralUnions = 0;
  for (const e of arch.entities) {
    for (const f of e.fields) {
      fields += 1;
      if (f.conflicts.length > 0) fieldsWithConflicts += 1;
      if (
        f.provenance.some(
          (p) =>
            p.kind === "trace" && p.detail.startsWith(TRACE_LITERAL_UNION_PROVENANCE_PREFIX),
        )
      ) {
        fieldsWithTraceLiteralUnions += 1;
      }
    }
  }
  return {
    entities: arch.entities.length,
    fields,
    unknownDdl: arch.unknownDdl.length,
    orphanShapes: arch.orphanShapes.length,
    fieldsWithConflicts,
    fieldsWithTraceLiteralUnions,
  };
}

function correctnessFromVerifyReport(r: VerifyReportJson): Omit<
  StatusCorrectnessBackend,
  "label"
> {
  return {
    aggregate: r.aggregate.correctness,
    framesPassed: r.aggregate.framesPassed,
    framesTotal: r.aggregate.framesTotal,
    perRoute: r.endpoints.map((e) => ({ route: e.route, correctness: e.correctness })),
  };
}

/** `summary.json` from `writeReport`, optional legacy `correctness.json`, or D25 subdirs. */
function readCorrectnessForStatus(reportDir: string): StatusSummary["correctness"] | null {
  const root = resolve(reportDir);
  const single =
    tryReadJson<VerifyReportJson>(join(root, "summary.json")) ??
    tryReadJson<VerifyReportJson>(join(root, "correctness.json"));
  if (single) {
    const c = correctnessFromVerifyReport(single);
    return {
      aggregate: c.aggregate,
      framesPassed: c.framesPassed,
      framesTotal: c.framesTotal,
      perRoute: c.perRoute,
    };
  }

  const subs = ["hono", "fastify"] as const;
  const backends: StatusCorrectnessBackend[] = [];
  for (const id of subs) {
    const raw = tryReadJson<VerifyReportJson>(join(root, id, "summary.json"));
    if (raw) backends.push({ label: id, ...correctnessFromVerifyReport(raw) });
  }
  if (backends.length === 0) return null;
  if (backends.length === 1) {
    const b = backends[0]!;
    return {
      aggregate: b.aggregate,
      framesPassed: b.framesPassed,
      framesTotal: b.framesTotal,
      perRoute: b.perRoute,
    };
  }
  const worst = backends.reduce((a, b) => (a.aggregate <= b.aggregate ? a : b));
  return {
    aggregate: worst.aggregate,
    framesPassed: worst.framesPassed,
    framesTotal: worst.framesTotal,
    perRoute: worst.perRoute,
    byBackend: backends,
  };
}

async function cmdStatus(args: string[]): Promise<number> {
  const flags = parseFlags(args);
  const project = typeof flags.project === "string" ? resolve(flags.project) : null;
  const tracesDir = typeof flags.traces === "string" ? resolve(flags.traces) : "traces";
  const reportDir = typeof flags.report === "string" ? resolve(flags.report) : "reports/verify";
  const shadowDir = typeof flags.shadow === "string" ? resolve(flags.shadow) : "reports/shadow";
  const schemaPath = typeof flags.schema === "string" ? resolve(flags.schema) : null;

  const migrationReportsDir =
    typeof flags["migration-reports"] === "string"
      ? resolve(flags["migration-reports"])
      : resolve("reports/migration");

  const summary: StatusSummary = {
    corpus: null,
    correctness: null,
    archaeology: null,
    shadow: null,
    residualLegacy: null,
    insights: null,
    migration: {
      coverage: null,
      correctness: null,
      idiomaticity: null,
      residualLegacyRequestPct: null,
    },
  };

  // Corpus ------------------------------------------------------------
  let corpus: ReturnType<typeof readCorpus> | null = null;
  if (existsSync(tracesDir)) {
    try {
      corpus = readCorpus({ root: tracesDir });
      const routes = new Set<string>();
      let httpOutbound = 0;
      let mailSend = 0;
      for (const t of corpus.traces) {
        const req = t.events.find((e) => e.type === "http.request");
        if (req && req.type === "http.request") routes.add(`${req.method} ${req.path}`);
        for (const e of t.events) {
          if (e.type === "http.outbound") httpOutbound += 1;
          if (e.type === "mail.send") mailSend += 1;
        }
      }
      (summary as { corpus: StatusSummary["corpus"] }).corpus = {
        traces: corpus.traces.length,
        routes: routes.size,
        ...(httpOutbound > 0 ? { httpOutbound } : {}),
        ...(mailSend > 0 ? { mailSend } : {}),
      };
    } catch {
      // ignore; corpus simply stays null
    }
  }

  // Correctness -------------------------------------------------------
  const correctness = readCorrectnessForStatus(reportDir);
  if (correctness) {
    (summary as { correctness: StatusSummary["correctness"] }).correctness = correctness;
  }

  // Archaeology ------------------------------------------------------
  if (schemaPath && existsSync(schemaPath)) {
    try {
      const input: Parameters<typeof runArchaeology>[0] = { schemaPath };
      if (corpus) (input as { corpus: typeof corpus }).corpus = corpus;
      const arch = runArchaeology(input);
      (summary as { archaeology: StatusSummary["archaeology"] }).archaeology =
        archaeologyDashboardStats(arch);
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
  let ingestedMod: Module | null = null;
  if (project) {
    try {
      const mod = await ingestDirectory(project);
      ingestedMod = mod;
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

  // Milestone 4 roll-up (coverage + optional sidecars) ----------------
  const idiomaticityJson = tryReadJson<{ pct: number }>(
    join(migrationReportsDir, "idiomaticity.json"),
  );
  const residualLegacyJson = tryReadJson<{ legacyRequestPct: number }>(
    join(migrationReportsDir, "residual-legacy.json"),
  );
  summary.migration = {
    coverage: ingestedMod
      ? (() => {
          const s = irCoverageStats(ingestedMod);
          return { pct: s.coverage, nodes: s.nodeCount, holes: s.holeCount };
        })()
      : null,
    correctness: summary.correctness?.aggregate ?? null,
    idiomaticity:
      idiomaticityJson != null &&
      typeof idiomaticityJson.pct === "number" &&
      idiomaticityJson.pct >= 0 &&
      idiomaticityJson.pct <= 1
        ? idiomaticityJson.pct
        : null,
    residualLegacyRequestPct:
      residualLegacyJson != null &&
      typeof residualLegacyJson.legacyRequestPct === "number" &&
      residualLegacyJson.legacyRequestPct >= 0 &&
      residualLegacyJson.legacyRequestPct <= 100
        ? residualLegacyJson.legacyRequestPct
        : null,
  };

  // Render -----------------------------------------------------------
  if (flags.json) {
    console.log(JSON.stringify(summary, null, 2));
    return 0;
  }

  console.log("chrysalis status");
  console.log("────────────────");
  if (summary.corpus) {
    const c = summary.corpus;
    const side =
      (c.httpOutbound ?? 0) > 0 || (c.mailSend ?? 0) > 0
        ? `  oracle side-effects: http.outbound=${c.httpOutbound ?? 0} mail.send=${c.mailSend ?? 0}`
        : "";
    console.log(`corpus       : ${c.traces} traces, ${c.routes} routes${side}`);
  } else {
    console.log(`corpus       : (none — pass --traces <dir>)`);
  }
  if (summary.correctness) {
    const c = summary.correctness;
    if (c.byBackend && c.byBackend.length > 1) {
      const pct = (c.aggregate * 100).toFixed(1);
      console.log(
        `correctness  : worst ${pct}%  (${c.framesPassed}/${c.framesTotal} frames, limiting backend)  [dual verify]`,
      );
      for (const b of c.byBackend) {
        const bp = (b.aggregate * 100).toFixed(1);
        console.log(
          `               ${b.label.padEnd(8)} ${bp}%  (${b.framesPassed}/${b.framesTotal} frames)`,
        );
        for (const e of b.perRoute) {
          const p = (e.correctness * 100).toFixed(1).padStart(5);
          console.log(`                        ${p}%  ${e.route}`);
        }
      }
    } else {
      const pct = (c.aggregate * 100).toFixed(1);
      console.log(`correctness  : ${pct}%  (${c.framesPassed}/${c.framesTotal} frames passed)`);
      for (const e of c.perRoute) {
        const p = (e.correctness * 100).toFixed(1).padStart(5);
        console.log(`               ${p}%  ${e.route}`);
      }
    }
  } else {
    console.log(`correctness  : (none — run 'chrysalis verify' or verify-tiny-blog first)`);
  }
  if (summary.archaeology) {
    const a = summary.archaeology;
    console.log(
      `archaeology  : ${a.entities} entities, ${a.fields} fields, ` +
        `${a.unknownDdl} unknown DDL, ${a.orphanShapes} orphan shapes, ` +
        `${a.fieldsWithConflicts} field conflict(s), ${a.fieldsWithTraceLiteralUnions} trace literal union(s)`,
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
  const mig = summary.migration;
  const covStr =
    mig.coverage != null
      ? `${(mig.coverage.pct * 100).toFixed(1)}% (${mig.coverage.nodes} nodes, ${mig.coverage.holes} holes)`
      : "— (pass --project for IR coverage)";
  const corrStr =
    mig.correctness != null ? `${(mig.correctness * 100).toFixed(1)}%` : "—";
  const idioStr =
    mig.idiomaticity != null ? `${(mig.idiomaticity * 100).toFixed(1)}%` : "—";
  const resStr =
    mig.residualLegacyRequestPct != null
      ? `${mig.residualLegacyRequestPct.toFixed(1)}% legacy`
      : "—";
  console.log(
    `migration(M4): coverage ${covStr}  correctness ${corrStr}  idiomaticity ${idioStr}  residual ${resStr}`,
  );
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
    case "repair":
      return await cmdRepair(rest);
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
