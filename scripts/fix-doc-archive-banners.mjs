#!/usr/bin/env node
/** Fix archive banner first lines (idempotent). */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const phaseLine =
  "> **Archive notice:** Closed strategic-plan **phase** — source material for gates and fixtures. Active stack: [`MIGRATION-OS.md`](./MIGRATION-OS.md). Index: [`archive/INDEX.md`](./archive/INDEX.md).\n";
const programLine =
  "> **Archive notice:** Closed **program** — regression and history only. Active stack: [`MIGRATION-OS.md`](./MIGRATION-OS.md). Index: [`archive/INDEX.md`](./archive/INDEX.md).\n";

function fixFile(path) {
  const text = readFileSync(path, "utf8");
  if (!text.startsWith("> **Archive notice:**")) return false;
  const isProgram = text.includes("Closed **program**");
  const rest = text.slice(text.indexOf("\n") + 1);
  writeFileSync(path, (isProgram ? programLine : phaseLine) + rest, "utf8");
  return true;
}

function walk(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) n += walk(path);
    else if (name.endsWith(".md") && fixFile(path)) n++;
  }
  return n;
}

const count = walk(join(import.meta.dirname, "..", "docs"));
console.log(JSON.stringify({ fixed: count }));
