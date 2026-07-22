#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const base = (process.argv[2] || "http://34.61.255.147:19100").replace(/\/$/, "");
const routes = readFileSync(join(root, "fixtures/hub-wisp-management/routes.cwl"), "utf8");
const paths = [...routes.matchAll(/@page GET "([^"]+)"/g)].map((match) =>
  match[1].replace(/:tenantId/g, "preview-tenant").replace(/:([A-Za-z0-9_]+)/g, "preview"),
);

const residuePatterns = {
  holes: /data-cwl-hole=/g,
  gotoHandlers: /\bgoto\s*\(/g,
  svelteEvents: /\son:[a-zA-Z][\w:|.-]*=/g,
  controlTokens: /\{[#/:](?:if|each)\b/g,
  malformedSvg:
    /<\/(?:login|dashboard|modules\/[\w/-]+|admin\/[\w/-]+)\s+(?:d|fill|stroke)=/g,
  shellApologies:
    /interactive (?:content|steps) not lifted|live \w+ not lifted|controls not lifted/gi,
};

const pages = [];
const linkedPaths = new Set();
for (const path of paths) {
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { cookie: "chrysalis_session=static-export" },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.text();
    for (const match of body.matchAll(/\b(?:href|data-cwl-nav)="(\/[^"]*)"/g)) {
      const linked = match[1].split(/[?#]/)[0];
      if (
        linked &&
        !linked.startsWith("/assets/") &&
        !linked.startsWith("/api/") &&
        !/[{}]/.test(linked)
      ) {
        linkedPaths.add(linked || "/");
      }
    }
    const residue = Object.fromEntries(
      Object.entries(residuePatterns).map(([name, pattern]) => [
        name,
        (body.match(pattern) || []).length,
      ]),
    );
    pages.push({
      path,
      status: response.status,
      bytes: body.length,
      residue,
      ok:
        response.status >= 200 &&
        response.status < 400 &&
        body.length >= 100 &&
        Object.values(residue).every((count) => count === 0),
    });
  } catch (error) {
    pages.push({ path, status: 0, bytes: 0, ok: false, error: String(error) });
  }
}

const linkResults = [];
for (const path of [...linkedPaths].sort()) {
  try {
    const response = await fetch(`${base}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    linkResults.push({ path, status: response.status, ok: response.status < 400 });
  } catch (error) {
    linkResults.push({ path, status: 0, ok: false, error: String(error) });
  }
}

const apis = [
  "/api/network/sites",
  "/api/inventory",
  "/api/work-orders",
  "/api/customers",
  "/api/plans",
  "/api/monitoring",
  "/api/monitoring/graphs",
  "/api/voice",
  "/api/hss",
  "/api/billing",
  "/api/module-access",
  "/api/tenants",
  "/api/admin",
  "/api/maintain",
  "/api/coverage",
  "/api/branding",
  "/api/auth",
  "/api/agent",
];
const apiResults = [];
for (const path of apis) {
  try {
    const response = await fetch(`${base}${path}`, {
      signal: AbortSignal.timeout(15_000),
    });
    apiResults.push({
      path,
      status: response.status,
      type: response.headers.get("content-type"),
      ok: response.ok,
    });
  } catch (error) {
    apiResults.push({ path, status: 0, ok: false, error: String(error) });
  }
}

const failures = pages.filter((page) => !page.ok);
const linkFailures = linkResults.filter((link) => !link.ok);
const apiFailures = apiResults.filter((api) => !api.ok);
const report = {
  kind: "chrysalis.wisp.live-all-routes-audit",
  schemaVersion: 1,
  ok: failures.length === 0 && linkFailures.length === 0 && apiFailures.length === 0,
  base,
  pageCount: pages.length,
  passingPages: pages.length - failures.length,
  failures,
  linkedRouteCount: linkResults.length,
  linkFailures,
  apiCount: apiResults.length,
  apiFailures,
  generatedAt: new Date().toISOString(),
};
const out = join(root, "reports/wisp/live-all-routes-audit.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
