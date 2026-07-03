#!/usr/bin/env node
/** Phase 41a.1 — JavaScript req/res request-field lowering (G8711). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const JS_SEMANTIC_REQ_RES_SMOKE_KIND = "chrysalis.js-semantic-req-res-smoke";
export const JS_SEMANTIC_REQ_RES_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-js-semantic-req-res";
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

function parseLiftStdout(stdout) {
  const text = stdout.trim();
  const line = text.split("\n").pop() ?? "{}";
  return JSON.parse(line);
}

/** G8711 — req.params/query/body/headers/cookies + req.get() lower hole-free on gold fixture. */
export function runJsSemanticReqResB1Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const r = spawnSync(process.execPath, [liftScript, fixture, "--language", "javascript"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0) {
    return { ok: false, skip: "lift-failed", stderr: r.stderr?.slice(0, 500) };
  }
  let report;
  try {
    report = parseLiftStdout(r.stdout);
  } catch {
    return { ok: false, skip: "lift-json" };
  }
  const holeCount = report.holeCount ?? 1;
  const webirPath = join(fixture, ".chrysalis/hub.javascript.webir.json");
  let sources = [];
  try {
    const mod = JSON.parse(readFileSync(webirPath, "utf8"));
    const walk = (n) => {
      if (!n || typeof n !== "object") return;
      if (n.dialect === "data" && n.op === "request.field" && n.attrs?.source) {
        sources.push(n.attrs.source);
      }
      for (const v of Object.values(n)) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") walk(v);
      }
    };
    walk(mod);
  } catch {
    return { ok: false, skip: "webir-read", holeCount };
  }
  const need = ["path", "query", "body", "header", "cookie"];
  const have = new Set(sources);
  const fieldsOk = need.every((s) => have.has(s));
  const ok = holeCount === 0 && fieldsOk && (report.routeCount ?? 0) >= 1;
  return {
    ok,
    holeCount,
    routeCount: report.routeCount ?? 0,
    requestFieldSources: [...have].sort(),
    fieldsOk,
    fixtureRel,
  };
}

export async function runJsSemanticReqResSmoke(opts = {}) {
  const progress = createSmokeProgress("js-semantic-req-res");
  const t0 = progress.start("JS semantic req/res (G8711)");
  const gate = runJsSemanticReqResB1Gate();
  progress.end("JS semantic req/res (G8711)", gate.ok === true, t0);
  return {
    kind: JS_SEMANTIC_REQ_RES_SMOKE_KIND,
    schemaVersion: JS_SEMANTIC_REQ_RES_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runJsSemanticReqResSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-js-semantic-req-res-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
