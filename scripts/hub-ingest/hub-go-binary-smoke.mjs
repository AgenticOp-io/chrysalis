#!/usr/bin/env node
/**
 * Smoke (D6601): black-box Go binary origin.
 * Builds fixtures/hub-flagship-go into an OS temp dir (normal + stripped -s -w),
 * runs go-binary-ingest then go-binary-trace, and compares the lifted
 * method+path surface against the source peel (parseGoRoutes on main.go).
 * Pass = same route surface, handler-body holes not force-closed (D6447),
 * stripped build reports legacy:go-binary-stripped. Nothing lands in the repo.
 */
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseGoRoutes } from "../../packages/hub-native-bridge/dist/go.js";

export const HUB_GO_BINARY_SMOKE_KIND = "chrysalis.hub.go-binary-smoke";
export const HUB_GO_BINARY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-flagship-go");
const ingestScript = join(scriptRoot, "scripts/hub-ingest/go-binary-ingest.mjs");
const traceScript = join(scriptRoot, "scripts/hub-ingest/go-binary-trace.mjs");

const HOLE_UNBOUND = "legacy:go-binary-unbound-route";
const HOLE_BODY = "legacy:go-binary-handler-body";
const HOLE_STRIPPED = "legacy:go-binary-stripped";

// fixtures/hub-flagship-go has only registerRoutes; this build-only entrypoint adds no routes.
const HARNESS_GO = `package main

import (
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.New()
	registerRoutes(r)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	_ = r.Run(":" + port)
}
`;

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 300_000, ...opts });
}

/** True when `needle` appears as a string anywhere inside `v`. */
function deepHas(v, needle) {
  if (typeof v === "string") return v === needle || v.startsWith(`${needle}`);
  if (Array.isArray(v)) return v.some((x) => deepHas(x, needle));
  if (v && typeof v === "object") return Object.values(v).some((x) => deepHas(x, needle));
  return false;
}

function deepHasKey(v, re) {
  if (Array.isArray(v)) return v.some((x) => deepHasKey(x, re));
  if (v && typeof v === "object") {
    return Object.entries(v).some(([k, x]) => (re.test(k) && x != null && x !== false) || deepHasKey(x, re));
  }
  return false;
}

const routeKey = (r) => `${String(r.method).toUpperCase()} ${r.path}`;
const routesOf = (doc) => (Array.isArray(doc) ? doc : (doc?.routes ?? []));

/** Hole on the route object itself, or in a top-level holes[] entry naming that route. */
function routeHasHole(route, doc, reason) {
  if (deepHas(route, reason)) return true;
  const holes = Array.isArray(doc?.holes) ? doc.holes : [];
  return holes.some((h) => deepHas(h, reason) && h?.method && routeKey(h) === routeKey(route));
}

function readJsonOut(cmd, args, outPath) {
  const res = run(process.execPath, [...args, "--out", outPath], { cwd: scriptRoot });
  if (res.status !== 0) {
    return { error: `${cmd} exit ${res.status}: ${(res.stderr || res.stdout || "").slice(0, 400)}` };
  }
  try {
    return { doc: JSON.parse(readFileSync(outPath, "utf8")) };
  } catch (e) {
    return { error: `${cmd} json: ${e.message}` };
  }
}

function buildBinary(work, out, ldflags) {
  const args = ["build", "-o", out];
  if (ldflags) args.push(`-ldflags=${ldflags}`);
  args.push(".");
  const env = { ...process.env, GOFLAGS: "-mod=mod" };
  const res = run("go", args, { cwd: work, env });
  return res.status === 0 ? null : (res.stderr || res.stdout || "").slice(0, 400);
}

