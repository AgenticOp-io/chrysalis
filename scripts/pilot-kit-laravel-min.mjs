#!/usr/bin/env node
/**
 * Cursor Pilot Kit — one-shot laravel-min wedge prove.
 * Runs existing verify:flagship + status:laravel-min gates; writes buyer-facing report.
 *
 * Gate companion: hub:cursor-pilot-kit-smoke
 * Docs: docs/CURSOR-PILOT-KIT.md
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "reports/pilot-kit");
const OUT_JSON = join(OUT_DIR, "laravel-min-pilot.json");

/**
 * @param {string} script
 * @param {string[]} args
 * @param {number} [timeoutMs]
 */
function runNode(script, args = [], timeoutMs = 600_000) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    timeout: timeoutMs,
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    status: r.status ?? 1,
    signal: r.signal,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const cliBin = join(ROOT, "packages/cli/dist/bin.js");
  const built = existsSync(cliBin);

  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const steps = [];

  steps.push({
    id: "cli-built",
    ok: built,
    detail: built ? undefined : "run pnpm -r build first",
  });

  let verifyOk = false;
  let statusOk = false;
  if (built) {
    const verify = runNode(join(ROOT, "scripts/verify-flagship-laravel-min.mjs"));
    verifyOk = verify.status === 0;
    steps.push({
      id: "verify-flagship-laravel-min",
      ok: verifyOk,
      detail: verifyOk
        ? undefined
        : (verify.stderr || verify.stdout).slice(-800) || `exit=${verify.status}`,
    });

    const status = runNode(join(ROOT, "scripts/status-flagship-laravel-min.mjs"));
    // status may skip (exit 0) when traces missing — treat skip as soft fail after verify fail
    statusOk = status.status === 0 && verifyOk;
    const skipped =
      /skipping/i.test(status.stdout) || /skipping/i.test(status.stderr);
    steps.push({
      id: "status-laravel-min",
      ok: statusOk && !skipped,
      detail: statusOk && !skipped
        ? undefined
        : skipped
          ? "status skipped (missing traces/reports)"
          : (status.stderr || status.stdout).slice(-500) || `exit=${status.status}`,
    });
  }

  const mcpExample = join(ROOT, "fixtures/pilot-kit/cursor-mcp.json");
  const mcpOk =
    existsSync(mcpExample) &&
    readFileSync(mcpExample, "utf8").includes("web-llm-mcp-server");
  steps.push({ id: "pilot-kit-mcp-config", ok: mcpOk });

  const docsOk = existsSync(join(ROOT, "docs/CURSOR-PILOT-KIT.md"));
  steps.push({ id: "pilot-kit-docs", ok: docsOk });

  const ok = steps.every((s) => s.ok);
  const report = {
    kind: "chrysalis.pilot-kit.laravel-min",
    schemaVersion: 1,
    ok,
    wedge: "flagship/laravel-min",
    invariant: "Models propose; WebIR + oracle + verify dispose",
    next: {
      mcp: "Copy fixtures/pilot-kit/cursor-mcp.json into Cursor MCP settings; set cwd to repo root",
      rule: "Optional: copy fixtures/pilot-kit/chrysalis-pilot.mdc → .cursor/rules/",
      docs: "docs/CURSOR-PILOT-KIT.md",
      publicClaim: "docs/PUBLIC-ENGINE-CLAIM.md",
    },
    steps,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!ok) process.exit(1);
}

main();
