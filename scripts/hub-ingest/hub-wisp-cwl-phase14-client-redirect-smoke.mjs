#!/usr/bin/env node
/** Phase 14 client redirect smoke (G6510) — CWL chimera must not serve dead-end Svelte auth spinners. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyWispClientRedirects,
  WISP_CLIENT_REDIRECT_ROUTES,
  isDeadEndRedirectHtml,
} from "../wisp-cwl-apply-client-redirects.mjs";
import { applyWispPhase13Surfaces } from "../wisp-cwl-apply-phase13-surfaces.mjs";

export const WISP_CWL_PHASE14_CLIENT_REDIRECT_SMOKE_KIND = "chrysalis.wisp-cwl-phase14-client-redirect-smoke";
export const WISP_CWL_PHASE14_CLIENT_REDIRECT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const routesPath = join(scriptRoot, "fixtures/hub-wisp-management/routes.cwl");

/** G6511 — program doc records client redirect gate. */
export function runWispPhase14ClientRedirectDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6510") &&
    text.includes("client redirect") &&
    text.includes("wisp-cwl-apply-client-redirects");
  return { ok, clientRedirectDocOk: ok };
}

/** G6510 — fixture routes have navigation on Svelte redirect-only paths. */
export function runWispClientRedirectRoutesGate(opts = {}) {
  if (opts.apply !== false) {
    applyWispPhase13Surfaces();
  } else {
    applyWispClientRedirects();
  }
  if (!existsSync(routesPath)) return { ok: false, skip: "missing-routes-cwl" };
  const text = readFileSync(routesPath, "utf8");
  /** @type {string[]} */
  const missing = [];
  /** @type {string[]} */
  const deadEnds = [];
  for (const route of WISP_CLIENT_REDIRECT_ROUTES) {
    const idx = text.indexOf(`@page GET "${route.path}"`);
    if (idx < 0) {
      missing.push(route.path);
      continue;
    }
    const slice = text.slice(idx, idx + 1200);
    const ret = slice.match(/return html "([^"]*(?:\\.[^"]*)*)";/);
    if (!ret) {
      missing.push(route.path);
      continue;
    }
    if (!ret[1].includes("location.replace") && !ret[1].includes("location.pathname.match")) {
      deadEnds.push(route.path);
    } else if (isDeadEndRedirectHtml(ret[1])) {
      deadEnds.push(route.path);
    }
  }
  const ok = missing.length === 0 && deadEnds.length === 0;
  return {
    ok,
    routeCount: WISP_CLIENT_REDIRECT_ROUTES.length,
    missing,
    deadEnds,
    patchedPaths: WISP_CLIENT_REDIRECT_ROUTES.map((r) => r.path),
  };
}

/** G6510 composite. */
export function runWispCwlPhase14ClientRedirectGate(opts = {}) {
  const doc = runWispPhase14ClientRedirectDocGate();
  const routes = runWispClientRedirectRoutesGate(opts);
  const ok = doc.ok === true && routes.ok === true;
  return {
    kind: WISP_CWL_PHASE14_CLIENT_REDIRECT_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE14_CLIENT_REDIRECT_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    routes,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispCwlPhase14ClientRedirectGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase14-client-redirect-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
