#!/usr/bin/env node
/**
 * Install WPTP siblings required by Translation Hub (Next.js emit + contract-first compose).
 * Prefers AgenticOps `platforms/wptp-*` (see docs/WPTP-CONVERT-ORBIT.md + scripts/lib/wptp-siblings.mjs).
 *
 * Usage:
 *   node scripts/install-wptp-hub-deps.mjs
 *   WPTP_SIBLINGS_ROOT=/opt/wptp node scripts/install-wptp-hub-deps.mjs
 *   CHRYSALIS_SKIP_WPTP_HUB_DEPS=1  — no-op exit 0
 */
import { spawn } from "node:child_process";
import { access, constants, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveWptpRepoRoot, resolveWptpSiblingsRoot } from "./lib/wptp-siblings.mjs";

const chrysalisRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siblingsRoot = resolveWptpSiblingsRoot(chrysalisRoot);
const emitNextJsTag = process.env.WPTP_EMIT_NEXTJS_REF ?? "v0.1.1";
const emitRepo = process.env.WPTP_EMIT_NEXTJS_REPO ?? "https://github.com/AgenticOp-io/wptp-emit-nextjs.git";
const emitDir = resolveWptpRepoRoot(chrysalisRoot, "wptp-emit-nextjs");
const matrixTag = process.env.WPTP_MATRIX_REF ?? "v0.1.10";
const matrixRepo = process.env.WPTP_MATRIX_REPO ?? "https://github.com/AgenticOp-io/wptp-matrix.git";
const matrixDir = resolveWptpRepoRoot(chrysalisRoot, "wptp-matrix");

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(cmd, args, opts = {}) {
  return new Promise((resolveP, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...opts,
    });
    child.on("close", (code) => (code === 0 ? resolveP() : reject(new Error(`${cmd} ${args.join(" ")} exit ${code}`))));
    child.on("error", reject);
  });
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function cloneRepo(url, dest, ref) {
  if (await exists(join(dest, ".git"))) {
    process.stdout.write(`[install-wptp-hub-deps] reuse ${dest}\n`);
    return;
  }
  await run("git", ["clone", "--depth", "1", "--branch", ref, url, dest]);
}

async function npmBuild(dir, label) {
  process.stdout.write(`[install-wptp-hub-deps] npm install ${label}...\n`);
  await run(npmCmd, ["install", "--no-audit", "--no-fund"], {
    cwd: dir,
    env: {
      ...process.env,
      NPM_CONFIG_JOBS: process.env.NPM_CONFIG_JOBS ?? "1",
      NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=1024",
    },
  });
  if (await exists(join(dir, "package.json"))) {
    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
    if (pkg.scripts?.build) {
      process.stdout.write(`[install-wptp-hub-deps] npm run build ${label}...\n`);
      await run(npmCmd, ["run", "build"], { cwd: dir, env: process.env });
    }
  }
}

async function ensureEmitNextJs() {
  const distIndex = join(emitDir, "dist", "index.js");
  if (await exists(distIndex)) {
    try {
      const mod = await import(pathToFileURL(distIndex).href);
      if (typeof mod.emitNextJsAppRouter === "function") {
        process.stdout.write(`[install-wptp-hub-deps] OK: ${distIndex} already built\n`);
        return { ok: true, skipped: true, emitNextJsRoot: emitDir };
      }
    } catch {
      process.stdout.write(`[install-wptp-hub-deps] stale ${distIndex}; rebuilding\n`);
    }
  }

  await cloneRepo(emitRepo, emitDir, emitNextJsTag).catch(async () => {
    process.stdout.write(`[install-wptp-hub-deps] tag ${emitNextJsTag} failed; cloning default branch...\n`);
    if (await exists(emitDir)) {
      const { rm } = await import("node:fs/promises");
      await rm(emitDir, { recursive: true, force: true });
    }
    await run("git", ["clone", "--depth", "1", emitRepo, emitDir]);
  });

  await npmBuild(emitDir, "wptp-emit-nextjs");

  if (!(await exists(distIndex))) {
    throw new Error(`missing ${distIndex} after build`);
  }
  return { ok: true, skipped: false, emitNextJsRoot: emitDir };
}

async function ensureMatrix() {
  const composeNext = join(matrixDir, "dist", "compose-chrysalis-nextjs.js");
  if (await exists(composeNext)) {
    process.stdout.write(`[install-wptp-hub-deps] OK: ${composeNext} already built\n`);
    return { ok: true, skipped: true, matrixRoot: matrixDir };
  }

  await cloneRepo(matrixRepo, matrixDir, matrixTag).catch(async () => {
    process.stdout.write(`[install-wptp-hub-deps] tag ${matrixTag} failed; cloning default branch...\n`);
    if (await exists(matrixDir)) {
      const { rm } = await import("node:fs/promises");
      await rm(matrixDir, { recursive: true, force: true });
    }
    await run("git", ["clone", "--depth", "1", matrixRepo, matrixDir]);
  });

  await npmBuild(matrixDir, "wptp-matrix");

  if (!(await exists(composeNext))) {
    throw new Error(`missing ${composeNext} after build`);
  }
  return { ok: true, skipped: false, matrixRoot: matrixDir };
}

async function main() {
  if (process.env.CHRYSALIS_SKIP_WPTP_HUB_DEPS === "1") {
    process.stdout.write("[install-wptp-hub-deps] skipped (CHRYSALIS_SKIP_WPTP_HUB_DEPS=1)\n");
    return;
  }

  const emit = await ensureEmitNextJs();
  const matrix = await ensureMatrix();

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      siblingsRoot,
      emitNextJsRoot: emit.emitNextJsRoot,
      matrixRoot: matrix.matrixRoot,
      emitSkipped: emit.skipped,
      matrixSkipped: matrix.skipped,
      wptpIrRoot: resolveWptpRepoRoot(chrysalisRoot, "wptp-ir"),
      wptpIrNpm: join(emit.emitNextJsRoot, "node_modules", "@wptp", "ir"),
    })}\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
