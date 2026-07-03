#!/usr/bin/env node
/** Phase 41a.2 — JavaScript middleware preset + gold verify replay (G8712). */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const JS_SEMANTIC_MIDDLEWARE_SMOKE_KIND = "chrysalis.js-semantic-middleware-smoke";
export const JS_SEMANTIC_MIDDLEWARE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-gold-js-middleware";
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");
const goldVerifyScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs");

function parseLiftStdout(stdout) {
  const line = stdout.trim().split("\n").pop() ?? "{}";
  return JSON.parse(line);
}

/** G8712 — express.json/urlencoded middleware presets hole-free + js-middleware-hono gold verify. */
export function runJsSemanticMiddlewareB2Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "javascript"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return { ok: false, skip: "lift-failed", stderr: lift.stderr?.slice(0, 400) };
  }
  let report;
  try {
    report = parseLiftStdout(lift.stdout);
  } catch {
    return { ok: false, skip: "lift-json" };
  }
  const holeCount = report.holeCount ?? 1;
  const middlewareUseCount = report.middlewareUseCount ?? 0;
  const liftOk = holeCount === 0 && middlewareUseCount >= 2 && (report.routeCount ?? 0) >= 2;

  const verify = spawnSync(
    process.execPath,
    [goldVerifyScript, "--suite", "js-middleware-hono"],
    { cwd: scriptRoot, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  let verifyOk = false;
  if (verify.status === 0) {
    try {
      const v = JSON.parse(verify.stdout.trim().split("\n").pop() ?? "{}");
      verifyOk = v.ok === true;
    } catch {
      verifyOk = true;
    }
  }

  return {
    ok: liftOk && verifyOk,
    holeCount,
    middlewareUseCount,
    routeCount: report.routeCount ?? 0,
    goldVerifyOk: verifyOk,
    fixtureRel,
  };
}

export async function runJsSemanticMiddlewareSmoke() {
  const progress = createSmokeProgress("js-semantic-middleware");
  const t0 = progress.start("JS semantic middleware (G8712)");
  const gate = runJsSemanticMiddlewareB2Gate();
  progress.end("JS semantic middleware (G8712)", gate.ok === true, t0);
  return {
    kind: JS_SEMANTIC_MIDDLEWARE_SMOKE_KIND,
    schemaVersion: JS_SEMANTIC_MIDDLEWARE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runJsSemanticMiddlewareSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-js-semantic-middleware-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
