#!/usr/bin/env node
/**
 * Ensures packages/parser-bridge/vendor exists when Composer is available.
 * Lets `pnpm test` run nikic parity Vitest without a separate manual step.
 * If composer is missing or install fails, exits non-zero only on real failure;
 * missing Composer prints a warning and exits 0 so developers without PHP still pass tests (skipped nikic).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const vendorAutoload = join(root, "packages/parser-bridge/vendor/autoload.php");

if (process.env.CHRYSALIS_SKIP_PARSER_VENDOR === "1") {
  process.exit(0);
}

if (existsSync(vendorAutoload)) {
  process.exit(0);
}

const args = [
  "install",
  "--no-interaction",
  "--no-progress",
  "--no-dev",
  "--working-dir",
  join(root, "packages/parser-bridge"),
];

const r = spawnSync("composer", args, {
  cwd: root,
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (r.error?.code === "ENOENT") {
  console.warn(
    "[pretest] composer not on PATH; skipping packages/parser-bridge/vendor. " +
      "nikic Vitest parity tests will skip. Install PHP + Composer and run: pnpm run vendor:parser-bridge",
  );
  process.exit(0);
}

if (r.status !== 0) {
  const combined = `${r.stderr || ""}${r.stdout || ""}`;
  const softMiss =
    /not recognized|cannot find|could not find|No such file|command not found|enoent/i.test(
      combined,
    );
  if (softMiss) {
    console.warn(
      "[pretest] composer does not appear runnable; skipping packages/parser-bridge/vendor. " +
        "Install Composer on PATH or run: pnpm run vendor:parser-bridge",
    );
    process.exit(0);
  }
  process.stderr.write(combined || String(r.error ?? "composer failed"));
  process.exit(r.status ?? 1);
}

process.exit(0);
