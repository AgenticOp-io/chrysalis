#!/usr/bin/env node
/**
 * Reverse-home CWL-owned packages into Convert as junctions/symlinks:
 *   packages/{cwl,webir,runtime-cwl,runtime-cwl-browser,runtime-cwl-worker,emit-runtime-cwl}
 * â†’ chrysalis-cwl/packages/*
 *
 * WebIR alone: scripts/link-webir-from-cwl.mjs (still valid).
 * Do not git-add these paths (see .gitignore). Never git rm through them â€”
 * Windows reparse points delete into the CWL tree.
 *
 * Usage: node scripts/link-cwl-packages-from-cwl.mjs
 */
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CWL_PACKAGES = resolve(CONVERT_ROOT, "../chrysalis-cwl/packages");

const NAMES = [
  "cwl",
  "webir",
  "runtime-cwl",
  "runtime-cwl-browser",
  "runtime-cwl-worker",
  "emit-runtime-cwl",
];

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

function linkOne(name) {
  const target = join(CWL_PACKAGES, name);
  const link = join(CONVERT_ROOT, "packages", name);
  const pkg = join(target, "package.json");
  if (!existsSync(pkg)) {
    throw new Error(`CWL package missing: ${pkg}`);
  }

  mkdirSync(join(CONVERT_ROOT, "packages"), { recursive: true });

  if (existsSync(link) && isReparsePoint(link) && existsSync(join(link, "package.json"))) {
    const n = JSON.parse(readFileSync(join(link, "package.json"), "utf8")).name;
    console.log(`ok: packages/${name} already â†’ ${target} (${n})`);
    return { name, action: "reuse", target };
  }

  if (existsSync(link)) {
    if (isReparsePoint(link)) {
      rmSync(link, { recursive: true, force: true });
    } else {
      throw new Error(
        `packages/${name} is a physical tree; refuse to replace. Move aside manually, then re-run.`,
      );
    }
  }

  if (process.platform === "win32") {
    const r = spawnSync("cmd", ["/c", "mklink", "/J", link, target], { encoding: "utf8" });
    if (r.status !== 0) {
      throw new Error(`mklink /J failed for ${name}: ${r.stderr || r.stdout}`);
    }
  } else {
    symlinkSync(target, link, "dir");
  }

  const n = JSON.parse(readFileSync(join(link, "package.json"), "utf8")).name;
  console.log(`linked: packages/${name} â†’ ${target} (${n})`);
  return { name, action: "linked", target };
}

function main() {
  // After junctions exist, materialize workspace deps (pnpm skips out-of-tree realpaths).
  if (!existsSync(CWL_PACKAGES)) {
    console.error(`CWL packages dir missing: ${CWL_PACKAGES}`);
    process.exit(1);
  }
  const results = NAMES.map(linkOne);
  const linkDeps = spawnSync(
    process.execPath,
    [join(CONVERT_ROOT, "scripts", "link-cwl-junction-workspace-deps.mjs")],
    { cwd: CONVERT_ROOT, encoding: "utf8", stdio: "inherit" },
  );
  if (linkDeps.status !== 0) {
    console.warn("warn: link-cwl-junction-workspace-deps.mjs failed (run pnpm install / sync:junction-deps)");
  }
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main();
