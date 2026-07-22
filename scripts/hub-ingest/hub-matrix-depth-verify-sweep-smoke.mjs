#!/usr/bin/env node
/**
 * Wave 7 — sample gold-verify sweep across -full / depth suites (non-nextjs).
 * Gate: hub:matrix-depth-verify-sweep-smoke
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Pick a diverse sample: every Nth -full suite + known depth suites, skip nextjs. */
function pickSampleSuites() {
  const full = HUB_GOLD_SUITES.filter(
    (s) => s.traceReplay && s.emitTarget !== "nextjs" && (s.id.includes("-full") || s.id.includes("-structured-") || s.id.includes("-middleware-")),
  );
  const sample = [];
  for (let i = 0; i < full.length; i += Math.max(1, Math.floor(full.length / 40))) {
    sample.push(full[i].id);
    if (sample.length >= 40) break;
  }
  // Always include a few high-value anchors
  for (const id of [
    "js-structured-hono",
    "ts-middleware-hono",
    "php-structured-hono",
    "php-middleware-hono",
    "java-middleware-python-native",
    "kotlin-structured-hono",
    "cwl-middleware-hono",
  ]) {
    if (HUB_GOLD_SUITES.some((s) => s.id === id) && !sample.includes(id)) sample.push(id);
  }
  return sample;
}

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

export async function runMatrixDepthVerifySweepSmoke() {
  const progress = createSmokeProgress("matrix-depth-verify-sweep");
  const t0 = progress.start("Matrix depth verify sweep");

  const suites = pickSampleSuites();
  const results = suites.map(verifySuite);
  const fail = results.filter((r) => !r.ok);
  const ok = fail.length === 0;

  progress.end("Matrix depth verify sweep", ok, t0);
  return {
    kind: "chrysalis.hub.matrix-depth-verify-sweep-smoke",
    schemaVersion: 1,
    ok,
    sampled: suites.length,
    passCount: results.filter((r) => r.ok).length,
    failCount: fail.length,
    fails: fail.slice(0, 30),
    note: "Wave 7: sampled gold-verify sweep (non-nextjs depth suites)",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixDepthVerifySweepSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-depth-verify-sweep-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
