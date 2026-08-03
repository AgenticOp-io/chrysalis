#!/usr/bin/env node
/**
 * Replace selected wisp-api-goldens with live HSS (or other) JSON traces (D6442).
 * Only writes on HTTP 200 + parseable JSON. Skips auth failures without wiping files.
 *
 * Usage:
 *   node scripts/lib/live-refresh-api-goldens.mjs [--base-url https://hss.wisptools.io]
 *   node scripts/lib/live-refresh-api-goldens.mjs --paths /api/network/sites,/api/customers
 *   node scripts/lib/live-refresh-api-goldens.mjs --discover
 *   node scripts/lib/live-refresh-api-goldens.mjs --discover --firebase-demo-login
 *   node scripts/lib/live-refresh-api-goldens.mjs --bearer "$TOKEN" --tenant-id "$TID"
 *
 * Env: CHRYSALIS_HSS_BEARER, CHRYSALIS_HSS_TENANT_ID, CHRYSALIS_FIREBASE_API_KEY,
 *      CHRYSALIS_WISP_DEMO_EMAIL, CHRYSALIS_WISP_DEMO_PASSWORD
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { goldenFileName, listApiRouteSpecs } from "./cwl-api-oracle-contract.mjs";
import { applyWispApiGoldenHandlers } from "../wisp-cwl-apply-api-golden-handlers.mjs";
import { wispDemoEmail, wispDemoPassword } from "./wisp-demo-credentials.mjs";

export const LIVE_REFRESH_API_GOLDENS_KIND = "chrysalis.wisp.live-refresh-api-goldens";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const goldensDir = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-goldens");
const reportPath = join(scriptRoot, "reports/wisp/live-refresh-api-goldens.json");
const firebaseCfgPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-firebase-config.json");

/** GETs known to answer without auth on HSS demo (expand via --discover). */
export const DEFAULT_LIVE_REFRESH_PATHS = [
  "/api/network/sites",
  "/api/network/sectors",
  "/api/network/cpe",
  "/api/network/equipment",
  "/api/customers",
  "/api/bundles",
  "/api/inventory",
  "/api/equipment-pricing",
  "/api/incidents",
  "/api/notifications",
  "/api/work-orders",
  "/api/monitoring/graphs/devices",
  "/api/users",
  "/admin/tenants",
  "/admin",
];

/**
 * @param {object} [opts]
 * @param {string} [opts.apiKey]
 * @param {string} [opts.email]
 * @param {string} [opts.password]
 */
export async function firebaseDemoIdToken(opts = {}) {
  let apiKey = opts.apiKey || process.env.CHRYSALIS_FIREBASE_API_KEY || "";
  if (!apiKey && existsSync(firebaseCfgPath)) {
    try {
      apiKey = JSON.parse(readFileSync(firebaseCfgPath, "utf8")).apiKey || "";
    } catch {
      /* ignore */
    }
  }
  const email = opts.email || wispDemoEmail();
  const password = opts.password || wispDemoPassword({ required: false });
  if (!apiKey) return { ok: false, skip: "missing-firebase-api-key" };
  if (!password) return { ok: false, skip: "missing-CHRYSALIS_WISP_DEMO_PASSWORD" };
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  const body = await res.json();
  if (!res.ok || !body.idToken) {
    return {
      ok: false,
      skip: "firebase-login-failed",
      status: res.status,
      detail: body.error?.message || body,
    };
  }
  return { ok: true, idToken: body.idToken, localId: body.localId, email };
}

/**
 * Probe all GET manifest paths; return those that respond 200 + JSON.
 * @param {string} baseUrl
 * @param {Record<string, string>} [headers]
 * @param {number} [timeoutMs]
 */
