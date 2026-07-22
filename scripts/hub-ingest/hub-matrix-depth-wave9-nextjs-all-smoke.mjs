#!/usr/bin/env node
/**
 * Wave 9 — verify ALL nextjs gold suites (requires wptp-emit-nextjs).
 * Gate: hub:matrix-depth-wave9-nextjs-all-smoke
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_GOLD_SUITES } from "./hub-gold-manifest.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const emitDist = join(
  resolve(process.env.WPTP_EMIT_NEXTJS_ROOT ?? join(ROOT, "..", "wptp-emit-nextjs")),
  "dist",
  "index.js",
);

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

export async function runMatrixDepthWave9NextjsAllSmoke() {
  const progress = createSmokeProgress("matrix-depth-wave9-nextjs-all");
  const t0 = progress.start("Matrix depth wave 9 nextjs all");

  const depsOk = existsSync(emitDist);
  const suites = HUB_GOLD_SUITES.filter((s) => s.emitTarget === "nextjs" && s.traceReplay).map((s) => s.id);

  /** @type {{ id: string, ok: boolean, reason: string | null, status: number | null }[]} */
  let results = [];
  let ok = depsOk && suites.length > 0;

  if (!depsOk) {
    ok = false;
  } else {
    results = suites.map(verifySuite);
    if (results.some((r) => !r.ok)) ok = false;
  }

  const fails = results.filter((r) => !r.ok);
  progress.end("Matrix depth wave 9 nextjs all", ok, t0);
  return {
    kind: "chrysalis.hub.matrix-depth-wave9-nextjs-all-smoke",
    schemaVersion: 1,
    ok,
    depsOk,
    suiteCount: suites.length,
    passCount: results.filter((r) => r.ok).length,
    failCount: fails.length,
    fails: fails.slice(0, 40),
    note: depsOk
      ? "Wave 9: gold-verify every nextjs trace-replay suite"
      : "Missing wptp-emit-nextjs — run pnpm run hub:install-wptp",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runMatrixDepthWave9NextjsAllSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-matrix-depth-wave9-nextjs-all-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
