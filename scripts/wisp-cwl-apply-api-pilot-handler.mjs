#!/usr/bin/env node
/**
 * Apply captured golden GET /api/tenants body into api-proxy.cwl (Phase 28d).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_API_PILOT_HANDLER_KIND = "chrysalis.wisp.api-pilot-handler";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultGolden = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-tenants-get.golden.json");
const apiProxyPath = join(scriptRoot, "fixtures/hub-wisp-management/api-proxy.cwl");

/**
 * @param {unknown} golden
 */
export function buildTenantsGetHandlerBlock(golden) {
  const body = JSON.stringify(golden);
  const escaped = body.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `@route GET "/api/tenants"
handler wisp_api_tenants_get {
  # source backend-services/routes/tenants — oracle-verified (Phase 28d)
  effects: db, session;
  use auth bearer;
  return "${escaped}";
}`;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.goldenPath]
 */
export function applyWispApiPilotHandler(opts = {}) {
  const goldenPath = resolve(opts.goldenPath ?? defaultGolden);
  if (!existsSync(goldenPath)) {
    return { kind: WISP_API_PILOT_HANDLER_KIND, schemaVersion: 1, ok: false, skip: "missing-golden" };
  }
  if (!existsSync(apiProxyPath)) {
    return { kind: WISP_API_PILOT_HANDLER_KIND, schemaVersion: 1, ok: false, skip: "missing-api-proxy" };
  }
  const golden = JSON.parse(readFileSync(goldenPath, "utf8"));
  const block = buildTenantsGetHandlerBlock(golden);
  let text = readFileSync(apiProxyPath, "utf8");
  const start = text.indexOf('@route GET "/api/tenants"');
  if (start < 0) return { kind: WISP_API_PILOT_HANDLER_KIND, schemaVersion: 1, ok: false, skip: "missing-route" };
  const nextRoute = text.indexOf("@route", start + 1);
  const end = nextRoute > start ? nextRoute : text.length;
  text = `${text.slice(0, start)}${block}\n\n${text.slice(end).trimStart()}`;
  writeFileSync(apiProxyPath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
  return {
    kind: WISP_API_PILOT_HANDLER_KIND,
    schemaVersion: 1,
    ok: true,
    goldenPath,
    apiProxyPath,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = applyWispApiPilotHandler();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-api-pilot-handler")) main();
