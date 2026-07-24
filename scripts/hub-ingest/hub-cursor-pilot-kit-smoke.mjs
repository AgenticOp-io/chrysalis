#!/usr/bin/env node
/**
 * Packaging smoke for Chrysalis Cursor Pilot Kit (GTM path from 07-23-26 brief).
 * Does not re-run full verify:flagship (that is pilot:laravel-min) — checks kit surface.
 *
 * Gate: hub:cursor-pilot-kit-smoke
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const KIT = join(ROOT, "fixtures/pilot-kit");

function mustInclude(path, ...needles) {
  if (!existsSync(path)) return false;
  const t = readFileSync(path, "utf8");
  return needles.every((n) => t.includes(n));
}

export async function runCursorPilotKitSmoke() {
  /** @type {Array<{ id: string, ok: boolean, reason?: string }>} */
  const checks = [];

  const files = [
    ["docs", join(ROOT, "docs/CURSOR-PILOT-KIT.md"), ["laravel-min", "MCP", "propose"]],
    ["public-claim", join(ROOT, "docs/PUBLIC-ENGINE-CLAIM.md"), ["Apache", "Pilot Kit"]],
    ["mcp-json", join(KIT, "cursor-mcp.json"), ["web-llm-mcp-server", "pilot:laravel-min"]],
    ["rule", join(KIT, "chrysalis-pilot.mdc"), ["verify dispose", "D6447"]],
    ["agents", join(KIT, "AGENTS-PILOT.md"), ["Propose ≠ dispose", "pilot:laravel-min"]],
    ["checklist", join(KIT, "PILOT-CHECKLIST.md"), ["pilot:laravel-min", "MCP"]],
    ["runner", join(ROOT, "scripts/pilot-kit-laravel-min.mjs"), ["verify-flagship-laravel-min"]],
    ["mcp-server", join(ROOT, "scripts/web-llm-mcp-server.mjs"), ["tools/list", "tools/call"]],
    ["ai-assist", join(ROOT, "docs/AI-ASSIST.md"), ["CURSOR-PILOT-KIT", "MCP"]],
    ["legacy-mcp-example", join(ROOT, "fixtures/web-llm/cursor-mcp.example.json"), ["web-llm-mcp-server"]],
  ];

  for (const [id, path, needles] of files) {
    const ok = mustInclude(path, ...needles);
    checks.push({
      id,
      ok,
      reason: ok ? undefined : `missing or incomplete: ${path}`,
    });
  }

  const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
  checks.push({
    id: "package-scripts",
    ok: pkg.includes("pilot:laravel-min") && pkg.includes("hub:cursor-pilot-kit-smoke"),
    reason: pkg.includes("pilot:laravel-min") ? undefined : "package.json scripts missing",
  });

  const ok = checks.every((c) => c.ok);
  const report = {
    kind: "chrysalis.hub.cursor-pilot-kit-smoke",
    schemaVersion: 1,
    ok,
    checks,
    failed: checks.filter((c) => !c.ok),
    note: "Pilot Kit packaging; run pnpm run pilot:laravel-min for full laravel-min verify",
    generatedAt: new Date().toISOString(),
  };

  const outDir = join(ROOT, "reports/pilot-kit");
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "cursor-pilot-kit-smoke.json"), `${JSON.stringify(report, null, 2)}\n`);
  } catch {
    /* ignore */
  }

  return report;
}

async function main() {
  const r = await runCursorPilotKitSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cursor-pilot-kit-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
