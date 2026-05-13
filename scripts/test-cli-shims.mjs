/**
 * Smoke-test Python and Go CLI shims (optional: skips if go/python missing).
 * In strict mode (GitHub Actions or CHRYSALIS_STRICT_CLI_SHIMS=1), both shims must pass.
 * Requires: pnpm --filter @chrysalis/cli build, Node on PATH.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binJs = join(root, "packages", "cli", "dist", "bin.js");

function strictShims() {
  return process.env.GITHUB_ACTIONS === "true" || process.env.CHRYSALIS_STRICT_CLI_SHIMS === "1";
}

function pyPathEnv() {
  const pyBase = join(root, "python", "chrysalis_shim", "src");
  const sep = process.platform === "win32" ? ";" : ":";
  const prev = process.env.PYTHONPATH;
  const merged = prev && prev.length > 0 ? `${pyBase}${sep}${prev}` : pyBase;
  return { ...process.env, PYTHONPATH: merged, CHRYSALIS_CLI_JS: binJs };
}

function runPython() {
  const env = pyPathEnv();
  /** @type {readonly [string, string[]][]} */
  const attempts =
    process.platform === "win32"
      ? [
          ["py", ["-3", "-m", "chrysalis_shim", "--help"]],
          ["python", ["-m", "chrysalis_shim", "--help"]],
          ["python3", ["-m", "chrysalis_shim", "--help"]],
        ]
      : [
          ["python3", ["-m", "chrysalis_shim", "--help"]],
          ["python", ["-m", "chrysalis_shim", "--help"]],
        ];
  for (const pair of attempts) {
    const cmd = pair[0];
    const args = pair[1];
    const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", env });
    if (r.status === 0 && `${r.stdout}${r.stderr}`.includes("chrysalis")) {
      return true;
    }
  }
  return false;
}

function main() {
  if (!existsSync(binJs)) {
    console.error("[test-cli-shims] missing packages/cli/dist/bin.js — run: pnpm --filter @chrysalis/cli build");
    process.exit(2);
  }

  const strict = strictShims();
  if (strict) {
    console.log("[test-cli-shims] strict mode: go and python shims must both succeed");
  }

  const goVersion = spawnSync("go", ["version"], { encoding: "utf8" });
  const goPresent = goVersion.status === 0;
  if (!goPresent) {
    if (strict) {
      console.error("[test-cli-shims] strict mode: go must be on PATH (install Go 1.22+)");
      process.exit(1);
    }
    console.log("[test-cli-shims] go not on PATH — skip go shim");
  } else {
    const r = spawnSync("go", ["run", ".", "--", "--help"], {
      cwd: join(root, "go", "shim"),
      encoding: "utf8",
      env: { ...process.env, CHRYSALIS_CLI_JS: binJs },
    });
    if (r.status !== 0) {
      console.error("[test-cli-shims] go shim failed:", r.stderr || r.stdout);
      process.exit(1);
    }
    if (!`${r.stdout}${r.stderr}`.includes("chrysalis")) {
      console.error("[test-cli-shims] go shim: unexpected output");
      process.exit(1);
    }
    console.log("[test-cli-shims] go shim: ok");
  }

  const pyOk = runPython();
  if (!pyOk) {
    if (strict) {
      console.error(
        "[test-cli-shims] strict mode: python shim failed (install Python 3.10+ or fix PYTHONPATH / package)",
      );
      process.exit(1);
    }
    console.log("[test-cli-shims] python3/python/py not available or shim failed — skip python shim");
  } else {
    console.log("[test-cli-shims] python shim: ok");
  }
}

main();
