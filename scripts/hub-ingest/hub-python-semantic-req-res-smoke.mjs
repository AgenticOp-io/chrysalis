#!/usr/bin/env node
/** Phase 41b.4 — Python request-field semantic lowering (G8724). */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { exportPythonHubWebir } from "./hub-python-hub-webir.mjs";
import { walkHubWebirGoldenNodes, parseHubWebirGoldenFile } from "./hub-webir-golden-walk.mjs";

export const PYTHON_SEMANTIC_REQ_RES_SMOKE_KIND = "chrysalis.python-semantic-req-res-smoke";
export const PYTHON_SEMANTIC_REQ_RES_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-python-semantic-req-res";

/** G8724 — Flask request.args/headers/cookies/json + path params lower hole-free. */
export async function runPythonSemanticReqResB4Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const exported = await exportPythonHubWebir(fixture);
  if (exported.skip) {
    return { ok: false, skip: exported.skip };
  }
  const holeCount = exported.holeCount ?? 1;
  const webirPath = join(fixture, ".chrysalis/hub.python.webir.json");
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
  const need = ["path", "query", "body", "header", "cookie"];
  const have = new Set(sources);
  const fieldsOk = need.every((s) => have.has(s));
  const ok = exported.ok === true && holeCount === 0 && fieldsOk && (exported.routeCount ?? 0) >= 1;
  return {
    ok,
    holeCount,
    routeCount: exported.routeCount ?? 0,
    requestFieldSources: [...have].sort(),
    fieldsOk,
    fixtureRel,
  };
}

export async function runPythonSemanticReqResSmoke() {
  const progress = createSmokeProgress("python-semantic-req-res");
  const t0 = progress.start("Python semantic req/res (G8724)");
  const gate = await runPythonSemanticReqResB4Gate();
  progress.end("Python semantic req/res (G8724)", gate.ok === true, t0);
  return {
    kind: PYTHON_SEMANTIC_REQ_RES_SMOKE_KIND,
    schemaVersion: PYTHON_SEMANTIC_REQ_RES_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runPythonSemanticReqResSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-python-semantic-req-res-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