export async function runGoBinarySmoke() {
  const base = {
    kind: HUB_GO_BINARY_SMOKE_KIND,
    schemaVersion: HUB_GO_BINARY_SMOKE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
  };
  if (run("go", ["version"]).status !== 0) {
    return { ...base, ok: false, skip: "go-missing", message: "go not on PATH; D6601 smoke skipped" };
  }

  const sourceRoutes = parseGoRoutes(readFileSync(join(fixture, "main.go"), "utf8"));
  const sourceKeys = new Set(sourceRoutes.map(routeKey));

  const work = mkdtempSync(join(tmpdir(), "chrysalis-go-binary-"));
  const failures = [];
  try {
    copyFileSync(join(fixture, "main.go"), join(work, "routes.go"));
    writeFileSync(join(work, "harness.go"), HARNESS_GO);
    const init = run("go", ["mod", "init", "hubflagshipgo"], { cwd: work });
    if (init.status !== 0) return { ...base, ok: false, error: `go mod init: ${init.stderr}` };
    const tidy = run("go", ["mod", "tidy"], { cwd: work });
    if (tidy.status !== 0) return { ...base, ok: false, error: `go mod tidy: ${(tidy.stderr || "").slice(0, 400)}` };

    const exe = process.platform === "win32" ? ".exe" : "";
    const bin = join(work, `app${exe}`);
    const stripped = join(work, `app-stripped${exe}`);
    const buildErr = buildBinary(work, bin, null) ?? buildBinary(work, stripped, "-s -w");
    if (buildErr) return { ...base, ok: false, error: `go build: ${buildErr}` };

    const ingestPath = join(work, "routes.json");
    const ingest = readJsonOut("go-binary-ingest", [ingestScript, bin], ingestPath);
    if (ingest.error) return { ...base, ok: false, error: ingest.error };

    const lifted = routesOf(ingest.doc);
    const liftedKeys = new Set(lifted.map(routeKey));
    const missing = [...sourceKeys].filter((k) => !liftedKeys.has(k));
    const extra = [...liftedKeys].filter((k) => !sourceKeys.has(k));
    if (missing.length) failures.push(`missing routes vs source peel: ${missing.join(", ")}`);
    if (extra.length) failures.push(`extra routes vs source peel: ${extra.join(", ")}`);

    // Without traces nothing backs a handler body, so every route must keep the hole.
    const ingestBodyless = lifted.filter((r) => !routeHasHole(r, ingest.doc, HOLE_BODY)).map(routeKey);
    if (ingestBodyless.length) failures.push(`ingest force-closed ${HOLE_BODY}: ${ingestBodyless.join(", ")}`);

    const tracePath = join(work, "routes.traced.json");
    const trace = readJsonOut("go-binary-trace", [traceScript, bin, "--routes", ingestPath], tracePath);
    let traced = [];
    if (trace.error) {
      failures.push(trace.error);
    } else {
      traced = routesOf(trace.doc);
      const tracedKeys = new Set(traced.map(routeKey));
      const lost = [...liftedKeys].filter((k) => !tracedKeys.has(k));
      if (lost.length) failures.push(`trace dropped routes: ${lost.join(", ")}`);
      // A trace may only close a handler-body hole when it carries recorded evidence.
      const unbacked = traced
        .filter((r) => !routeHasHole(r, trace.doc, HOLE_BODY) && !deepHasKey(r, /trace|evidence/i))
        .map(routeKey);
      if (unbacked.length) failures.push(`trace closed ${HOLE_BODY} without evidence: ${unbacked.join(", ")}`);
    }

    const strippedPath = join(work, "routes.stripped.json");
    const strip = readJsonOut("go-binary-ingest(stripped)", [ingestScript, stripped], strippedPath);
    if (strip.error) failures.push(strip.error);
    else if (!deepHas(strip.doc, HOLE_STRIPPED)) failures.push(`stripped build missing ${HOLE_STRIPPED}`);

    const count = (doc, reason) => routesOf(doc).filter((r) => routeHasHole(r, doc, reason)).length;
    return {
      ...base,
      ok: failures.length === 0,
      sourceRouteCount: sourceKeys.size,
      liftedRouteCount: liftedKeys.size,
      handlerBodyHoles: { ingest: count(ingest.doc, HOLE_BODY), trace: trace.doc ? count(trace.doc, HOLE_BODY) : null },
      unboundRouteHoles: count(ingest.doc, HOLE_UNBOUND),
      strippedHole: strip.doc ? deepHas(strip.doc, HOLE_STRIPPED) : false,
      failures,
    };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

async function main() {
  const report = await runGoBinarySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.skip) console.error(`hub:go-binary-smoke skipped: ${report.message}`);
  if (!report.ok && !report.skip) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
