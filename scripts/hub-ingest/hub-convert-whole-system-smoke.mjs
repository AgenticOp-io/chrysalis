#!/usr/bin/env node
/**
 * Convert whole-system cohesion — peels→CWL DNA + platforms WPTP orbit + Helix consume.
 * Operator one-shot for docs/CONVERT-WHOLE-SYSTEM.md (nothing wasted).
 *
 *   pnpm run hub:convert-whole-system-smoke
 *   → CONVERT_WHOLE_SYSTEM_OK
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runConvertGravitySmoke } from "./hub-convert-gravity-smoke.mjs";
import { runWptpOrbitSmoke } from "./hub-wptp-orbit-smoke.mjs";
import { runCwlHelixCutoverSmoke } from "./hub-cwl-helix-cutover-smoke.mjs";
import { runAgentEraSubstrateSmoke } from "./hub-agent-era-substrate-smoke.mjs";
import { runWptpGoldSmoke } from "./hub-wptp-gold-smoke.mjs";
import { resolveWptpRepoRoot } from "../lib/wptp-siblings.mjs";

export const CONVERT_WHOLE_SYSTEM_SMOKE_KIND = "chrysalis.hub.convert-whole-system-smoke";
export const CONVERT_WHOLE_SYSTEM_SMOKE_SCHEMA_VERSION = 1;
export const CONVERT_WHOLE_SYSTEM_OK = "CONVERT_WHOLE_SYSTEM_OK";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {{ convertRoot?: string, includeGold?: boolean }} [opts]
 */
export async function runConvertWholeSystemSmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  const includeGold =
    opts.includeGold === true ||
    process.env.CHRYSALIS_WHOLE_SYSTEM_GOLD === "1" ||
    process.env.CHRYSALIS_WHOLE_SYSTEM_GOLD === "true";

  const gravity = await runConvertGravitySmoke({ convertRoot: root });
  const orbit = await runWptpOrbitSmoke({ convertRoot: root });
  const helix = await runCwlHelixCutoverSmoke();
  const substrate = await runAgentEraSubstrateSmoke({ convertRoot: root });

  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [
    {
      id: "docs-convert-whole-system",
      ok: existsSync(join(root, "docs/CONVERT-WHOLE-SYSTEM.md")),
      detail: "docs/CONVERT-WHOLE-SYSTEM.md",
    },
    {
      id: "convert-gravity",
      ok: gravity.ok === true,
      detail: gravity.token ?? (gravity.ok ? "ok" : "fail"),
    },
    {
      id: "wptp-orbit",
      ok: orbit.ok === true,
      detail: orbit.token ?? (orbit.skipped ? "skipped" : orbit.siblingsRoot),
    },
    {
      id: "cwl-helix-cutover",
      ok: helix.ok === true,
      detail: helix.token ?? (helix.ok ? "ok" : "fail"),
    },
    {
      id: "agent-era-substrate",
      ok: substrate.ok === true,
      detail: substrate.ok ? "holes+cwl-above+dispose" : "substrate fail",
    },
  ];

  /** @type {{ ok: boolean, skip?: string, matrixRoot?: string } | null} */
  let gold = null;
  if (includeGold) {
    gold = runWptpGoldSmoke();
    const matrixRoot = resolveWptpRepoRoot(root, "wptp-matrix");
    checks.push({
      id: "wptp-gold",
      ok: gold.ok === true || Boolean(gold.skip),
      detail: gold.ok
        ? matrixRoot
        : gold.skip
          ? `skip:${gold.skip}`
          : `fail matrix=${gold.matrixRoot ?? matrixRoot}`,
    });
  } else {
    const matrixRoot = resolveWptpRepoRoot(root, "wptp-matrix");
    checks.push({
      id: "wptp-gold-path",
      ok: existsSync(join(matrixRoot, "package.json")),
      detail: matrixRoot,
    });
  }

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  return {
    kind: CONVERT_WHOLE_SYSTEM_SMOKE_KIND,
    schemaVersion: CONVERT_WHOLE_SYSTEM_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? CONVERT_WHOLE_SYSTEM_OK : "CONVERT_WHOLE_SYSTEM_FAIL",
    checks,
    failed: failed.map((c) => c.id),
    parts: {
      gravity: { ok: gravity.ok, token: gravity.token },
      orbit: { ok: orbit.ok, token: orbit.token, siblingsRoot: orbit.siblingsRoot },
      helix: { ok: helix.ok, token: helix.token, mode: helix.mode },
      substrate: { ok: substrate.ok },
      gold: gold
        ? { ok: gold.ok, skip: gold.skip, matrixRoot: gold.matrixRoot }
        : { ok: null, deferred: true },
    },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runConvertWholeSystemSmoke({
    includeGold: process.env.CHRYSALIS_WHOLE_SYSTEM_GOLD === "1",
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.ok) console.log(CONVERT_WHOLE_SYSTEM_OK);
  process.exit(report.ok ? 0 : 1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
