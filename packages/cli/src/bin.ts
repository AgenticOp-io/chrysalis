#!/usr/bin/env node
/**
 * `chrysalis` — the CLI entrypoint. Thin wrapper over the package APIs.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestDirectory } from "@chrysalis/ingest";
import { countByDialect, countHoles } from "@chrysalis/webir";
import { emit as emitHono } from "@chrysalis/emit-hono";
import { loadObserveConfig, readCorpus, startObserver } from "@chrysalis/oracle";
import { buildReport, replayCorpus, writeReport } from "@chrysalis/verify";

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

function cmdStatus(): number {
  console.log("[chrysalis] status — not yet implemented (Milestone 2).");
  console.log("See ROADMAP.md § Milestone 2 for the planned dashboard.");
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
    case "verify":
      return await cmdVerify(rest);
    case "status":
      return cmdStatus();
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
