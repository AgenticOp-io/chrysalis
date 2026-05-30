#!/usr/bin/env node
/**
 * Site intelligence scan: languages, DB hints, route estimate, risk (G142).
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { detectLanguagesFromFileList } from "../chrysalis-hub-store.mjs";
import { discoverContractArtifacts } from "./discover-contract-artifacts.mjs";
import { buildDatabaseDetectionReport } from "./hub-detect-databases.mjs";
import { resolveCwlModuleFromPath } from "./cwl-module-graph.mjs";

export const HUB_SITE_INTELLIGENCE_KIND = "chrysalis.hub.site-intelligence";
export const HUB_SITE_INTELLIGENCE_SCHEMA_VERSION = 1;

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "vendor",
  "generated",
  "dist",
  "build",
  ".next",
  ".chrysalis",
]);

const HUB_ORIGIN_LANGS = new Set([
  "php",
  "javascript",
  "typescript",
  "python",
  "java",
  "kotlin",
  "go",
  "ruby",
  "csharp",
  "rust",
  "swift",
  "scala",
  "vue",
  "c",
  "cpp",
]);

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SERVICE_SCAN_FILES = [
  ".env",
  ".env.example",
  ".env.local",
  "docker-compose.yml",
  "docker-compose.yaml",
  "config/database.php",
];

/**
 * @param {string} root
 */
async function scanProjectTree(root) {
  const paths = [];
  async function walk(dir, depth) {
    if (depth > 12 || paths.length >= 8000) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (SKIP_DIRS.has(ent.name)) continue;
      const p = join(dir, ent.name);
      if (ent.isDirectory()) await walk(p, depth + 1);
      else if (ent.isFile()) {
        paths.push(p);
        if (paths.length >= 8000) return;
      }
    }
  }
  await walk(root, 0);
  return {
    scannedAt: new Date().toISOString(),
    source: "local-intelligence",
    pathCount: paths.length,
    languages: detectLanguagesFromFileList(paths),
    truncated: paths.length >= 8000,
  };
}

/**
 * @param {object} input
 */
function inferPrimaryOrigin(input) {
  const { scan, frameworkHints } = input;
  if (frameworkHints.includes("plain-php-manifest") || frameworkHints.includes("laravel")) return "php";
  if (frameworkHints.includes("symfony") || frameworkHints.includes("symfony-routes-yaml")) return "php";
  if (frameworkHints.includes("express")) return "javascript";
  if (frameworkHints.includes("fastify")) return "javascript";
  if (frameworkHints.includes("nextjs")) return "javascript";

  const hubLanguages = (scan.languages ?? []).filter((l) => HUB_ORIGIN_LANGS.has(l.language));
  const codeLangs = hubLanguages.filter((l) => !["json", "yaml", "markdown", "css", "scss", "html", "cwl"].includes(l.language));
  return codeLangs[0]?.language ?? hubLanguages[0]?.language ?? scan.languages?.[0]?.language ?? null;
}

/**
 * @param {string} root
 */
async function collectServiceHints(root) {
  /** @type {Record<string, string>} */
  const services = {};
  for (const rel of SERVICE_SCAN_FILES) {
    const path = join(root, rel);
    try {
      const st = await stat(path);
      if (!st.isFile() || st.size > 65536) continue;
      const text = await readFile(path, "utf8");
      if (text.trim()) services[rel.replace(/[^\w]+/g, "_")] = text.slice(0, 4096);
    } catch {
      /* missing */
    }
  }
  return services;
}

/**
 * @param {string} root
 */
async function detectFrameworkHints(root) {
  /** @type {string[]} */
  const hints = [];
  const composerPath = join(root, "composer.json");
  const packagePath = join(root, "package.json");
  const symfonyRoutes = join(root, "config", "routes.yaml");

  if (existsSync(composerPath)) {
    try {
      const composer = JSON.parse(readFileSync(composerPath, "utf8"));
      const req = { ...(composer.require ?? {}), ...(composer["require-dev"] ?? {}) };
      if (req["laravel/framework"]) hints.push("laravel");
      if (req["symfony/framework-bundle"] || req["symfony/routing"]) hints.push("symfony");
    } catch {
      /* skip */
    }
  }
  if (existsSync(symfonyRoutes)) hints.push("symfony-routes-yaml");
  if (existsSync(join(root, "pages")) && existsSync(join(root, "chrysalis.routes.json"))) {
    hints.push("plain-php-manifest");
  }
  if (existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      if (deps.express) hints.push("express");
      if (deps.fastify) hints.push("fastify");
      if (deps.next) hints.push("nextjs");
    } catch {
      /* skip */
    }
  }
  return [...new Set(hints)];
}

