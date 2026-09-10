#!/usr/bin/env node
/**
 * CLI fallback: sync pnpm-lock.yaml importers for CWL junction packages.
 *
 * Primary path is `.pnpmfile.cjs` (`afterAllResolved`) during `pnpm install`.
 * Use this script if you need to patch the lockfile without a full install.
 *
 * Windows directory junctions (mklink /J) to ../chrysalis-cwl/packages/* resolve
 * outside the Convert workspace realpath. pnpm still discovers them as workspace
 * projects at install time, but omits them from lockfile `importers:` unless the
 * pnpmfile re-injects them. Empty/missing importers break workspace:* linking
 * after a clean node_modules wipe — also run `pnpm run sync:junction-deps`
 * (postinstall) to materialize links into the junction trees.
 *
 * Usage:
 *   node scripts/sync-cwl-junction-lockfile-importers.mjs
 *   pnpm install   # preferred: pnpmfile injects importers
 *   pnpm run sync:junction-deps
 *
 * Does not invent Nest/LiveView/Flutter/onion runtimes. Does not edit CWL tip.
 */
import { existsSync, readFileSync, writeFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOCK = join(CONVERT_ROOT, "pnpm-lock.yaml");

const JUNCTION_DIRS = [
  "packages/runtime-cwl",
  "packages/runtime-cwl-browser",
  "packages/runtime-cwl-worker",
  "packages/emit-runtime-cwl",
];

function readPkg(relDir) {
  const pkgPath = join(CONVERT_ROOT, relDir, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(`missing ${relDir}/package.json (run link-cwl-packages-from-cwl.mjs first)`);
  }
  try {
    const real = realpathSync(join(CONVERT_ROOT, relDir));
    if (!real.toLowerCase().includes("chrysalis-cwl")) {
      console.warn(`warn: ${relDir} realpath is not under chrysalis-cwl: ${real}`);
    }
  } catch {
    /* ignore */
  }
  return JSON.parse(readFileSync(pkgPath, "utf8"));
}

/** Collect specifier -> resolved version from existing importer blocks. */
function collectRegistryVersions(importersBlock) {
  const map = new Map(); // name -> Map(specifier -> version)
  const re =
    /^ {4}('[@A-Za-z0-9_./-]+'|[A-Za-z0-9_./-]+):\n {6}specifier: (.+)\n {6}version: (.+)$/gm;
  let m;
  while ((m = re.exec(importersBlock))) {
    const name = m[1].replace(/^'|'$/g, "");
    const specifier = m[2].trim();
    const version = m[3].trim();
    if (specifier.startsWith("workspace:") || specifier.startsWith("file:") || version.startsWith("link:")) {
      continue;
    }
    if (!map.has(name)) map.set(name, new Map());
    map.get(name).set(specifier, version);
  }
  return map;
}

function quoteKey(name) {
  return /[@/]/.test(name) ? `'${name}'` : name;
}

function workspaceLinkTarget(fromImporterDir, depName) {
  // @chrysalis/foo -> packages/foo (local convention)
  if (!depName.startsWith("@chrysalis/")) {
    throw new Error(`expected @chrysalis/* workspace dep, got ${depName}`);
  }
  const short = depName.slice("@chrysalis/".length);
  const targetAbs = join(CONVERT_ROOT, "packages", short);
  const fromAbs = join(CONVERT_ROOT, fromImporterDir);
  let rel = relative(fromAbs, targetAbs).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

function renderDepEntries(fromImporterDir, deps, registryVersions) {
  const names = Object.keys(deps).sort();
  const lines = [];
  for (const name of names) {
    const specifier = String(deps[name]);
    let version;
    if (specifier.startsWith("workspace:")) {
      version = `link:${workspaceLinkTarget(fromImporterDir, name)}`;
    } else {
      const bySpec = registryVersions.get(name);
      version = bySpec?.get(specifier) || bySpec?.values().next().value;
      if (!version) {
        // Fallbacks for known root pins
        if (name === "@types/node") version = "20.19.41";
        else if (name === "vitest") version = "4.1.5";
        else {
          throw new Error(
            `cannot resolve lock version for ${name}@${specifier} in ${fromImporterDir}; pin appears nowhere in lockfile importers`,
          );
        }
      }
    }
    lines.push(`      ${quoteKey(name)}:`);
    lines.push(`        specifier: ${specifier}`);
    lines.push(`        version: ${version}`);
  }
  return lines;
}

function renderImporter(relDir, pkg, registryVersions) {
  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};
  const hasDeps = Object.keys(deps).length > 0;
  const hasDev = Object.keys(devDeps).length > 0;
  if (!hasDeps && !hasDev) {
    return `  ${relDir}: {}\n`;
  }
  const lines = [`  ${relDir}:`];
  if (hasDeps) {
    lines.push(`    dependencies:`);
    lines.push(...renderDepEntries(relDir, deps, registryVersions));
  }
  if (hasDev) {
    lines.push(`    devDependencies:`);
    lines.push(...renderDepEntries(relDir, devDeps, registryVersions));
  }
  return lines.join("\n") + "\n";
}

/** Split importers section into ordered {key, block} entries. */
function parseImporterEntries(importersBody) {
  const entries = [];
  const re = /^  (\S+):\n/gm;
  const starts = [];
  let m;
  while ((m = re.exec(importersBody))) {
    starts.push({ key: m[1], index: m.index });
  }
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].index;
    const end = i + 1 < starts.length ? starts[i + 1].index : importersBody.length;
    let block = importersBody.slice(start, end);
    if (!block.endsWith("\n")) block += "\n";
    // keep a trailing blank line separation consistent
    entries.push({ key: starts[i].key, block });
  }
  return entries;
}

