/**
 * nikic/php-parser subprocess bridge: JSON dump from `php/dump-nikic-ast.php`
 * into canonical `PhpAst` via {@link parseNikicJsonRoots} (DESIGN.md D5/D195).
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PhpAst } from "../schema.js";
import { parseNikicJsonRoots } from "./nikic-json.js";

function packageRoot(): string {
  // providers/nikic.ts -> parser-bridge package root
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function dumpScript(): string {
  return join(packageRoot(), "php", "dump-nikic-ast.php");
}

function vendorAutoload(): string {
  return join(packageRoot(), "vendor", "autoload.php");
}

function assertNikicReady(): void {
  if (!existsSync(vendorAutoload())) {
    throw new Error(
      "parser-bridge (nikic): run `composer install` in packages/parser-bridge (vendor/autoload.php missing)",
    );
  }
  if (!existsSync(dumpScript())) {
    throw new Error(`parser-bridge (nikic): missing dump script at ${dumpScript()}`);
  }
}

function phpExecutable(): string {
  return process.env.PHP_BINARY?.trim() || "php";
}

function runNikicDump(args: ReadonlyArray<string>, stdin?: string): string {
  assertNikicReady();
  const php = phpExecutable();
  const script = dumpScript();
  const r = spawnSync(php, [script, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    input: stdin,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const detail = (r.stderr || r.stdout || "").trim() || `exit ${String(r.status)}`;
    throw new Error(`nikic/php-parser subprocess failed: ${detail}`);
  }
  return r.stdout.trim();
}

export async function parseFileWithNikic(path: string): Promise<PhpAst> {
  const rawJson = runNikicDump([path]);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch (e) {
    throw new Error(
      `nikic: invalid JSON from dump-nikic-ast.php: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return parseNikicJsonRoots(parsed, path);
}

export function parseSourceWithNikic(src: string, filename: string): PhpAst {
  const rawJson = runNikicDump(["-"], src);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch (e) {
    throw new Error(
      `nikic: invalid JSON from dump-nikic-ast.php: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return parseNikicJsonRoots(parsed, filename);
}
