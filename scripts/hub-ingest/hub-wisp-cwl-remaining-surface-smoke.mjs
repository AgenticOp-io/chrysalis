#!/usr/bin/env node
/**
 * G9932–G9939 — remaining empty-page structural hydrate (voice/plan/bundles/
 * permissions/roles/cbrs/support) after D6416 pause lifted (D6424).
 *
 * Run: pnpm run hub:wisp-cwl-remaining-surface-smoke
 * Skip live: CHRYSALIS_SKIP_LIVE=1
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_CWL_REMAINING_SURFACE_SMOKE_KIND =
  "chrysalis.wisp.cwl-remaining-surface-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_BASE = "http://34.61.255.147:19100";

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

export async function runWispCwlRemainingSurfaceSmoke(opts = {}) {
  const clientPath = join(ROOT, "fixtures/hub-wisp-management/wisp-cwl-client.js");
  const routesPath = join(ROOT, "fixtures/hub-wisp-management/routes.cwl");
  const inferPath = join(ROOT, "packages/ingest/src/infer-ui-page-api-path.ts");
  const client = existsSync(clientPath) ? readFileSync(clientPath, "utf8") : "";
  const routes = existsSync(routesPath) ? readFileSync(routesPath, "utf8") : "";
  const infer = existsSync(inferPath) ? readFileSync(inferPath, "utf8") : "";

  const g9932 =
    client.includes(".voice-page") &&
    client.includes("/api/voice") &&
    client.includes('page: "voice"') &&
    routes.includes('path: "/modules/voice-telephony", apiPath: "/api/voice"');

  const g9933 =
    client.includes(".wisp-plan-app") &&
    client.includes("fillPlanCounts") &&
    client.includes("/api/plans") &&
    routes.includes('apiPath: "/api/plans"');

  const g9934 =
    client.includes(".bundles-page") &&
    client.includes("/api/bundles") &&
    client.includes("/modules/inventory/bundles") &&
    routes.includes('path: "/modules/inventory/bundles", apiPath: "/api/bundles"') &&
    infer.includes('["/modules/inventory/bundles", "/api/bundles"]');

  const g9935 =
    client.includes(".permissions-page") &&
    routes.includes(
      'path: "/modules/user-management/permissions", apiPath: "/api/permissions"',
    ) &&
    infer.includes('["/modules/user-management/permissions", "/api/permissions"]');

  const g9936 =
    client.includes(".role-management-page") &&
    routes.includes(
      'path: "/modules/user-management/roles", apiPath: "/api/permissions"',
    ) &&
    !client.includes('sel: ".role-management-page", page: "roles", api: "/api/users"');

  const g9937 =
    client.includes(".cbrs-module") &&
    client.includes('page: "cbrs"') &&
    routes.includes('path: "/modules/cbrs-management", apiPath: "/api/network"');

  const g9938 =
    client.includes(".support-dashboard") &&
    client.includes("/support-dashboard") &&
    routes.includes('path: "/support-dashboard", apiPath: "/api/maintain"');

  const g9939empty =
    client.includes("data-cwl-empty-honest") &&
    client.includes("No ") &&
    existsSync(join(ROOT, "fixtures/hub-wisp-management/hydrate-samples/api-bundles.json")) &&
    existsSync(
      join(ROOT, "fixtures/hub-wisp-management/hydrate-samples/api-permissions.json"),
    );

  let live = { skipped: true };
  if (process.env.CHRYSALIS_SKIP_LIVE !== "1") {
    const base = (opts.baseUrl || process.env.CHRYSALIS_WISP_DEMO_URL || DEFAULT_BASE).replace(
      /\/$/,
      "",
    );
    const apis = {};
    for (const path of [
      "/api/voice",
      "/api/plans",
      "/api/bundles",
      "/api/permissions",
      "/api/network",
      "/api/maintain",
    ]) {
      const r = await fetchText(`${base}${path}`);
      let parseOk = false;
      let body = null;
      try {
        body = JSON.parse(r.text);
        parseOk = true;
      } catch {
        parseOk = false;
      }
      const proxy = r.headers.get("x-chrysalis-wisp-proxy");
      apis[path] = {
        status: r.status,
        proxy,
        parseOk,
        ok: r.status === 200 && parseOk && proxy === "cwl-native-api",
        hasRows:
          body &&
          (Array.isArray(body.items) ||
            Array.isArray(body.lines) ||
            Array.isArray(body.plans) ||
            Array.isArray(body.tickets) ||
            Array.isArray(body.sites) ||
            body.ok === true),
      };
    }
    live = {
      skipped: false,
      baseUrl: base,
      apis,
      ok: Object.values(apis).every((a) => a.ok),
    };
  }

  const ok =
    g9932 &&
    g9933 &&
    g9934 &&
    g9935 &&
    g9936 &&
    g9937 &&
    g9938 &&
    g9939empty &&
    (live.skipped || live.ok);

  return {
    kind: WISP_CWL_REMAINING_SURFACE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    g9932,
    g9933,
    g9934,
    g9935,
    g9936,
    g9937,
    g9938,
    g9939empty,
    live,
    note:
      "Remaining WISP empty-page hydrate: voice/plan/bundles/permissions/roles/cbrs/support; empty API honesty; no invented FCAPS/maps/GenieACS",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlRemainingSurfaceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-remaining-surface-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
