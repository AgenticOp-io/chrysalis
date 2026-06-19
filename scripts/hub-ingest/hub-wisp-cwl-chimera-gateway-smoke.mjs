#!/usr/bin/env node
/** WISP chimera gateway smoke — CWL /docs + /api proxy path (backend may be down). */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createWispChimeraGateway } from "../wisp-cwl-chimera-gateway.mjs";
import { generateWispApiProxyCwl } from "../wisp-cwl-generate-api-proxy-cwl.mjs";
import { applyWispPhase13Surfaces } from "../wisp-cwl-apply-phase13-surfaces.mjs";

export const WISP_CHIMERA_GATEWAY_SMOKE_KIND = "chrysalis.wisp.chimera-gateway-smoke";
export const WISP_CHIMERA_GATEWAY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
const wispRoot =
  process.env.CHRYSALIS_WISP_ROOT ?? "C:/Users/david/Downloads/WISPTools/Module_Manager";

export async function runWispChimeraGatewaySmoke() {
  const base = {
    kind: WISP_CHIMERA_GATEWAY_SMOKE_KIND,
    schemaVersion: WISP_CHIMERA_GATEWAY_SMOKE_SCHEMA_VERSION,
    ok: false,
  };

  generateWispApiProxyCwl();

  const wispRoutes = join(wispRoot, "generated/cwl/routes.cwl");
  const fixtureRoutes = join(fixtureDir, "routes.cwl");
  if (existsSync(wispRoutes)) {
    mkdirSync(fixtureDir, { recursive: true });
    copyFileSync(wispRoutes, fixtureRoutes);
    applyWispPhase13Surfaces();
  }
  if (!existsSync(fixtureRoutes)) {
    return { ...base, skip: "missing-routes-cwl", hint: "lift WISP Module_Manager or set CHRYSALIS_WISP_ROOT" };
  }

  const runtimeDist = join(scriptRoot, "packages/runtime-cwl/dist/index.js");
  if (!existsSync(runtimeDist)) {
    const pnpmCmd = process.platform === "win32" ? "pnpm" : "pnpm";
    const build = spawnSync(pnpmCmd, ["--filter", "@chrysalis/runtime-cwl", "build"], {
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
      cwlPath: fixtureRoutes,
      backendUrl: "http://127.0.0.1:9",
      host: "127.0.0.1",
      port: 0,
    });
    const addr = gw.server.address();
    const port = typeof addr === "object" && addr ? addr.port : gw.port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const docs = await fetch(`${baseUrl}/docs`);
    const docsOk = docs.status === 200 && (await docs.text()).includes("WISP Management");

    const root = await fetch(`${baseUrl}/`);
    const rootText = await root.text();
    const rootRedirectOk =
      root.status === 200 &&
      rootText.includes("location.replace") &&
      rootText.includes("/login") &&
      !rootText.includes('<div class="loading-page">');

    const api = await fetch(`${baseUrl}/api/tenants`);
    const apiProxied = api.headers.get("x-chrysalis-wisp-proxy") === "backend";
    const favicon = await fetch(`${baseUrl}/favicon.ico`);
    const faviconOk = favicon.status === 200 && favicon.headers.get("x-chrysalis-wisp-proxy") === "static";
    const ok = docsOk && rootRedirectOk && apiProxied && faviconOk;
    return {
      ...base,
      ok,
      docsStatus: docs.status,
      docsOk,
      rootStatus: root.status,
      rootRedirectOk,
      apiProxied,
      apiStatus: api.status,
      faviconStatus: favicon.status,
      faviconOk,
    };
  } finally {
    if (gw) await gw.stop();
  }
}

async function main() {
  const r = await runWispChimeraGatewaySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok && !r.skip) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-chimera-gateway-smoke")) main().catch((e) => { console.error(e); process.exit(1); });
