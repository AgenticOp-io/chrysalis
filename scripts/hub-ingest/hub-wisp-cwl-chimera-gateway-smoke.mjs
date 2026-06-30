#!/usr/bin/env node
/** WISP chimera gateway smoke — CWL /docs + /api proxy path (backend may be down). */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createWispChimeraGateway } from "../wisp-cwl-chimera-gateway.mjs";
import { generateWispApiProxyCwl } from "../wisp-cwl-generate-api-proxy-cwl.mjs";
import { prepareWispCwlDeployBundle } from "../wisp-cwl-pipeline.mjs";
import { isWispFullSiteCwlProgramActive, isWispFullSiteCwlProgramClosed } from "./hub-cwl-fullstack-gates.mjs";

export const WISP_CHIMERA_GATEWAY_SMOKE_KIND = "chrysalis.wisp.chimera-gateway-smoke";
export const WISP_CHIMERA_GATEWAY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runWispChimeraGatewaySmoke() {
  const base = {
    kind: WISP_CHIMERA_GATEWAY_SMOKE_KIND,
    schemaVersion: WISP_CHIMERA_GATEWAY_SMOKE_SCHEMA_VERSION,
    ok: false,
  };

  generateWispApiProxyCwl({
    mode: isWispFullSiteCwlProgramActive() || isWispFullSiteCwlProgramClosed() ? "native" : "proxy",
  });

  const bundle = prepareWispCwlDeployBundle({ skipLift: true });
  if (!bundle.ok) return { ...base, skip: bundle.skip ?? "bundle-failed" };
  const cwlPath = join(bundle.bundleDir, "routes.cwl");
  if (!existsSync(cwlPath)) return { ...base, skip: "missing-bundle-routes-cwl" };

  const runtimeDist = join(scriptRoot, "packages/runtime-cwl/dist/index.js");
  if (!existsSync(runtimeDist)) {
    const build = spawnSync("pnpm", ["--filter", "@chrysalis/runtime-cwl", "build"], {
      cwd: scriptRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (build.status !== 0 || !existsSync(runtimeDist)) {
      return {
        ...base,
        skip: "runtime-cwl-build-failed",
        detail: (build.stderr ?? build.stdout ?? "").slice(0, 300),
      };
    }
  }

  /** @type {Awaited<ReturnType<typeof createWispChimeraGateway>> | null} */
  let gw = null;
  try {
    gw = await createWispChimeraGateway({
      repoRoot: scriptRoot,
      cwlPath,
      backendUrl: "http://127.0.0.1:9",
      host: "127.0.0.1",
      port: 0,
    });
    const addr = gw.server.address();
    const port = typeof addr === "object" && addr ? addr.port : gw.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const docs = await fetch(`${baseUrl}/docs`);
    const docsText = await docs.text();
    const docsOk = docs.status === 200 && docsText.includes("WISP Management") && docsText.includes("wisp-cwl-app.css");

    const root = await fetch(`${baseUrl}/`);
    const rootText = await root.text();
    const rootRedirectOk =
      root.status === 200 &&
      rootText.includes("location.replace") &&
      rootText.includes("/login") &&
      !rootText.includes('<div class="loading-page">');

    const login = await fetch(`${baseUrl}/login`);
    const loginText = await login.text();
    const loginOk =
      login.status === 200 &&
      loginText.includes("Sign in") &&
      loginText.includes("wisp-cwl-client.js") &&
      loginText.includes("login-page");

    const api = await fetch(`${baseUrl}/api/tenants`);
    const nativeApi = gw.nativeApi === true;
    const apiProxied = nativeApi
      ? api.headers.get("x-chrysalis-wisp-proxy") === "cwl-native-api"
      : api.headers.get("x-chrysalis-wisp-proxy") === "backend";
    const favicon = await fetch(`${baseUrl}/favicon.ico`);
    const faviconOk = favicon.status === 200 && favicon.headers.get("x-chrysalis-wisp-proxy") === "static";
    const ok = docsOk && rootRedirectOk && loginOk && apiProxied && faviconOk;
    return {
      ...base,
      ok,
      docsStatus: docs.status,
      docsOk,
      rootStatus: root.status,
      rootRedirectOk,
      loginOk,
      apiProxied,
      apiStatus: api.status,
      faviconStatus: favicon.status,
      faviconOk,
      svelteFallback: gw.svelteFallback,
    };
  } finally {
    if (gw) {
      await new Promise((resolve) => gw.server.close(() => resolve(undefined)));
    }
  }
}

async function main() {
  const r = await runWispChimeraGatewaySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok && !r.skip) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-chimera-gateway-smoke")) main().catch((e) => { console.error(e); process.exit(1); });
