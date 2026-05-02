#!/usr/bin/env node
/**
 * Installs packages/parser-bridge/vendor via Composer.
 * 1) `composer` on PATH when available
 * 2) Else `php packages/parser-bridge/composer.phar` after bootstrapping the phar
 *    (official installer from getcomposer.org) when `php` is on PATH
 *
 * Used by ensure-parser-bridge-vendor.mjs (pretest) and pnpm run vendor:parser-bridge.
 * Network is used only in this maintainer/CI script, not in generated code (DESIGN §3).
 */
import { spawnSync } from "node:child_process";
import { existsSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const bridgeDir = join(root, "packages", "parser-bridge");
const vendorAutoload = join(bridgeDir, "vendor", "autoload.php");
const composerPhar = join(bridgeDir, "composer.phar");
const composerSetup = join(bridgeDir, "composer-setup.php");

/** Same argv shape as the historical `composer install …` invocation. */
const composerInstallArgv = [
  "install",
  "--no-interaction",
  "--no-progress",
  "--no-dev",
  "--working-dir",
  bridgeDir,
];

function isSoftComposerMiss(combined) {
  return /not recognized|cannot find|could not find|No such file|command not found|enoent/i.test(
    combined,
  );
}

function hasPhp() {
  const r = spawnSync("php", ["-v"], { encoding: "utf8", shell: process.platform === "win32" });
  return r.status === 0;
}

function runComposerBinary() {
  return spawnSync("composer", composerInstallArgv, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

function runComposerPhar() {
  return spawnSync("php", [composerPhar, ...composerInstallArgv], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

async function downloadComposerInstaller() {
  const res = await fetch("https://getcomposer.org/installer");
  if (!res.ok) {
    throw new Error(`fetch getcomposer.org/installer: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(composerSetup, buf);
}

async function bootstrapComposerPhar() {
  if (existsSync(composerPhar) && statSync(composerPhar).size > 0) {
    return;
  }
  await downloadComposerInstaller();
  const setup = spawnSync(
    "php",
    [composerSetup, "--install-dir=.", "--filename=composer.phar"],
    {
      cwd: bridgeDir,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  try {
    unlinkSync(composerSetup);
  } catch {
    /* ignore */
  }
  if (setup.status !== 0) {
    const msg = `${setup.stderr || ""}${setup.stdout || ""}`;
    throw new Error(msg || "composer-setup.php failed");
  }
  if (!existsSync(composerPhar) || statSync(composerPhar).size === 0) {
    throw new Error("composer.phar was not created");
  }
}

/**
 * @param {{ allowSkipWithoutPhp?: boolean }} opts
 * @returns {Promise<number>} exit code (0 = ok)
 */
export async function installParserBridgeVendor(opts = {}) {
  const allowSkipWithoutPhp = opts.allowSkipWithoutPhp === true;

  if (existsSync(vendorAutoload)) {
    return 0;
  }

  const first = runComposerBinary();
  if (first.status === 0) {
    return 0;
  }

  const combined = `${first.stderr || ""}${first.stdout || ""}`;
  if (first.error?.code === "ENOENT" || isSoftComposerMiss(combined)) {
    if (!hasPhp()) {
      if (allowSkipWithoutPhp) {
        console.warn(
          "[parser-bridge] composer not on PATH and php not runnable; skipping vendor. " +
            "nikic tests will skip. Install Composer or PHP, or run: pnpm run vendor:parser-bridge",
        );
        return 0;
      }
      console.error(
        "[parser-bridge] composer not on PATH and php not found. Install PHP and re-run.",
      );
      return 1;
    }
    try {
      await bootstrapComposerPhar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[parser-bridge] failed to bootstrap composer.phar: ${msg}`);
      return 1;
    }
    const second = runComposerPhar();
    if (second.status !== 0) {
      const err = `${second.stderr || ""}${second.stdout || ""}`;
      console.error(err || "composer.phar install failed");
      return second.status ?? 1;
    }
    return 0;
  }

  console.error(combined || String(first.error ?? "composer failed"));
  return first.status ?? 1;
}

const selfPath = resolve(fileURLToPath(import.meta.url));
const invoked = process.argv[1] ? resolve(process.cwd(), process.argv[1]) : "";
if (invoked && invoked === selfPath) {
  const code = await installParserBridgeVendor({ allowSkipWithoutPhp: false });
  process.exit(code);
}
