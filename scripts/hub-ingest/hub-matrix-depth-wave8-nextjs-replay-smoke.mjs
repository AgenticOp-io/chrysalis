#!/usr/bin/env node
/**
 * Wave 8 — nextjs trace-replay sample (requires wptp-emit-nextjs).
 * Gate: hub:matrix-depth-wave8-nextjs-replay-smoke
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { resolveWptpPackageEntry } from "../lib/wptp-siblings.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const emitDist = resolveWptpPackageEntry(ROOT, "wptp-emit-nextjs") ?? "";

const SUITES = [
  "js-structured-nextjs",
  "js-middleware-nextjs",
  "ts-literal-nextjs",
  "typescript-middleware-nextjs-full",
  "java-literal-nextjs",
  "php-structured-nextjs-full",
  "plain-php-flagship-nextjs",
  "express-flagship-nextjs",
  "vue-structured-nextjs-full",
  "cwl-structured-nextjs-full",
];

function replaySuite(id) {
  const r = spawnSync(process.execPath, ["scripts/hub-ingest/hub-gold-trace-replay.mjs", "--suite", id], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const oks = [...out.matchAll(/"ok":\s*(true|false)/g)].map((m) => m[1]);
  const correctness = out.match(/"correctness":\s*([0-9.]+)/)?.[1];
  const passed = r.status === 0 && oks.length > 0 && oks[oks.length - 1] === "true";
  const skip = out.match(/"skip":\s*"([^"]+)"/)?.[1] ?? null;
  return { id, ok: passed, correctness: correctness ? Number(correctness) : null, skip, status: r.status };
}

export async function runMatrixDepthWave8NextjsReplaySmoke() {
  const progress = createSmokeProgress("matrix-depth-wave8-nextjs-replay");
  const t0 = progress.start("Matrix depth wave 8 nextjs replay");

  const depsOk = existsSync(emitDist);
  /** @type {ReturnType<typeof replaySuite>[]} */
  let results = [];
  let ok = depsOk;
  if (!depsOk) {
    ok = false;
  } else {
    results = SUITES.map(replaySuite);
    if (results.some((r) => !r.ok)) ok = false;
  }

  progress.end("Matrix depth wave 8 nextjs replay", ok, t0);
  return {
    kind: "chrysalis.hub.matrix-depth-wave8-nextjs-replay-smoke",
    schemaVersion: 1,
    ok,
    depsOk,
    suiteCount: SUITES.length,
    passCount: results.filter((r) => r.ok).length,
    results,
    note: depsOk
      ? "Wave 8: nextjs trace-replay sample (correctness=1 expected)"
      : "Missing wptp-emit-nextjs — run pnpm run hub:install-wptp",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixDepthWave8NextjsReplaySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-depth-wave8-nextjs-replay-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
