#!/usr/bin/env node
/** Phase 41c.5 — Java Spring request-field semantic lowering (G8735). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { walkHubWebirGoldenNodes, parseHubWebirGoldenFile } from "./hub-webir-golden-walk.mjs";

export const JAVA_SEMANTIC_REQ_RES_SMOKE_KIND = "chrysalis.java-semantic-req-res-smoke";
export const JAVA_SEMANTIC_REQ_RES_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-java-semantic-req-res";
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

function parseLiftStdout(stdout) {
  const line = stdout.trim().split("\n").pop() ?? "{}";
  return JSON.parse(line);
}

/** G8735 — Spring @PathVariable/@RequestParam/@RequestHeader/@CookieValue + Map.of refs. */
export function runJavaSemanticReqResC5Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "java"], {
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
  const webirPath = join(fixture, ".chrysalis/hub.java.webir.json");
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

export async function runJavaSemanticReqResSmoke() {
  const progress = createSmokeProgress("java-semantic-req-res");
  const t0 = progress.start("Java semantic req/res (G8735)");
  const gate = runJavaSemanticReqResC5Gate();
  progress.end("Java semantic req/res (G8735)", gate.ok === true, t0);
  return {
    kind: JAVA_SEMANTIC_REQ_RES_SMOKE_KIND,
    schemaVersion: JAVA_SEMANTIC_REQ_RES_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runJavaSemanticReqResSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-java-semantic-req-res-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
