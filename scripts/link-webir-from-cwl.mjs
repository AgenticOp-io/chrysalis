#!/usr/bin/env node
/**
 * Reverse-home `@chrysalis/webir`: Convert packages/webir → junction/symlink
 * at chrysalis-cwl/packages/webir (CWL SoR).
 *
 * Does not invent a second WebIR. See chrysalis-cwl docs/history/WEBIR-FLIP-REQUESTED.md.
 *
 * Usage: node scripts/link-webir-from-cwl.mjs
 */
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LINK = join(CONVERT_ROOT, "packages", "webir");
const TARGET = resolve(CONVERT_ROOT, "../chrysalis-cwl/packages/webir");
const PKG = join(TARGET, "package.json");
const DIST = join(TARGET, "dist", "index.js");

function isReparsePoint(path) {
  if (process.platform !== "win32") {
    try {
      return lstatSync(path).isSymbolicLink();
    } catch {
      return false;
    }
  }
  const r = spawnSync("fsutil", ["reparsepoint", "query", path], { encoding: "utf8" });
  return r.status === 0;
}

function isPhysicalTree(path) {
  if (!existsSync(join(path, "package.json"))) return false;
  if (isReparsePoint(path)) return false;
  try {
    return lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}

function main() {
  if (!existsSync(PKG)) {
    console.error(`CWL WebIR missing: ${PKG}`);
    console.error("Clone/build chrysalis-cwl packages/webir (npm run build:webir).");
    process.exit(1);
  }
  if (!existsSync(DIST)) {
    console.error(`CWL WebIR dist missing: ${DIST}`);
    console.error("From chrysalis-cwl: npm run build:webir");
    process.exit(1);
  }

  mkdirSync(join(CONVERT_ROOT, "packages"), { recursive: true });

  if (existsSync(LINK) && isReparsePoint(LINK) && existsSync(join(LINK, "package.json"))) {
    const name = JSON.parse(readFileSync(join(LINK, "package.json"), "utf8")).name;
    console.log(`ok: packages/webir already reverse-homed → ${TARGET}`);
    console.log(`    package=${name}`);
    return;
  }

  if (existsSync(LINK) && isPhysicalTree(LINK)) {
    console.error(`refusing to destroy physical Convert packages/webir without git removal.`);
    console.error(`Run: git rm -r packages/webir   then re-run this script.`);
    console.error(`(CWL SoR is ${TARGET})`);
    process.exit(1);
  }

  if (existsSync(LINK)) {
    rmSync(LINK, { recursive: true, force: true });
  }

  if (process.platform === "win32") {
    // Directory junction (no admin required for local paths).
    const r = spawnSync("cmd", ["/c", "mklink", "/J", LINK, TARGET], { encoding: "utf8" });
    if (r.status !== 0) {
      console.error(r.stdout || "");
      console.error(r.stderr || "");
      console.error("mklink /J failed — try Developer Mode or run as admin.");
      process.exit(1);
    }
  } else {
    symlinkSync(TARGET, LINK, "dir");
  }

  if (!existsSync(join(LINK, "dist", "index.js"))) {
    console.error(`link created but dist not visible at ${join(LINK, "dist", "index.js")}`);
    process.exit(1);
  }

  console.log(`ok: packages/webir → ${TARGET}`);
  console.log("    SoR: chrysalis-cwl (Convert reverse-home)");
  console.log("    prove: pnpm run hub:webir-resolve-smoke && pnpm run hub:cwl-language-pillar-smoke");
}

main();
