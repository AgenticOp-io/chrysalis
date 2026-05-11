#!/usr/bin/env node
/**
 * Builds a documentation-only tree (and optional .tar.gz) for external technical review.
 * Output: build/advisor-package/chrysalis-advisor-docs/ (+ .tar.gz when tar is available).
 * See docs/TECHNICAL-ADVISOR-PACK.md.
 */
import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const base = join(root, "build", "advisor-package");
const outDir = join(base, "chrysalis-advisor-docs");

const rootFiles = [
  "DESIGN.md",
  "ROADMAP.md",
  "AGENTS.md",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "pnpm-workspace.yaml",
  "package.json",
];

const docFiles = [
  "docs/README.md",
  "docs/TECHNICAL-ADVISOR-PACK.md",
  "docs/REQUIREMENTS-AND-SPEC.md",
  "docs/WHITEPAPER.md",
  "docs/INSTALLATION.md",
  "docs/OPERATIONS.md",
  "docs/ADMINISTRATION.md",
  "docs/AGENTICOP.md",
  "docs/COMMERCIAL.md",
  "docs/RELEASE.md",
];

function ensureDir(d) {
  mkdirSync(d, { recursive: true });
}

function copyOne(rel) {
  const src = join(root, rel);
  if (!existsSync(src)) {
    console.warn(`skip missing: ${rel}`);
    return;
  }
  const dst = join(outDir, rel);
  ensureDir(dirname(dst));
  copyFileSync(src, dst);
}

function collectPackageReadmes() {
  const pkgRoot = join(root, "packages");
  const out = [];
  if (!existsSync(pkgRoot)) return out;
  for (const name of readdirSync(pkgRoot)) {
    const p = join(pkgRoot, name);
    if (!statSync(p).isDirectory()) continue;
    const readme = join(p, "README.md");
    if (existsSync(readme)) {
      out.push(join("packages", name, "README.md"));
    }
  }
  out.sort();
  return out;
}

function main() {
  ensureDir(outDir);

  for (const rel of rootFiles) copyOne(rel);
  for (const rel of docFiles) copyOne(rel);
  for (const rel of collectPackageReadmes()) copyOne(rel);

  const startHereSrc = join(root, "docs", "TECHNICAL-ADVISOR-PACK.md");
  if (existsSync(startHereSrc)) {
    copyFileSync(startHereSrc, join(outDir, "START-HERE.md"));
  }

  const manifest = [
    "Chrysalis — advisor documentation bundle",
    `Generated: ${new Date().toISOString()}`,
    `Repo root relative paths under ${relative(root, outDir)}:`,
    "",
    ...[...rootFiles, ...docFiles, ...collectPackageReadmes(), "START-HERE.md"].sort(),
  ].join("\n");
  writeFileSync(join(outDir, "MANIFEST.txt"), manifest, "utf8");

  console.log(`Wrote: ${relative(root, outDir)}`);
  console.log(`Files: ${manifest.split("\n").length - 5} paths (+ MANIFEST.txt)`);

  const tarGz = join(base, "chrysalis-advisor-docs.tar.gz");
  try {
    if (existsSync(tarGz)) {
      unlinkSync(tarGz);
    }
  } catch {
    /* ignore */
  }
  try {
    execSync(`tar -czf "${tarGz}" -C "${base}" chrysalis-advisor-docs`, {
      stdio: "inherit",
      cwd: root,
    });
    console.log(`Archive: ${relative(root, tarGz)}`);
  } catch {
    console.warn(
      "Could not run `tar -czf` (optional). Zip the folder manually:",
      relative(root, outDir),
    );
  }
}

main();
