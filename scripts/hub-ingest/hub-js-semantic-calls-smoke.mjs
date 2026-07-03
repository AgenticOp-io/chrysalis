#!/usr/bin/env node
/** Phase 41a.4 — JavaScript parseInt(req.query) call lowering (G8714). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const JS_SEMANTIC_CALLS_SMOKE_KIND = "chrysalis.js-semantic-calls-smoke";
export const JS_SEMANTIC_CALLS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-js-semantic-calls";
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

function parseLiftStdout(stdout) {
  const line = stdout.trim().split("\n").pop() ?? "{}";
  return JSON.parse(line);
}

/** G8714 — parseInt on request fields lowers without hub-js:call-expression holes. */
export function runJsSemanticCallsB4Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const r = spawnSync(process.execPath, [liftScript, fixture, "--language", "javascript"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0) {
    return { ok: false, skip: "lift-failed", stderr: r.stderr?.slice(0, 400) };
  }
  let report;
  try {
    report = parseLiftStdout(r.stdout);
  } catch {
    return { ok: false, skip: "lift-json" };
  }
  const holeCount = report.holeCount ?? 1;
  const webirPath = join(fixture, ".chrysalis/hub.javascript.webir.json");
  let parseIntCalls = 0;
  try {
    const mod = JSON.parse(readFileSync(webirPath, "utf8"));
    const walk = (n) => {
      if (!n || typeof n !== "object") return;
      if (n.dialect === "data" && n.op === "call" && n.attrs?.callee === "parseInt") parseIntCalls += 1;
      for (const v of Object.values(n)) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") walk(v);
      }
    };
    walk(mod);
  } catch {
    return { ok: false, skip: "webir-read", holeCount };
  }
  const ok = holeCount === 0 && parseIntCalls >= 1 && (report.routeCount ?? 0) >= 1;
  return { ok, holeCount, parseIntCalls, routeCount: report.routeCount ?? 0, fixtureRel };
}

export async function runJsSemanticCallsSmoke() {
  const progress = createSmokeProgress("js-semantic-calls");
  const t0 = progress.start("JS semantic calls (G8714)");
  const gate = runJsSemanticCallsB4Gate();
  progress.end("JS semantic calls (G8714)", gate.ok === true, t0);
  return {
    kind: JS_SEMANTIC_CALLS_SMOKE_KIND,
    schemaVersion: JS_SEMANTIC_CALLS_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runJsSemanticCallsSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-js-semantic-calls-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
