#!/usr/bin/env node
/**
 * Verify WISP demo manifest health probes against a live chimera base URL.
 * Usage: node scripts/wisp-cwl-demo-manifest-verify.mjs --base-url http://HOST:PORT [--manifest path]
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WISP_DEMO_MANIFEST_KIND } from "./wisp-cwl-demo-manifest.mjs";
import { isWispNativeCutoverMode, isWispApiProxyHeaderOk } from "./wisp-cwl-post-g7790.mjs";

export const WISP_DEMO_MANIFEST_VERIFY_KIND = "chrysalis.wisp.demo-manifest.verify";
export const WISP_DEMO_MANIFEST_VERIFY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifest = join(scriptRoot, "fixtures/hub-wisp-management/wisp-demo-manifest.v1.json");

/** @param {string} expect @param {Response} res @param {string} text @param {string} proxyHeader */
export function evaluateDemoProbe(expect, res, text, proxyHeader) {
  switch (expect) {
    case "redirect-login":
      return (
        res.status === 200 &&
        proxyHeader === "cwl" &&
        (text.includes('location.replace("/login")') ||
          text.includes("url=/login") ||
          text.includes('href="/login"'))
      );
    case "200-html":
      return (
        res.status === 200 &&
        proxyHeader === "cwl" &&
        (res.headers.get("content-type") ?? "").includes("text/html") &&
        text.length > 20
      );
    case "200-html-any":
      return (
        res.status === 200 &&
        (res.headers.get("content-type") ?? "").includes("text/html") &&
        text.length > 40
      );
    case "svelte-fallback":
      return (
        res.status === 200 &&
        (proxyHeader === "svelte" || proxyHeader === "backend") &&
        (res.headers.get("content-type") ?? "").includes("text/html")
      );
    case "cwl-native-login":
      return (
        res.status === 200 &&
        (proxyHeader === "cwl" || proxyHeader === "") &&
        (res.headers.get("content-type") ?? "").includes("text/html") &&
        text.includes("login-page") &&
        text.includes("wisptools-logo.svg")
      );
    case "cwl-login-post": {
      if (res.status < 200 || res.status >= 300) return false;
      if (!(res.headers.get("content-type") ?? "").includes("application/json")) return false;
      try {
        const j = JSON.parse(text);
        return j.ok === true && (j.surface === "wisp-auth-native" || typeof j.email === "string");
      } catch {
        return false;
      }
    }
    case "cwl-auth-me": {
      if (res.status !== 200) return false;
      if (proxyHeader !== "cwl-native-api" && proxyHeader !== "") return false;
      try {
        const j = JSON.parse(text);
        return j.ok === true && j.authenticated === true && typeof j.email === "string";
      } catch {
        return false;
      }
    }
    case "json-has-items": {
      if (res.status !== 200) return false;
      if (proxyHeader !== "cwl-native-api" && proxyHeader !== "") return false;
      try {
        const j = JSON.parse(text);
        if (j.ok !== true) return false;
        // Reject stub-only surface envelopes.
        if (
          j.surface === "wisp-api-native" &&
          j.resource &&
          j.op &&
          Object.keys(j).length <= 4 &&
          !j.items &&
          !j.customers &&
          !j.tenants &&
          !j.stats
        ) {
          return false;
        }
        const arrays = ["items", "customers", "tenants", "devices", "records", "graphs"];
        if (arrays.some((k) => Array.isArray(j[k]) && j[k].length > 0)) return true;
        if (j.stats && typeof j.stats === "object") return true;
        return false;
      } catch {
        return false;
      }
    }
    case "html-dashboard":
      return (
        res.status === 200 &&
        (res.headers.get("content-type") ?? "").includes("text/html") &&
        text.includes("dashboard-container")
      );
    case "html-has":
      // Marker supplied via probe.htmlIncludes (checked in runner).
      return (
        res.status === 200 &&
        (res.headers.get("content-type") ?? "").includes("text/html") &&
        text.length > 40
      );
    case "api-proxy":
      return isWispApiProxyHeaderOk(proxyHeader, isWispNativeCutoverMode());
    case "cwl-native-api":
      return proxyHeader === "cwl-native-api";
    default:
      return false;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string} [opts.manifestPath]
 */
export async function runWispDemoManifestVerify(opts) {
  const baseUrl = opts.baseUrl.replace(/\/$/, "");
  const manifestPath = resolve(opts.manifestPath ?? defaultManifest);
  const base = {
    kind: WISP_DEMO_MANIFEST_VERIFY_KIND,
    schemaVersion: WISP_DEMO_MANIFEST_VERIFY_SCHEMA_VERSION,
    baseUrl,
    ok: false,
    manifestPath,
  };

  if (!existsSync(manifestPath)) {
    return { ...base, skip: "missing-demo-manifest" };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.kind !== WISP_DEMO_MANIFEST_KIND) {
    return { ...base, skip: "invalid-demo-manifest-kind" };
  }

  /** @type {string | null} */
  let cookieJar = null;
  const probes = [];
  for (const spec of manifest.healthProbes ?? []) {
    const url = `${baseUrl}${spec.path}`;
    const method = (spec.method ?? "GET").toUpperCase();
    try {
      /** @type {Record<string, string>} */
      const headers = {};
      if (cookieJar) headers.cookie = cookieJar;
      if (method !== "GET" && method !== "HEAD") {
        headers["content-type"] = "application/json";
      }
      const res = await fetch(url, {
        method,
        redirect: "manual",
        headers,
        body:
          method === "GET" || method === "HEAD"
            ? undefined
            : JSON.stringify(spec.body ?? { email: "demo@wisptools.io", password: "WisptoolsDemo2026!" }),
      });
      const text = await res.text();
      const proxyHeader = res.headers.get("x-chrysalis-wisp-proxy") ?? "";
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        const first = setCookie.split(";")[0];
        cookieJar = cookieJar ? `${cookieJar}; ${first}` : first;
      }
      let ok = evaluateDemoProbe(spec.expect, res, text, proxyHeader);
      if (ok && spec.expect === "html-has" && typeof spec.htmlIncludes === "string") {
        ok = text.includes(spec.htmlIncludes);
      }
      probes.push({
        path: spec.path,
        method,
        expect: spec.expect,
        chimera: spec.chimera,
        status: res.status,
        proxyHeader,
        ok,
      });
    } catch (e) {
      probes.push({
        path: spec.path,
        method,
        expect: spec.expect,
        ok: false,
        error: String(e),
      });
    }
  }

  const ok = probes.length > 0 && probes.every((p) => p.ok === true);
  return {
    ...base,
    ok,
    probeCount: probes.length,
    probes,
    lastKnownNatIp: manifest.gce?.lastKnownNatIp ?? null,
    backendUrl: manifest.backend?.url ?? null,
  };
}

