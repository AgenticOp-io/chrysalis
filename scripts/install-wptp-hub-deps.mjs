#!/usr/bin/env node
/**
 * Install WPTP siblings required by Translation Hub (Next.js emit path).
 * Clones theorem6/wptp-emit-nextjs (+ ensures @wptp/ir via npm) next to the Chrysalis repo by default.
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

const chrysalisRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siblingsRoot = resolve(process.env.WPTP_SIBLINGS_ROOT ?? join(chrysalisRoot, ".."));
const emitNextJsTag = process.env.WPTP_EMIT_NEXTJS_REF ?? "v0.1.1";
const emitRepo = process.env.WPTP_EMIT_NEXTJS_REPO ?? "https://github.com/theorem6/wptp-emit-nextjs.git";
const emitDir = resolve(process.env.WPTP_EMIT_NEXTJS_ROOT ?? join(siblingsRoot, "wptp-emit-nextjs"));

function run(cmd, args, opts = {}) {
  return new Promise((resolveP, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
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
  await run("npm", ["install", "--no-audit", "--no-fund"], {
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
      await run("npm", ["run", "build"], { cwd: dir, env: process.env });
    }
  }
}

async function main() {
  if (process.env.CHRYSALIS_SKIP_WPTP_HUB_DEPS === "1") {
    process.stdout.write("[install-wptp-hub-deps] skipped (CHRYSALIS_SKIP_WPTP_HUB_DEPS=1)\n");
    return;
  }

  const distIndex = join(emitDir, "dist", "index.js");
  if (await exists(distIndex)) {
    try {
      const mod = await import(pathToFileURL(distIndex).href);
      if (typeof mod.emitNextJsAppRouter === "function") {
        process.stdout.write(`[install-wptp-hub-deps] OK: ${distIndex} already built\n`);
        process.stdout.write(`${JSON.stringify({ ok: true, emitNextJsRoot: emitDir, skipped: true })}\n`);
        return;
      }
    } catch {
      process.stdout.write(`[install-wptp-hub-deps] stale ${distIndex}; rebuilding\n`);
    }
  }

  await cloneRepo(emitRepo, emitDir, emitNextJsTag).catch(async () => {
    process.stdout.write(`[install-wptp-hub-deps] tag ${emitNextJsTag} failed; cloning default branch...\n`);
    if (await exists(emitDir)) {
      await run("rm", ["-rf", emitDir]);
    }
    await run("git", ["clone", "--depth", "1", emitRepo, emitDir]);
  });

  await npmBuild(emitDir, "wptp-emit-nextjs");

  if (!(await exists(distIndex))) {
    throw new Error(`missing ${distIndex} after build`);
  }

  process.stdout.write(
    `${JSON.stringify({ ok: true, emitNextJsRoot: emitDir, wptpIrRoot: join(emitDir, "node_modules", "@wptp", "ir") })}\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
