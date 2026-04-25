#!/usr/bin/env node
/**
 * Milestone 4–5: create a real Composer Laravel app under flagship/ for Chrysalis
 * adoption work. Default output **`flagship/chrysalis-laravel-work/`** is the M5
 * canonical full Laravel ingest root (D84). Output is gitignored (see repo .gitignore).
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
 *   pnpm run scaffold:laravel-full:breeze   # same as CHRYSALIS_SCAFFOLD_BREEZE=1
 *   node scripts/scaffold-flagship-laravel.mjs --out flagship/my-laravel [--with-breeze]
 *
 * **Breeze:** With `--with-breeze` or env **`CHRYSALIS_SCAFFOLD_BREEZE=1`**, installs
 * `laravel/breeze` (Blade + **`--pest`** for non-interactive install), runs migrations, then `npm` build. Chrysalis template sync
 * still runs afterward so **`routes/web.php`** keeps **`require …/chrysalis.php`**. Ingest
 * stays manifest-scoped (`chrysalis.routes.json` only).
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
let withBreeze = process.env.CHRYSALIS_SCAFFOLD_BREEZE === "1";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out" && args[i + 1]) {
    outRel = args[i + 1];
    i += 1;
  } else if (args[i] === "--with-breeze") {
    withBreeze = true;
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
 * @param {string} laravelRoot
 * @returns {boolean}
 */
function composerJsonHasBreeze(laravelRoot) {
  try {
    const raw = readFileSync(join(laravelRoot, "composer.json"), "utf8");
    const j = JSON.parse(raw);
    const all = { ...(j.require ?? {}), ...(j["require-dev"] ?? {}) };
    return Object.prototype.hasOwnProperty.call(all, "laravel/breeze");
  } catch {
    return false;
  }
}

/**
 * @param {string} laravelRoot
 */
function ensureSqliteDatabaseFile(laravelRoot) {
  const dbDir = join(laravelRoot, "database");
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  const dbFile = join(dbDir, "database.sqlite");
  if (!existsSync(dbFile)) {
    writeFileSync(dbFile, "");
  }
}

/**
 * Optional Laravel Breeze (Blade) for Milestone 5 coexistence with Chrysalis routes.
 * @param {string} laravelRoot
 * @param {boolean} enabled
 */
function ensureBreeze(laravelRoot, enabled) {
  if (!enabled) {
    return;
  }
  if (composerJsonHasBreeze(laravelRoot)) {
    console.log(
      "[scaffold-flagship-laravel] laravel/breeze already required — skipping Breeze install.",
    );
    return;
  }
  console.log("[scaffold-flagship-laravel] Installing Laravel Breeze (Blade stack) …");
  execSync("composer require laravel/breeze --dev --no-interaction --no-progress", {
    cwd: laravelRoot,
    stdio: "inherit",
  });
  execSync("php artisan breeze:install blade --no-interaction --pest", {
    cwd: laravelRoot,
    stdio: "inherit",
  });
  ensureSqliteDatabaseFile(laravelRoot);
  execSync("php artisan migrate --force --no-interaction", {
    cwd: laravelRoot,
    stdio: "inherit",
  });
  const lock = join(laravelRoot, "package-lock.json");
  const npmCmd = existsSync(lock)
    ? "npm ci --no-audit --no-fund"
    : "npm install --no-audit --no-fund";
  execSync(npmCmd, { cwd: laravelRoot, stdio: "inherit" });
  execSync("npm run build", { cwd: laravelRoot, stdio: "inherit" });
  console.log("[scaffold-flagship-laravel] Breeze (Blade) + frontend build complete.");
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
    "[scaffold-flagship-laravel] Chrysalis templates: ping, health.txt, api/chrysalis-health, chrysalis-jump, chrysalis-count, chrysalis-framework, chrysalis-first-item, chrysalis-last-item, chrysalis-items, chrysalis-lib-count, chrysalis-sum-ids, chrysalis-min-id, chrysalis-max-id, chrysalis-avg-id, chrysalis-id-span, chrysalis-sum-squares, chrysalis-even-count, chrysalis-odd-count, chrysalis-gt-two-count, chrysalis-lt-three-count, chrysalis-gte-two-count, chrysalis-lte-three-count, chrysalis-ne-two-count, chrysalis-between-count, chrysalis-eq-one-count, chrysalis-eq-three-count, chrysalis-eq-two-count, chrysalis-ne-one-count, chrysalis-ne-three-count, chrysalis-lt-two-count, chrysalis-gt-one-count, chrysalis-gte-one-count, chrysalis-lte-one-count, chrysalis-between-one-two-count, chrysalis-gt-three-count, session visit/me/login/logout, chrysalis-hello, chrysalis-echo",
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

ensureBreeze(outAbs, withBreeze);

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
