#!/usr/bin/env node
/**
 * Wave 7 — nextjs emit verify-green sample across origins (requires wptp-emit-nextjs).
 * Gate: hub:matrix-depth-wave7-nextjs-smoke
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { resolveWptpPackageEntry, resolveWptpRepoRoot } from "../lib/wptp-siblings.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const emitNextJsRoot = resolveWptpRepoRoot(ROOT, "wptp-emit-nextjs");
const emitDist = resolveWptpPackageEntry(ROOT, "wptp-emit-nextjs") ?? join(emitNextJsRoot, "dist", "index.js");
const irDist =
  resolveWptpPackageEntry(ROOT, "wptp-ir") ??
  join(emitNextJsRoot, "node_modules", "@wptp", "ir", "dist", "index.js");

/** Representative origin → nextjs suites (literal / structured / middleware / flagship). */
const SUITES = [
  "js-literal-nextjs",
  "ts-literal-nextjs",
  "java-literal-nextjs",
  "python-literal-nextjs",
  "go-literal-nextjs",
  "js-structured-nextjs",
  "js-middleware-nextjs",
  "typescript-middleware-nextjs-full",
  "php-structured-nextjs-full",
  "php-middleware-nextjs-full",
  "vue-structured-nextjs-full",
  "json-middleware-nextjs-full",
  "cwl-structured-nextjs-full",
  "plain-php-flagship-nextjs",
  "express-flagship-nextjs",
];

function verifySuite(id) {
  const r = spawnSync(process.execPath, ["scripts/hub-ingest/hub-gold-verify.mjs", "--suite", id], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const oks = [...out.matchAll(/"ok":\s*(true|false)/g)].map((m) => m[1]);
  const passed = r.status === 0 && oks.length > 0 && oks[oks.length - 1] === "true";
  const reason = out.match(/"reason":\s*"([^"]+)"/)?.[1] ?? null;
  return { id, ok: passed, reason, status: r.status };
}

export async function runMatrixDepthWave7NextjsSmoke() {
  const progress = createSmokeProgress("matrix-depth-wave7-nextjs");
  const t0 = progress.start("Matrix depth wave 7 nextjs");

  const depsOk = existsSync(emitDist) && existsSync(irDist);
  /** @type {{ id: string, ok: boolean, reason: string | null, status: number | null }[]} */
  let results = [];
  let ok = depsOk;

  if (!depsOk) {
    ok = false;
  } else {
    results = SUITES.map(verifySuite);
    if (results.some((r) => !r.ok)) ok = false;
  }

  progress.end("Matrix depth wave 7 nextjs", ok, t0);
  return {
    kind: "chrysalis.hub.matrix-depth-wave7-nextjs-smoke",
    schemaVersion: 1,
    ok,
    depsOk,
    emitNextJsRoot,
    suiteCount: SUITES.length,
    passCount: results.filter((r) => r.ok).length,
    results,
    note: depsOk
      ? "Wave 7: nextjs gold-verify sample across origins"
      : "Missing wptp-emit-nextjs — run pnpm run hub:install-wptp",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixDepthWave7NextjsSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-depth-wave7-nextjs-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
