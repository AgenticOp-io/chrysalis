#!/usr/bin/env node
/** Phase 14 demo manifest smoke (G6540) — operator demo topology fixture + probe catalog. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWispDemoManifest, WISP_DEMO_MANIFEST_KIND } from "../wisp-cwl-demo-manifest.mjs";
import { WISP_CLIENT_REDIRECT_ROUTES } from "../wisp-cwl-apply-client-redirects.mjs";

export const WISP_CWL_PHASE14_DEMO_MANIFEST_SMOKE_KIND = "chrysalis.wisp-cwl-phase14-demo-manifest-smoke";
export const WISP_CWL_PHASE14_DEMO_MANIFEST_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-demo-manifest.v1.json");

/** G6541 — program doc references demo manifest gate. */
export function runWispPhase14DemoManifestDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6540") &&
    text.includes("wisp-demo-manifest") &&
    text.includes("Demo topology");
  return { ok, demoManifestDocOk: ok };
}

/** G6540 — demo manifest schema + health probe catalog. */
export function runWispDemoManifestGate(opts = {}) {
  if (opts.refresh !== false && !opts.skipRefresh) {
    buildWispDemoManifest();
  }
  if (!existsSync(manifestPath)) return { ok: false, skip: "missing-demo-manifest" };
  const json = JSON.parse(readFileSync(manifestPath, "utf8"));
  const redirectPaths = WISP_CLIENT_REDIRECT_ROUTES.map((r) => r.path);
  const manifestRedirects = json.clientRedirectPaths ?? [];
  const probes = json.healthProbes ?? [];
  const ok =
    json.kind === WISP_DEMO_MANIFEST_KIND &&
    json.schemaVersion === 1 &&
    json.backend?.url?.includes("hss.wisptools.io") &&
    json.gce?.port === 19100 &&
    probes.length >= 5 &&
    probes.some((p) => p.path === "/api/hss" && p.expect === "api-proxy") &&
    redirectPaths.every((p) => manifestRedirects.includes(p));
  return {
    ok,
    manifestPath,
    probeCount: probes.length,
    redirectCount: manifestRedirects.length,
    lastKnownNatIp: json.gce?.lastKnownNatIp ?? null,
  };
}

/** G6540 composite. */
export function runWispCwlPhase14DemoManifestGate(opts = {}) {
  const doc = runWispPhase14DemoManifestDocGate();
  const manifest = runWispDemoManifestGate(opts);
  const ok = doc.ok === true && manifest.ok === true;
  return {
    kind: WISP_CWL_PHASE14_DEMO_MANIFEST_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE14_DEMO_MANIFEST_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    manifest,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispCwlPhase14DemoManifestGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase14-demo-manifest-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