/**
 * @param {Array<{ method?: string }> | undefined} routes
 */
function summarizeWriteRoutes(routes) {
  if (!Array.isArray(routes)) return { writeCount: 0, total: 0 };
  let writeCount = 0;
  for (const r of routes) {
    const m = String(r.method ?? "GET").toUpperCase();
    if (WRITE_METHODS.has(m)) writeCount += 1;
  }
  return { writeCount, total: routes.length };
}

/**
 * @param {string} root
 */
function estimateRoutesFromManifest(root) {
  const routesManifest = join(root, "chrysalis.routes.json");
  if (existsSync(routesManifest)) {
    try {
      const j = JSON.parse(readFileSync(routesManifest, "utf8"));
      const routes = Array.isArray(j.routes) ? j.routes : [];
      const writes = summarizeWriteRoutes(routes);
      return {
        count: routes.length,
        source: "chrysalis.routes.json",
        confidence: "high",
        writeCount: writes.writeCount,
      };
    } catch {
      /* fall through */
    }
  }

  const migrationCwl = join(root, ".chrysalis", "migration.cwl");
  if (existsSync(migrationCwl)) {
    try {
      const mod = resolveCwlModuleFromPath(migrationCwl);
      const routes = Array.isArray(mod.routes) ? mod.routes : [];
      let writeCount = 0;
      for (const r of routes) {
        const m = String(r.method ?? "GET").toUpperCase();
        if (WRITE_METHODS.has(m)) writeCount += 1;
      }
      return {
        count: routes.length,
        source: "migration.cwl",
        confidence: "high",
        writeCount,
      };
    } catch {
      /* fall through */
    }
  }

  return { count: null, source: "unknown", confidence: "low", writeCount: null };
}

/**
 * @param {string} root
 */
