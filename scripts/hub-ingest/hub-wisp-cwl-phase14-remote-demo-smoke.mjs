#!/usr/bin/env node
/** Phase 14 remote demo smoke (G6600) — live chimera probes from demo manifest. */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import {
  runWispDemoManifestVerify,
  resolveWispRemoteDemoBaseUrl,
} from "../wisp-cwl-demo-manifest-verify.mjs";

export const WISP_CWL_PHASE14_REMOTE_DEMO_SMOKE_KIND = "chrysalis.wisp-cwl-phase14-remote-demo-smoke";
export const WISP_CWL_PHASE14_REMOTE_DEMO_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-demo-manifest.v1.json");

/** G6601 — program doc records remote demo gate. */
export function runWispPhase14RemoteDemoDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6600") &&
    text.includes("wisp-cwl-demo-manifest-verify") &&
    text.includes("redirect-login");
  return { ok, remoteDemoDocOk: ok };
}

/** G6600 — live demo manifest verify (skip live in CI unless CHRYSALIS_WISP_REMOTE_DEMO_REQUIRED=1). */
export async function runWispCwlPhase14RemoteDemoGate(opts = {}) {
  const doc = runWispPhase14RemoteDemoDocGate();
  const skipLive =
    opts.skipLive === true ||
    (process.env.GITHUB_ACTIONS === "true" && process.env.CHRYSALIS_WISP_REMOTE_DEMO_REQUIRED !== "1");

  if (skipLive) {
    return {
      kind: WISP_CWL_PHASE14_REMOTE_DEMO_SMOKE_KIND,
      schemaVersion: WISP_CWL_PHASE14_REMOTE_DEMO_SMOKE_SCHEMA_VERSION,
      ok: doc.ok === true,
      doc,
      verify: { ok: true, skip: "skip-live-remote-demo" },
      generatedAt: new Date().toISOString(),
    };
  }

  const baseUrl =
    opts.baseUrl?.replace(/\/$/, "") ??
    resolveWispRemoteDemoBaseUrl(opts.manifestPath ?? manifestPath);

  if (!baseUrl) {
    return {
      kind: WISP_CWL_PHASE14_REMOTE_DEMO_SMOKE_KIND,
      schemaVersion: WISP_CWL_PHASE14_REMOTE_DEMO_SMOKE_SCHEMA_VERSION,
      ok: doc.ok === true,
      doc,
      verify: { ok: true, skip: "no-remote-demo-url" },
      generatedAt: new Date().toISOString(),
    };
  }

  const verify = await runWispDemoManifestVerify({
    baseUrl,
    manifestPath: opts.manifestPath ?? manifestPath,
  });

  const ok = doc.ok === true && verify.ok === true;
  return {
    kind: WISP_CWL_PHASE14_REMOTE_DEMO_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE14_REMOTE_DEMO_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    verify,
    baseUrl,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const requireLive = process.argv.includes("--require");
  const r = await runWispCwlPhase14RemoteDemoGate({ skipLive: !requireLive });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase14-remote-demo-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
