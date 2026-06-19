#!/usr/bin/env node
/**
 * Apply WISP Phase 13 M6 — CWL Effects (RFC-0007) on M1–M2 protected routes.
 * Declarative `effects: session.read` metadata; runtime-cwl does not enforce auth yet.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { routesPath, fixtureDir } from "./wisp-cwl-apply-surfaces-lib.mjs";
import { M2_ADMIN_ROUTES } from "./wisp-cwl-apply-m2-surfaces.mjs";

export const WISP_M6_EFFECTS_MANIFEST_KIND = "chrysalis.wisp.m6-effects-manifest";
export const WISP_M6_EFFECTS_MANIFEST_SCHEMA_VERSION = 1;

const manifestPath = join(fixtureDir, "wisp-m6-effects-manifest.v1.json");

/** Routes that declare session.read (M1 dashboard + M2 admin/customers + tenant ops). */
export const M6_SESSION_READ_PATHS = [
  "/dashboard",
  ...M2_ADMIN_ROUTES.map((r) => r.path),
  "/modules/customers",
  "/tenant-admin",
  "/tenant-selector",
  "/tenant-setup",
  "/settings/module-access",
];

/** @param {string} text @param {string} path @param {string} effect */
export function patchPageEffect(text, path, effect = "session.read") {
  const marker = `@page GET "${path}"`;
  const idx = text.indexOf(marker);
  if (idx < 0) return { text, ok: false, skip: `missing-page-${path}` };
  const nextRoute = text.indexOf("\n@", idx + marker.length);
  const blockEnd = nextRoute >= 0 ? nextRoute : text.length;
  const block = text.slice(idx, blockEnd);
  if (block.includes(`effects: ${effect};`)) {
    return { text, ok: true, skipped: true, path };
  }
  const noneIdx = block.indexOf("effects: none;");
  if (noneIdx < 0) return { text, ok: false, skip: `missing-effects-none-${path}` };
  const absIdx = idx + noneIdx;
  const updated =
    text.slice(0, absIdx) + `effects: ${effect};` + text.slice(absIdx + "effects: none;".length);
  return { text: updated, ok: true, path };
}

export function applyM6EffectsToRoutesCwl() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  let text = readFileSync(routesPath, "utf8");
  let patched = 0;
  for (const path of M6_SESSION_READ_PATHS) {
    const r = patchPageEffect(text, path);
    if (!r.ok) return r;
    if (!r.skipped) patched++;
    text = r.text;
  }
  writeFileSync(routesPath, text, "utf8");
  return { ok: true, routesPath, patched, total: M6_SESSION_READ_PATHS.length };
}

export function runM6EffectsRoutesGate() {
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  const text = readFileSync(routesPath, "utf8");
  const missing = M6_SESSION_READ_PATHS.filter((p) => {
    const marker = `@page GET "${p}"`;
    const idx = text.indexOf(marker);
    if (idx < 0) return true;
    const nextRoute = text.indexOf("\n@", idx + marker.length);
    const block = text.slice(idx, nextRoute >= 0 ? nextRoute : text.length);
    return !block.includes("effects: session.read;");
  });
  const ok = missing.length === 0;
  return { ok, protectedCount: M6_SESSION_READ_PATHS.length, missing };
}

export function buildM6EffectsManifest() {
  const routes = runM6EffectsRoutesGate();
  const manifest = {
    kind: WISP_M6_EFFECTS_MANIFEST_KIND,
    schemaVersion: WISP_M6_EFFECTS_MANIFEST_SCHEMA_VERSION,
    ok: routes.ok === true,
    wave: "M6",
    rfc: "CWL-RFC-0007",
    surfaces: {
      effects: M6_SESSION_READ_PATHS.map((path) => ({
        path,
        effects: ["session.read"],
        note: "Declarative metadata; chimera/Firebase auth enforcement stays upstream",
      })),
    },
    protectedCount: M6_SESSION_READ_PATHS.length,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ...manifest, manifestPath, routes };
}

/** @param {object} [opts] */
export function applyWispM6Effects(opts = {}) {
  const routes = opts.skipRoutes ? { ok: true, skip: "skip-routes" } : applyM6EffectsToRoutesCwl();
  const manifest = buildM6EffectsManifest();
  const ok = routes.ok === true && manifest.ok === true;
  return { ok, routes, manifest };
}

async function main() {
  const r = applyWispM6Effects();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-m6-effects")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
