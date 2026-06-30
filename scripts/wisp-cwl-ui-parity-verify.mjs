#!/usr/bin/env node
/**
 * WISP CWL UI parity verification — forbidden-stub crawler, manifest, anchor HTTP probes.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { routesPath } from "./wisp-cwl-apply-surfaces-lib.mjs";
import {
  extractRouteBlock,
  listGetUiPaths,
} from "./wisp-cwl-bulk-lift-lib.mjs";
import {
  WISP_UI_PARITY_KIND,
  WISP_UI_PARITY_SCHEMA_VERSION,
  wispUiAnchorSpecs,
  WISP_FORBIDDEN_STUB_PATTERNS,
  htmlContainsForbiddenStub,
} from "./wisp-cwl-ui-parity-lib.mjs";

export const WISP_UI_PARITY_VERIFY_KIND = `${WISP_UI_PARITY_KIND}.verify`;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifestPath = join(scriptRoot, "fixtures/hub-wisp-management/chrysalis.wisp-ui-parity.v1.json");

/** @param {string} block */
function extractRouteResponseSlice(block) {
  const htmlMatch = /return\s+html\s+"((?:\\.|[^"\\])*)"/s.exec(block);
  if (htmlMatch) {
    return htmlMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }
  const uiMatch = /return\s+ui\s*\{([\s\S]*)\}\s*;?\s*$/.exec(block);
  if (uiMatch) return uiMatch[1];
  return block;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.routesPath]
 * @param {RegExp[]} [opts.patterns]
 */
export function scanWispRoutesForForbiddenStubs(opts = {}) {
  const path = opts.routesPath ?? routesPath;
  const patterns = opts.patterns ?? WISP_FORBIDDEN_STUB_PATTERNS;
  if (!existsSync(path)) return { ok: false, skip: "missing-routes-cwl", violations: [] };

  const text = readFileSync(path, "utf8");
  const paths = listGetUiPaths(text);
  /** @type {Array<{ path: string; pattern: string }>} */
  const violations = [];
  let htmlRoutes = 0;
  let uiRoutes = 0;

  for (const httpPath of paths) {
    const block = extractRouteBlock(text, httpPath);
    if (!block) continue;
    if (/\breturn\s+html\s+"/.test(block)) htmlRoutes++;
    if (/\breturn\s+ui\s*\{/.test(block)) uiRoutes++;
    const body = extractRouteResponseSlice(block);
    for (const re of patterns) {
      if (re.test(body)) {
        violations.push({ path: httpPath, pattern: re.source });
      }
    }
  }

  return {
    ok: violations.length === 0 && uiRoutes === 0,
    routeCount: paths.length,
    htmlRoutes,
    uiRoutes,
    violationCount: violations.length,
    violations: violations.slice(0, 40),
  };
}

/**
 * @param {object} [opts]
 * @param {string} [opts.routesPath]
 * @param {string} [opts.outPath]
 */
export function buildWispUiParityManifest(opts = {}) {
  const path = opts.routesPath ?? routesPath;
  const outPath = resolve(opts.outPath ?? defaultManifestPath);
  const stubScan = scanWispRoutesForForbiddenStubs({ routesPath: path });
  const anchors = wispUiAnchorSpecs();
  const manifest = {
    kind: WISP_UI_PARITY_VERIFY_KIND,
    schemaVersion: WISP_UI_PARITY_SCHEMA_VERSION,
    ok: stubScan.ok === true,
    generatedAt: new Date().toISOString(),
    anchors,
    stubScan,
  };
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...manifest, outPath };
}

/**
 * @param {string} baseUrl
 * @param {import("./wisp-cwl-ui-parity-lib.mjs").WispUiAnchorSpec[]} [specs]
 */
export async function probeWispUiAnchorRoutes(baseUrl, specs = wispUiAnchorSpecs()) {
  /** @type {Array<{ path: string; ok: boolean; status: number; missing: string[] }>} */
  const probes = [];
  let ok = true;
  for (const spec of specs) {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}${spec.path}`);
    const body = await res.text();
    const missing = spec.required.filter((token) => !body.includes(token));
    const minLength = spec.minLength ?? 0;
    const probeOk = res.status === 200 && missing.length === 0 && body.length >= minLength;
    if (!probeOk) ok = false;
    probes.push({ path: spec.path, ok: probeOk, status: res.status, missing });
  }
  return { ok, probes };
}

/**
 * Probe all non-API UI routes for complete demo surfaces (Phase 32).
 * @param {string} baseUrl
 * @param {string[]} [paths]
 */
export async function probeAllWispModuleDemoRoutes(baseUrl, paths = listGetUiPaths(readFileSync(routesPath, "utf8"))) {
  const redirectOk = new Set(["/", "/modules", "/modules/customers/portal", "/portal/:tenantId"]);
  /** @type {Array<{ path: string; ok: boolean; status: number; reason?: string }>} */
  const probes = [];
  let ok = true;
  for (const path of paths) {
    if (path.startsWith("/api")) continue;
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`);
      const body = await res.text();
      const hasDemo =
        body.includes("wisp-demo-content") || wispUiAnchorSpecs().some((a) => a.path === path);
      const isRedirect =
        redirectOk.has(path) &&
        (body.includes("location.replace") || body.includes('http-equiv="refresh"'));
      const emptyShell = body.includes('<main class="wisp-surface-body"></main>');
      const forbidden = htmlContainsForbiddenStub(body);
      const minOk = body.length >= (path === "/modules/coverage-map" ? 80 : 250);
      const probeOk = res.status === 200 && (hasDemo || isRedirect) && !emptyShell && !forbidden && minOk;
      if (!probeOk) ok = false;
      probes.push({
        path,
        ok: probeOk,
        status: res.status,
        reason: !hasDemo ? "missing-demo" : emptyShell ? "empty-shell" : forbidden ? "forbidden-stub" : !minOk ? "too-short" : undefined,
      });
    } catch (err) {
      ok = false;
      probes.push({ path, ok: false, status: 0, reason: err instanceof Error ? err.message : "fetch-failed" });
    }
  }
  return { ok, probeCount: probes.length, passCount: probes.filter((p) => p.ok).length, probes };
}

function main() {
  const scan = scanWispRoutesForForbiddenStubs();
  const manifest = buildWispUiParityManifest();
  console.log(JSON.stringify({ scan, manifest }, null, 2));
  if (!scan.ok || !manifest.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-ui-parity-verify")) main();
