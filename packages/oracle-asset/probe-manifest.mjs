#!/usr/bin/env node
/**
 * Probe asset hub route manifests (oracle-asset).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const fixture = process.argv[2];
  if (!fixture) {
    console.log(JSON.stringify({ ok: false, error: "missing-fixture" }));
    process.exit(1);
  }
  const routesPath = join(fixture, "chrysalis.oracle-probe-routes.json");
  let spec;
  try {
    spec = JSON.parse(readFileSync(routesPath, "utf8"));
  } catch {
    console.log(JSON.stringify({ ok: false, error: "missing-probe-routes" }));
    process.exit(1);
  }
  const output = process.argv[3];
  if (!output) {
    console.log(JSON.stringify({ ok: false, error: "missing-output" }));
    process.exit(1);
  }
  const manifestPath = join(fixture, "generated", output, "chrysalis.hub-route-manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    console.log(JSON.stringify({ ok: false, error: "missing-route-manifest" }));
    process.exit(1);
  }
  const byKey = new Map();
  for (const r of manifest.routes ?? []) {
    byKey.set(`${r.method} ${r.path}`, r);
  }
  const results = [];
  for (const route of spec.routes ?? []) {
    const method = (route.method ?? "GET").toUpperCase();
    const path = route.path ?? "/";
    const hit = byKey.get(`${method} ${path}`);
    if (!hit) {
      results.push({ method, path, error: "handler-not-found" });
      continue;
    }
    results.push({
      method,
      path,
      status: hit.status ?? 200,
      body: hit.body ?? "",
      headers: hit.headers ?? {},
    });
  }
  console.log(JSON.stringify({ ok: true, results, routeCount: results.length }));
}

main();
