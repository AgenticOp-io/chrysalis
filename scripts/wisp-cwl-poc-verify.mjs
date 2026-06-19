#!/usr/bin/env node
/**
 * HTTP veracity probe for WISP Module_Manager CWL POC (hole-free @page routes + honest 501 holes).
 * Usage: node scripts/wisp-cwl-poc-verify.mjs --base-url http://HOST:PORT [--preview path/to/cwl-preview.json]
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_CWL_POC_VERIFY_KIND = "chrysalis.wisp-cwl-poc.verify";
export const WISP_CWL_POC_VERIFY_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @param {string[]} argv */
function parseArgs(argv) {
  let baseUrl = "";
  let previewPath = "";
  let chimera = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base-url" && argv[i + 1]) baseUrl = argv[++i].replace(/\/$/, "");
    else if (a === "--preview" && argv[i + 1]) previewPath = argv[++i];
    else if (a === "--chimera") chimera = true;
  }
  if (!baseUrl) throw new Error("usage: wisp-cwl-poc-verify.mjs --base-url http://host:port [--preview cwl-preview.json]");
  return { baseUrl, previewPath: previewPath ? resolve(previewPath) : null, chimera };
}

/**
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string | null} [opts.previewPath]
 */
export async function runWispCwlPocVerify(opts) {
  const baseUrl = opts.baseUrl.replace(/\/$/, "");
  const previewPath =
    opts.previewPath ??
    join(scriptRoot, "generated/_wisp-cwl-poc-deploy/cwl-preview.json");

  const base = {
    kind: WISP_CWL_POC_VERIFY_KIND,
    schemaVersion: WISP_CWL_POC_VERIFY_SCHEMA_VERSION,
    baseUrl,
    ok: false,
  };

  if (!existsSync(previewPath)) {
    return { ...base, skip: "missing-cwl-preview", previewPath };
  }

  const preview = JSON.parse(readFileSync(previewPath, "utf8"));
  const routes = preview.routes ?? [];
  const holeFree = routes.filter((r) => r.hole === false);
  const holed = routes.filter((r) => r.hole === true);

  const probes = [];
  for (const r of holeFree.slice(0, 12)) {
    const url = `${baseUrl}${r.path}`;
    try {
      const res = await fetch(url, { redirect: "manual" });
      const text = await res.text();
      probes.push({
        path: r.path,
        expected: "200-html",
        status: res.status,
        ok: res.status === 200 && text.length > 20,
        contentType: res.headers.get("content-type") ?? "",
      });
    } catch (e) {
      probes.push({ path: r.path, expected: "200-html", ok: false, error: String(e) });
    }
  }

  const holeSamples = ["/login", "/dashboard"].filter((p) => holed.some((r) => r.path === p));
  for (const path of holeSamples) {
    const url = `${baseUrl}${path}`;
    try {
      const res = await fetch(url, { redirect: "manual" });
      probes.push({
        path,
        expected: "501-hole",
        status: res.status,
        ok: res.status === 501,
      });
    } catch (e) {
      probes.push({ path, expected: "501-hole", ok: false, error: String(e) });
    }
  }

  if (opts.chimera) {
    try {
      const api = await fetch(`${baseUrl}/api/tenants`, { redirect: "manual" });
      probes.push({
        path: "/api/tenants",
        expected: "api-proxy",
        status: api.status,
        proxyHeader: api.headers.get("x-chrysalis-wisp-proxy") ?? "",
        ok: api.headers.get("x-chrysalis-wisp-proxy") === "backend",
      });
    } catch (e) {
      probes.push({ path: "/api/tenants", expected: "api-proxy", ok: false, error: String(e) });
    }
  }

  const pageOk = probes.filter((p) => p.expected === "200-html").every((p) => p.ok);
  const holeOk = probes.filter((p) => p.expected === "501-hole").every((p) => p.ok);
  const apiOk = opts.chimera
    ? probes.filter((p) => p.expected === "api-proxy").every((p) => p.ok)
    : true;
  const ok = pageOk && holeOk && apiOk && holeFree.length >= 9;

  return {
    ...base,
    ok,
    routeCount: routes.length,
    holeFreeCount: holeFree.length,
    holeCount: holed.length,
    probes,
    pageOk,
    holeOk,
    apiOk,
    chimera: opts.chimera === true,
    previewPath,
  };
}

if (import.meta.url === new URL(process.argv[1], "file:").href || process.argv[1]?.endsWith("wisp-cwl-poc-verify.mjs")) {
  const args = parseArgs(process.argv);
  runWispCwlPocVerify(args).then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  });
}
