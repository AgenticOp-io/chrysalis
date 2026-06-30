#!/usr/bin/env node
/**
 * Build or refresh WISP Phase 14 demo manifest from pipeline config.
 * Usage: node scripts/wisp-cwl-demo-manifest.mjs [--out path] [--nat-ip IP]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWispPipelineConfig } from "./wisp-cwl-pipeline.mjs";
import { WISP_CLIENT_REDIRECT_ROUTES } from "./wisp-cwl-apply-client-redirects.mjs";
import { isWispNativeCutoverMode } from "./wisp-cwl-post-g7790.mjs";

export const WISP_DEMO_MANIFEST_KIND = "chrysalis.wisp.demo-manifest";
export const WISP_DEMO_MANIFEST_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultOut = join(scriptRoot, "fixtures/hub-wisp-management/wisp-demo-manifest.v1.json");

/** @param {object} [opts] */
export function buildWispDemoManifest(opts = {}) {
  const config = loadWispPipelineConfig();
  const gce = config.gce ?? {};
  const firebase = config.firebase ?? {};
  const outPath = resolve(opts.outPath ?? defaultOut);
  const prior = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};
  const natIp =
    opts.natIp ??
    process.env.CHRYSALIS_WISP_GCE_NAT_IP ??
    prior.gce?.lastKnownNatIp ??
    null;

  const nativeMode = isWispNativeCutoverMode();
  const manifest = {
    kind: WISP_DEMO_MANIFEST_KIND,
    schemaVersion: WISP_DEMO_MANIFEST_SCHEMA_VERSION,
    operator: nativeMode ? "wisp-cwl-native-gce" : "phase14-hss",
    gce: {
      project: gce.project ?? prior.gce?.project,
      zone: gce.zone ?? prior.gce?.zone,
      instance: gce.instance ?? prior.gce?.instance,
      port: gce.port ?? 19100,
      baseUrlPattern: "http://{natIp}:19100",
      ...(natIp ? { lastKnownNatIp: natIp } : prior.gce?.lastKnownNatIp ? { lastKnownNatIp: prior.gce.lastKnownNatIp } : {}),
    },
    backend: {
      url: gce.backendUrl ?? prior.backend?.url ?? "https://hss.wisptools.io",
      policy: nativeMode
        ? "native-cwl-handlers — api-proxy.cwl on chimera (runtime-cwl-native)"
        : "proxy-only — Mongo/backend-services unchanged on acs-hss-server",
    },
    firebase: {
      hostingTarget: firebase.hostingTarget ?? prior.firebase?.hostingTarget,
      optional: true,
    },
    healthProbes: nativeMode
      ? [
          { path: "/", expect: "redirect-login", chimera: "cwl" },
          { path: "/docs", expect: "200-html", chimera: "cwl" },
          { path: "/login", expect: "cwl-native-login", chimera: "cwl" },
          { path: "/api/tenants", expect: "cwl-native-api", chimera: "cwl-native-api" },
          { path: "/api/hss", expect: "cwl-native-api", chimera: "cwl-native-api" },
          { path: "/api/monitoring", expect: "cwl-native-api", chimera: "cwl-native-api" },
        ]
      : [
          { path: "/", expect: "redirect-login", chimera: "cwl" },
          { path: "/docs", expect: "200-html", chimera: "cwl" },
          { path: "/login", expect: "svelte-fallback", chimera: "svelte-or-backend" },
          { path: "/api/tenants", expect: "api-proxy", chimera: "backend" },
          { path: "/api/hss", expect: "api-proxy", chimera: "backend" },
          { path: "/api/monitoring", expect: "api-proxy", chimera: "backend" },
        ],
    clientRedirectPaths: WISP_CLIENT_REDIRECT_ROUTES.map((r) => r.path),
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ok: true, manifest, outPath };
}

function parseArgs(argv) {
  let outPath = defaultOut;
  let natIp = "";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) outPath = argv[++i];
    else if (argv[i] === "--nat-ip" && argv[i + 1]) natIp = argv[++i];
  }
  return { outPath, natIp: natIp || undefined };
}

async function main() {
  const args = parseArgs(process.argv);
  const r = buildWispDemoManifest(args);
  console.log(JSON.stringify(r, null, 2));
}

if (process.argv[1]?.includes("wisp-cwl-demo-manifest")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