function main() {
  if (!existsSync(LOCK)) throw new Error(`missing ${LOCK}`);
  const text = readFileSync(LOCK, "utf8");
  const marker = "\nimporters:\n";
  const start = text.indexOf(marker);
  if (start < 0) throw new Error("pnpm-lock.yaml: no importers: section");
  const bodyStart = start + marker.length;
  const nextTop = text.slice(bodyStart).match(/\n[a-zA-Z]/);
  if (!nextTop) throw new Error("pnpm-lock.yaml: cannot find end of importers");
  const bodyEnd = bodyStart + nextTop.index;
  const before = text.slice(0, bodyStart);
  const importersBody = text.slice(bodyStart, bodyEnd);
  const after = text.slice(bodyEnd);

  const registryVersions = collectRegistryVersions(importersBody);
  const entries = parseImporterEntries(importersBody);
  const byKey = new Map(entries.map((e) => [e.key, e]));

  const upserted = [];
  for (const relDir of JUNCTION_DIRS) {
    const pkg = readPkg(relDir);
    const block = renderImporter(relDir, pkg, registryVersions);
    byKey.set(relDir, { key: relDir, block: block.endsWith("\n") ? block : block + "\n" });
    upserted.push({ dir: relDir, name: pkg.name });
  }

  // Rebuild importers: keep non-junction keys in original order; insert junction keys sorted among packages/*
  const junctionSet = new Set(JUNCTION_DIRS);
  const kept = entries.filter((e) => !junctionSet.has(e.key));
  const allKeys = kept.map((e) => e.key);
  for (const k of JUNCTION_DIRS) {
    if (!allKeys.includes(k)) allKeys.push(k);
  }
  // Sort only the packages/* keys, keep "." first if present
  const root = allKeys.filter((k) => k === ".");
  const pkgs = allKeys.filter((k) => k !== ".").sort((a, b) => a.localeCompare(b));
  const ordered = [...root, ...pkgs];

  let newBody = "";
  for (const key of ordered) {
    const e = byKey.get(key);
    if (!e) continue;
    let b = e.block;
    if (!b.endsWith("\n")) b += "\n";
    // ensure single blank line between importer entries
    if (newBody && !newBody.endsWith("\n\n")) {
      if (newBody.endsWith("\n")) newBody += "\n";
      else newBody += "\n\n";
    }
    newBody += b.trimEnd() + "\n";
  }
  if (!newBody.endsWith("\n")) newBody += "\n";

  const out = before + newBody + after;
  if (out === text) {
    console.log(JSON.stringify({ ok: true, changed: false, upserted }, null, 2));
    return;
  }
  writeFileSync(LOCK, out, "utf8");
  console.log(JSON.stringify({ ok: true, changed: true, upserted }, null, 2));
  console.log("Next: pnpm install  # materialize workspace links into junction packages");
}

main();
