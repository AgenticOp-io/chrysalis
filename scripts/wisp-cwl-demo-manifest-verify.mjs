#!/usr/bin/env node
/**
 * Verify WISP demo manifest health probes against a live chimera base URL.
 * Usage: node scripts/wisp-cwl-demo-manifest-verify.mjs --base-url http://HOST:PORT [--manifest path]
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WISP_DEMO_MANIFEST_KIND } from "./wisp-cwl-demo-manifest.mjs";

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
    case "svelte-fallback":
      return (
        res.status === 200 &&
        (proxyHeader === "svelte" || proxyHeader === "backend") &&
        (res.headers.get("content-type") ?? "").includes("text/html")
      );
    case "api-proxy":
      return proxyHeader === "backend";
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

  const probes = [];
  for (const spec of manifest.healthProbes ?? []) {
    const url = `${baseUrl}${spec.path}`;
    try {
      const res = await fetch(url, { redirect: "manual" });
      const text = await res.text();
      const proxyHeader = res.headers.get("x-chrysalis-wisp-proxy") ?? "";
      const ok = evaluateDemoProbe(spec.expect, res, text, proxyHeader);
      probes.push({
        path: spec.path,
        expect: spec.expect,
        chimera: spec.chimera,
        status: res.status,
        proxyHeader,
        ok,
      });
    } catch (e) {
      probes.push({
        path: spec.path,
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
