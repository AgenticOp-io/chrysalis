#!/usr/bin/env node
/**
 * Milestone 4: create a real Composer Laravel app under flagship/ for Chrysalis
 * adoption work. Output is gitignored (see repo .gitignore).
 *
 * After `composer create-project` (or when re-run on an existing tree), copies
 * `flagship/laravel-full/chrysalis-templates/` into the app: `chrysalis.routes.json`,
 * `chrysalis/**`, `routes/chrysalis.php`, and appends
 * `require __DIR__.'/chrysalis.php'` to `routes/web.php` when missing.
 *
 * Requires `composer` on PATH and network access to Packagist (first run only).
 *
 * Usage (from repo root):
 *   pnpm run scaffold:laravel-full
 *   node scripts/scaffold-flagship-laravel.mjs --out flagship/my-laravel
 */

import { execSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

const args = process.argv.slice(2);
let outRel = "flagship/chrysalis-laravel-work";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out" && args[i + 1]) {
    outRel = args[i + 1];
    i += 1;
  }
}

const outAbs = resolve(repo, outRel);
const composerJson = join(outAbs, "composer.json");
const emptyManifestExample = join(repo, "flagship/laravel-full/chrysalis.routes.example.json");

function isNonEmptyDir(dir) {
  try {
    return readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

/**
 * @param {string} repoRoot
 * @param {string} laravelRoot
 */
function installChrysalisTemplates(repoRoot, laravelRoot) {
  const tmpl = join(repoRoot, "flagship/laravel-full/chrysalis-templates");
  if (!existsSync(tmpl)) {
    console.warn(`[scaffold-flagship-laravel] missing templates at ${tmpl}`);
    return;
  }
  cpSync(join(tmpl, "chrysalis"), join(laravelRoot, "chrysalis"), { recursive: true });
  copyFileSync(join(tmpl, "chrysalis.routes.json"), join(laravelRoot, "chrysalis.routes.json"));
  const observeTmpl = join(tmpl, "chrysalis.observe.json");
  if (existsSync(observeTmpl)) {
    copyFileSync(observeTmpl, join(laravelRoot, "chrysalis.observe.json"));
  }
  copyFileSync(join(tmpl, "routes", "chrysalis.stub.php"), join(laravelRoot, "routes", "chrysalis.php"));
  const webPhp = join(laravelRoot, "routes", "web.php");
  if (!existsSync(webPhp)) {
    console.warn(`[scaffold-flagship-laravel] no routes/web.php at ${webPhp}`);
    return;
  }
  let web = readFileSync(webPhp, "utf8");
  if (!web.includes("chrysalis.php")) {
    web = `${web.trimEnd()}\n\nrequire __DIR__.'/chrysalis.php';\n`;
    writeFileSync(webPhp, web);
    console.log(
      "[scaffold-flagship-laravel] appended `require routes/chrysalis.php` to routes/web.php",
    );
  }
  console.log(
    "[scaffold-flagship-laravel] Chrysalis templates: ping, health.txt, api/chrysalis-health, chrysalis-jump, chrysalis-count, chrysalis-framework, chrysalis-first-item, chrysalis-last-item, chrysalis-items, chrysalis-lib-count, chrysalis-sum-ids, session visit/me/login/logout, chrysalis-hello, chrysalis-echo",
  );
}

try {
  execSync("composer --version", { stdio: "ignore" });
} catch {
  console.error(
    "[scaffold-flagship-laravel] composer not found on PATH. Install Composer and retry.",
  );
  process.exit(1);
}

const laravelPresent = existsSync(composerJson);

if (!laravelPresent) {
  if (isNonEmptyDir(outAbs)) {
    console.error(
      `[scaffold-flagship-laravel] ${outAbs} exists and is not empty, but has no composer.json. Remove or empty it, then retry.`,
    );
    process.exit(1);
  }
  mkdirSync(outAbs, { recursive: true });
  console.log(`[scaffold-flagship-laravel] creating Laravel in ${outAbs} ...`);
  try {
    execSync("composer create-project laravel/laravel . --no-interaction --prefer-dist", {
      cwd: outAbs,
      stdio: "inherit",
    });
  } catch {
    console.error("[scaffold-flagship-laravel] composer create-project failed.");
    process.exit(1);
  }
} else {
  console.log(
    `[scaffold-flagship-laravel] Laravel already at ${outAbs} — skipping create-project, re-syncing Chrysalis files.`,
  );
}

installChrysalisTemplates(repo, outAbs);

try {
  copyFileSync(emptyManifestExample, join(outAbs, "chrysalis.routes.example.json"));
  console.log(`[scaffold-flagship-laravel] wrote ${join(outRel, "chrysalis.routes.example.json")}`);
} catch (e) {
  console.warn("[scaffold-flagship-laravel] could not copy chrysalis.routes.example.json:", e);
}

console.log(
  `\n[scaffold-flagship-laravel] Done. Try: chrysalis ingest ${outRel}  (from repo root; requires packages built).`,
);
