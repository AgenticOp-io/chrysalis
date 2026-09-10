#!/usr/bin/env node
/**
 * Materialize workspace:* (and simple registry) deps into CWL junction packages.
 *
 * pnpm can record importers via .pnpmfile.cjs, but still skips linking
 * node_modules when the package realpath lives under chrysalis-cwl.
 * This script creates the same links Convert's physical packages get.
 *
 * Usage: node scripts/link-cwl-junction-workspace-deps.mjs
 * Also: pnpm run sync:junction-deps
 */
import {
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  readFileSync,
  lstatSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const JUNCTION_DIRS = [
  "packages/runtime-cwl",
  "packages/runtime-cwl-browser",
  "packages/runtime-cwl-worker",
  "packages/emit-runtime-cwl",
];

function linkPath(link, target) {
  mkdirSync(dirname(link), { recursive: true });
  if (existsSync(link) || safeLstat(link)) {
    try {
      rmSync(link, { recursive: true, force: true });
    } catch {
      // Windows: remove junction/symlink
      if (process.platform === "win32") {
        spawnSync("cmd", ["/c", "rmdir", link], { encoding: "utf8" });
        if (existsSync(link)) rmSync(link, { force: true });
      }
    }
  }
  if (process.platform === "win32") {
    // Prefer junction for directories; symlink for files.
    const st = lstatSync(target);
    if (st.isDirectory()) {
      const r = spawnSync("cmd", ["/c", "mklink", "/J", link, target], { encoding: "utf8" });
      if (r.status !== 0) {
        const r2 = spawnSync("cmd", ["/c", "mklink", "/D", link, target], { encoding: "utf8" });
        if (r2.status !== 0) {
          throw new Error(`link failed ${link} -> ${target}: ${r.stderr || r.stdout || r2.stderr}`);
        }
      }
    } else {
      const r = spawnSync("cmd", ["/c", "mklink", link, target], { encoding: "utf8" });
      if (r.status !== 0) throw new Error(`file link failed ${link}: ${r.stderr || r.stdout}`);
    }
  } else {
    symlinkSync(target, link, "dir");
  }
}

function safeLstat(p) {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

function resolveWorkspaceTarget(depName) {
  if (!depName.startsWith("@chrysalis/")) return null;
  const short = depName.slice("@chrysalis/".length);
  const target = join(CONVERT_ROOT, "packages", short);
  if (!existsSync(join(target, "package.json"))) {
    throw new Error(`workspace target missing for ${depName}: ${target}`);
  }
  return target;
}

function resolveRegistryTarget(depName) {
  // Prefer root node_modules/.pnpm hoisted or symlink farm
  const candidates = [
    join(CONVERT_ROOT, "node_modules", depName),
    join(CONVERT_ROOT, "node_modules", ".pnpm", "node_modules", depName),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // Search .pnpm store links for @scope/name
  const pnpmDir = join(CONVERT_ROOT, "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) return null;
  // Common: node_modules/@types/node already at root
  return null;
}

function linkDep(pkgDir, depName) {
  const nm = join(CONVERT_ROOT, pkgDir, "node_modules", ...depName.split("/"));
  const ws = resolveWorkspaceTarget(depName);
  if (ws) {
    linkPath(nm, ws);
    return { depName, kind: "workspace", target: ws };
  }
  const reg = resolveRegistryTarget(depName);
  if (reg) {
    linkPath(nm, reg);
    return { depName, kind: "registry", target: reg };
  }
  return { depName, kind: "skip", reason: "no target in Convert node_modules" };
}

function main() {
  const results = [];
  for (const relDir of JUNCTION_DIRS) {
    const pkgPath = join(CONVERT_ROOT, relDir, "package.json");
    if (!existsSync(pkgPath)) {
      results.push({ relDir, error: "missing package.json" });
      continue;
    }
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const linked = [];
    for (const name of Object.keys(deps).sort()) {
      linked.push(linkDep(relDir, name));
    }
    results.push({ relDir, name: pkg.name, linked });
  }
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main();
