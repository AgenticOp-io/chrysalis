#!/usr/bin/env node
/** Phase 41c.9 — C# ASP.NET request-field semantic lowering (G8739). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { walkHubWebirGoldenNodes, parseHubWebirGoldenFile } from "./hub-webir-golden-walk.mjs";

export const CSHARP_SEMANTIC_REQ_RES_SMOKE_KIND = "chrysalis.csharp-semantic-req-res-smoke";
export const CSHARP_SEMANTIC_REQ_RES_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-csharp-semantic-req-res";
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

/** G8739 — Minimal API HttpRequest + route params lower hole-free. */
export function runCsharpSemanticReqResC9Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "csharp"], {
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
  const webirPath = join(fixture, ".chrysalis/hub.csharp.webir.json");
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

export async function runCsharpSemanticReqResSmoke() {
  const progress = createSmokeProgress("csharp-semantic-req-res");
  const t0 = progress.start("C# semantic req/res (G8739)");
  const gate = runCsharpSemanticReqResC9Gate();
  progress.end("C# semantic req/res (G8739)", gate.ok === true, t0);
  return {
    kind: CSHARP_SEMANTIC_REQ_RES_SMOKE_KIND,
    schemaVersion: CSHARP_SEMANTIC_REQ_RES_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCsharpSemanticReqResSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-csharp-semantic-req-res-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