/** Resolve demo base URL from env or manifest fixture. */
export function resolveWispRemoteDemoBaseUrl(manifestPath = defaultManifest) {
  const fromEnv = process.env.CHRYSALIS_WISP_REMOTE_DEMO_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const ip = manifest.gce?.lastKnownNatIp;
  const port = manifest.gce?.port ?? 19100;
  if (!ip) return null;
  return `http://${ip}:${port}`;
}

/** Validate composite remote-verify detail from wisp-cwl-pipeline deploy step (G6650). */
export function validatePipelineRemoteVerifyDetail(detail) {
  if (!detail || typeof detail !== "object") {
    return { ok: false, skip: "missing-remote-verify-detail" };
  }
  const baseOk = typeof detail.baseUrl === "string" && detail.baseUrl.length > 0;
  const manifest = detail.manifest;
  const poc = detail.poc;
  const manifestOk =
    manifest &&
    manifest.kind === WISP_DEMO_MANIFEST_VERIFY_KIND &&
    typeof manifest.probeCount === "number" &&
    Array.isArray(manifest.probes);
  const pocOk = poc && typeof poc.ok === "boolean";
  const ok = detail.ok === true && baseOk && manifestOk && pocOk && poc.ok === true;
  return {
    ok,
    baseUrl: detail.baseUrl ?? null,
    manifestOk: manifestOk === true,
    pocOk: pocOk === true && poc?.ok === true,
  };
}

function parseArgs(argv) {
  let baseUrl = "";
  let manifestPath = defaultManifest;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base-url" && argv[i + 1]) baseUrl = argv[++i].replace(/\/$/, "");
    else if (a === "--manifest" && argv[i + 1]) manifestPath = argv[++i];
  }
  if (!baseUrl) baseUrl = resolveWispRemoteDemoBaseUrl(manifestPath) ?? "";
  if (!baseUrl) {
    throw new Error(
      "usage: wisp-cwl-demo-manifest-verify.mjs --base-url http://host:port [--manifest path] (or set CHRYSALIS_WISP_REMOTE_DEMO_URL)",
    );
  }
  return { baseUrl, manifestPath: resolve(manifestPath) };
}

async function main() {
  const args = parseArgs(process.argv);
  const r = await runWispDemoManifestVerify(args);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok && !r.skip) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-demo-manifest-verify")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