export async function discoverLiveGetPaths(baseUrl, headers = {}, timeoutMs = 12_000) {
  const specs = listApiRouteSpecs().filter((s) => s.method === "GET");
  /** @type {string[]} */
  const okPaths = [];
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];
  for (const spec of specs) {
    const url = `${baseUrl}${spec.path}`;
    try {
      const probe = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await probe.text();
      let jsonOk = false;
      try {
        JSON.parse(text);
        jsonOk = true;
      } catch {
        /* not json */
      }
      probes.push({ path: spec.path, status: probe.status, bytes: text.length, jsonOk });
      if (probe.status === 200 && jsonOk) okPaths.push(spec.path);
    } catch (e) {
      probes.push({
        path: spec.path,
        status: "err",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { okPaths, probes };
}

/**
 * @param {object} [opts]
 * @param {string} [opts.baseUrl]
 * @param {string[]} [opts.paths]
 * @param {boolean} [opts.discover]
 * @param {string} [opts.bearer]
 * @param {string} [opts.tenantId]
 * @param {boolean} [opts.firebaseDemoLogin]
 * @param {boolean} [opts.applyHandlers]
 */
export async function liveRefreshWispApiGoldens(opts = {}) {
  const baseUrl = (opts.baseUrl ?? "https://hss.wisptools.io").replace(/\/$/, "");
  /** @type {Record<string, unknown> | null} */
  let discoverMeta = null;
  /** @type {Record<string, unknown> | null} */
  let authMeta = null;
  let paths = opts.paths?.length ? opts.paths : DEFAULT_LIVE_REFRESH_PATHS;

  let bearer = (opts.bearer || process.env.CHRYSALIS_HSS_BEARER || "").trim();
  let tenantId =
    (opts.tenantId || process.env.CHRYSALIS_HSS_TENANT_ID || "").trim() ||
    "6a166eb07089304417ec967a";
  if (opts.firebaseDemoLogin === true && !bearer) {
    const login = await firebaseDemoIdToken();
    authMeta = { firebaseDemoLogin: login.ok === true, skip: login.skip, email: login.email };
    if (login.ok && login.idToken) bearer = login.idToken;
  }

  /** @type {Record<string, string>} */
  const headers = { Accept: "application/json" };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (tenantId) headers["X-Tenant-ID"] = tenantId;

  if (opts.discover === true) {
    const d = await discoverLiveGetPaths(baseUrl, headers);
    paths = d.okPaths;
    discoverMeta = { probed: d.probes.length, ok200: d.okPaths.length, probes: d.probes };
  }
  mkdirSync(goldensDir, { recursive: true });
  mkdirSync(dirname(reportPath), { recursive: true });

  /** @type {Array<Record<string, unknown>>} */
  const results = [];
  let written = 0;

  for (const path of paths) {
    const name = goldenFileName("GET", path);
    const url = `${baseUrl}${path}`;
    try {
      const probe = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(20_000),
      });
      const text = await probe.text();
      if (probe.status !== 200) {
        results.push({ path, status: probe.status, action: "skip-non-200", url });
        continue;
      }
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        results.push({ path, status: probe.status, action: "skip-not-json", url });
        continue;
      }
      writeFileSync(join(goldensDir, name), `${JSON.stringify(body, null, 2)}\n`, "utf8");
      written += 1;
      results.push({
        path,
        status: probe.status,
        action: "wrote",
        golden: `wisp-api-goldens/${name}`,
        bytes: Buffer.byteLength(text, "utf8"),
        source: bearer ? "live-hss-bearer" : "live-hss",
        capturedAt: new Date().toISOString(),
      });
    } catch (e) {
      results.push({
        path,
        action: "skip-error",
        error: e instanceof Error ? e.message : String(e),
        url,
      });
    }
  }

  let applied = null;
  if (opts.applyHandlers !== false && written > 0) {
    applied = applyWispApiGoldenHandlers({ includeTenantsPilot: false });
  }

  const report = {
    kind: LIVE_REFRESH_API_GOLDENS_KIND,
    schemaVersion: 1,
    ok: written > 0,
    baseUrl,
    written,
    attempted: paths.length,
    auth: authMeta || (bearer ? { bearer: true, tenantId } : { bearer: false }),
    discover: discoverMeta,
    results,
    applied,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

async function main() {
  let baseUrl = "https://hss.wisptools.io";
  /** @type {string[]} */
  let paths = [];
  let discover = false;
  let firebaseDemoLogin = false;
  let bearer = "";
  let tenantId = "";
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--base-url" && process.argv[i + 1]) baseUrl = process.argv[++i];
    else if (a === "--discover") discover = true;
    else if (a === "--firebase-demo-login") firebaseDemoLogin = true;
    else if (a === "--bearer" && process.argv[i + 1]) bearer = process.argv[++i];
    else if (a === "--tenant-id" && process.argv[i + 1]) tenantId = process.argv[++i];
    else if (a === "--paths" && process.argv[i + 1]) {
      paths = process.argv[++i]
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    }
  }
  const r = await liveRefreshWispApiGoldens({
    baseUrl,
    paths: paths.length ? paths : undefined,
    discover,
    firebaseDemoLogin,
    bearer: bearer || undefined,
    tenantId: tenantId || undefined,
  });
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

if (process.argv[1]?.includes("live-refresh-api-goldens")) main();