async function estimateRoutesFromWebir(root) {
  const chDir = join(root, ".chrysalis");
  if (!existsSync(chDir)) return null;
  let entries;
  try {
    entries = await readdir(chDir);
  } catch {
    return null;
  }
  for (const name of entries) {
    const m = /^hub\.([^.]+)\.webir\.json$/.exec(name);
    if (!m) continue;
    try {
      const raw = JSON.parse(readFileSync(join(chDir, name), "utf8"));
      const routes = raw.routes ?? raw.webRoutes ?? raw.module?.routes;
      if (Array.isArray(routes)) {
        const writes = summarizeWriteRoutes(routes);
        return {
          count: routes.length,
          source: name,
          confidence: "medium",
          writeCount: writes.writeCount,
        };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * @param {string} root
 */
async function estimateRouteCount(root) {
  const manifest = estimateRoutesFromManifest(root);
  if (manifest.count !== null) return manifest;
  const webir = await estimateRoutesFromWebir(root);
  if (webir) return webir;

  let pageCount = 0;
  async function walk(dir, depth) {
    if (depth > 8 || pageCount >= 200) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (SKIP_DIRS.has(ent.name)) continue;
      const p = join(dir, ent.name);
      if (ent.isDirectory()) await walk(p, depth + 1);
      else if (ent.isFile()) {
        const base = ent.name.toLowerCase();
        if (base.endsWith("controller.php") || (dir.endsWith("pages") && base.endsWith(".php"))) {
          pageCount += 1;
        }
      }
    }
  }
  await walk(root, 0);
  if (pageCount > 0) {
    return {
      count: pageCount,
      source: "heuristic-handler-files",
      confidence: "low",
      writeCount: null,
    };
  }
  return { count: null, source: "unknown", confidence: "low", writeCount: null };
}

/**
 * @param {object} input
 */
function computeSiteRisk(input) {
  /** @type {Array<{ factor: string, weight: number, detail?: string }>} */
  const factors = [];
  let score = 0;

  if (input.routeEstimate.confidence === "low" || input.routeEstimate.count === null) {
    score += 15;
    factors.push({ factor: "unknown-route-surface", weight: 15 });
  }
  if (!input.contracts.openapi && !input.contracts.har && input.contracts.openapis.length === 0) {
    score += 10;
    factors.push({ factor: "no-external-contract", weight: 10 });
  }
  if (input.primaryOrigin && !HUB_ORIGIN_LANGS.has(input.primaryOrigin)) {
    score += 20;
    factors.push({ factor: "non-oracle-origin", weight: 20, detail: input.primaryOrigin });
  }
  if (input.languageCount >= 4) {
    score += 10;
    factors.push({ factor: "polyglot-tree", weight: 10, detail: `${input.languageCount} languages` });
  }
  if (input.routeEstimate.writeCount !== null && input.routeEstimate.count !== null) {
    const ratio = input.routeEstimate.writeCount / Math.max(1, input.routeEstimate.count);
    if (ratio >= 0.35) {
      score += 15;
      factors.push({ factor: "write-heavy-surface", weight: 15 });
    }
  }
  if (input.databases.detectedIds.includes("redis") || input.databases.detectedIds.includes("memcached")) {
    score += 5;
    factors.push({ factor: "session-cache-store", weight: 5 });
  }
  if (input.scan.truncated) {
    score += 5;
    factors.push({ factor: "scan-truncated", weight: 5 });
  }
  if (input.frameworkHints.includes("auth-slice-candidate")) {
    score += 10;
    factors.push({ factor: "auth-routes-detected", weight: 10 });
  }

  const bounded = Math.min(100, score);
  return {
    score: bounded,
    level: bounded >= 60 ? "high" : bounded >= 30 ? "medium" : "low",
    factors,
  };
}

/**
 * @param {string} projectDir
 * @param {{ detection?: object }} [opts]
 */
export async function buildSiteIntelligenceReport(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const scan = opts.detection ?? (await scanProjectTree(root));
  const services = await collectServiceHints(root);
  const databases = buildDatabaseDetectionReport(services);
  const contracts = await discoverContractArtifacts(root);
  const frameworkHints = await detectFrameworkHints(root);
  const routeEstimate = await estimateRouteCount(root);
  const primaryOrigin = inferPrimaryOrigin({ scan, frameworkHints });

  const authRouteRes = [
    /^\/login$/,
    /^\/logout$/,
    /^\/session(\/|$)/,
    /^\/me(\/|$)/,
    /^\/auth(\/|$)/,
  ];
  let authSliceCandidate = false;
  if (existsSync(join(root, "chrysalis.routes.json"))) {
    try {
      const routes = JSON.parse(readFileSync(join(root, "chrysalis.routes.json"), "utf8")).routes ?? [];
      authSliceCandidate = routes.some((r) =>
        authRouteRes.some((re) => re.test(String(r.path ?? ""))),
      );
    } catch {
      /* skip */
    }
  }
  if (authSliceCandidate) frameworkHints.push("auth-slice-candidate");

  const risk = computeSiteRisk({
    scan,
    routeEstimate,
    contracts,
    primaryOrigin,
    languageCount: scan.languages?.length ?? 0,
    databases,
    frameworkHints,
  });

  return {
    kind: HUB_SITE_INTELLIGENCE_KIND,
    schemaVersion: HUB_SITE_INTELLIGENCE_SCHEMA_VERSION,
    projectDir: root,
    scan: {
      scannedAt: scan.scannedAt,
      source: scan.source,
      pathCount: scan.pathCount,
      truncated: Boolean(scan.truncated),
    },
    languages: scan.languages ?? [],
    primaryOrigin,
    frameworkHints,
    services,
    databases: {
      detectedIds: databases.detectedIds,
      detected: databases.detected,
    },
    contracts: {
      openapi: contracts.openapi,
      har: contracts.har,
      openapis: contracts.openapis,
      hars: contracts.hars,
    },
    routeEstimate,
    risk,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {string} projectDir
 * @param {ReturnType<typeof buildSiteIntelligenceReport> extends Promise<infer T> ? T : never} [report]
 */
export async function writeSiteIntelligenceArtifacts(projectDir, report) {
  const root = resolve(projectDir);
  const payload = report ?? (await buildSiteIntelligenceReport(root));
  const outDir = join(root, ".chrysalis");
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "site-intelligence.json");
  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { jsonPath, report: payload };
}

function parseArgs(argv) {
  let projectDir = null;
  let jsonOut = null;
  let writeArtifacts = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--write-artifacts") writeArtifacts = true;
  }
  if (!projectDir) {
    throw new Error("usage: hub-site-intelligence.mjs --project <dir> [--json-out path] [--write-artifacts]");
  }
  return { projectDir, jsonOut, writeArtifacts };
}

async function main() {
  const { projectDir, jsonOut, writeArtifacts } = parseArgs(process.argv);
  const report = await buildSiteIntelligenceReport(projectDir);
  if (writeArtifacts) {
    await writeSiteIntelligenceArtifacts(projectDir, report);
  }
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
