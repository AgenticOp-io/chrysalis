#!/usr/bin/env node
/**
 * `chrysalis` — the CLI entrypoint. Thin wrapper over the package APIs.
 */

import { resolve } from "node:path";
import { ingestDirectory } from "@chrysalis/ingest";
import { countByDialect, countHoles } from "@chrysalis/webir";
import { emit as emitHono } from "@chrysalis/emit-hono";

const SUBCOMMANDS = [
  ["init", "Mark a directory as a Chrysalis project"],
  ["observe", "Run the oracle sidecar against a live PHP app"],
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
