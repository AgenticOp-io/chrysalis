#!/usr/bin/env node
/** Phase 41c.10 — Ruby Sinatra request-field semantic lowering (G8744). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { walkHubWebirGoldenNodes, parseHubWebirGoldenFile } from "./hub-webir-golden-walk.mjs";

export const RUBY_SEMANTIC_REQ_RES_SMOKE_KIND = "chrysalis.ruby-semantic-req-res-smoke";
export const RUBY_SEMANTIC_REQ_RES_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-ruby-semantic-req-res";
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

/** G8744 — Sinatra params/request env lower hole-free. */
export function runRubySemanticReqResC10Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "ruby"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return { ok: false, skip: "lift-failed", stderr: lift.stderr?.slice(0, 400) };
  }
  let report;
  try {
    report = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");
  } catch {
    return { ok: false, skip: "lift-json" };
  }
  const holeCount = report.holeCount ?? 1;
  const webirPath = join(fixture, ".chrysalis/hub.ruby.webir.json");
  /** @type {string[]} */
  const sources = [];
  try {
    const mod = parseHubWebirGoldenFile(readFileSync(webirPath, "utf8"));
    walkHubWebirGoldenNodes(mod, (n) => {
      if (n.dialect === "data" && n.op === "request.field" && n.attrs?.source) {
        sources.push(String(n.attrs.source));
      }
    });
  } catch {
    return { ok: false, skip: "webir-read", holeCount };
  }
  const need = ["path", "query", "header", "cookie"];
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

export async function runRubySemanticReqResSmoke() {
  const progress = createSmokeProgress("ruby-semantic-req-res");
  const t0 = progress.start("Ruby semantic req/res (G8744)");
  const gate = runRubySemanticReqResC10Gate();
  progress.end("Ruby semantic req/res (G8744)", gate.ok === true, t0);
  return {
    kind: RUBY_SEMANTIC_REQ_RES_SMOKE_KIND,
    schemaVersion: RUBY_SEMANTIC_REQ_RES_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runRubySemanticReqResSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-ruby-semantic-req-res-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
