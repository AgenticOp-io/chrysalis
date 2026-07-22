#!/usr/bin/env node
/**
 * Document deepen candidates from in-repo HSS / backend-services sources (D6442).
 * Live probe verifies deploy parity; it must not invent request bodies —
 * contract authority is backend-services (+ Module_Manager service clients).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDeepenCandidates, loadCatalog, scriptRoot } from "./wisp-fidelity-deepen-harness.mjs";
import { extractExpressApiMounts } from "../lib/sync-api-paths-from-backend.mjs";

export const SOURCE_DOC_KIND = "chrysalis.wisp.fidelity-deepen-source-doc";

const DEFAULT_BACKEND = join(
  process.env.CHRYSALIS_WISP_ROOT ??
    process.env.WISP_MODULE_DIR ??
    "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
  "..",
  "backend-services",
);

/** @param {object} [opts] */
export function resolveBackendRoot(opts = {}) {
  return resolve(
    opts.backendRoot ?? process.env.CHRYSALIS_WISP_BACKEND ?? DEFAULT_BACKEND,
  );
}

/** @param {object} [opts] */
export function resolveModuleManagerRoot(opts = {}) {
  return resolve(
    opts.wispRoot ??
      process.env.CHRYSALIS_WISP_ROOT ??
      process.env.WISP_MODULE_DIR ??
      "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
  );
}

/**
 * @param {string} backendRoot
 * @returns {Array<{ mount: string, source: string, abs: string }>}
 */
export function listBackendMounts(backendRoot) {
  const serverPath = join(backendRoot, "server.js");
  if (!existsSync(serverPath)) return [];
  return extractExpressApiMounts(readFileSync(serverPath, "utf8")).map((m) => {
    let rel = m.source.replace(/^\.\//, "");
    if (!rel.endsWith(".js") && !rel.endsWith(".ts")) {
      // require('./routes/setup') style — try .js then index.js
      if (existsSync(join(backendRoot, `${rel}.js`))) rel = `${rel}.js`;
      else if (existsSync(join(backendRoot, rel, "index.js"))) rel = join(rel, "index.js");
    }
    return { mount: m.path, source: rel, abs: join(backendRoot, rel) };
  });
}

/**
 * Walk a routes tree and collect .js files for fuzzy path matching.
 * @param {string} dir
 * @param {string[]} [acc]
 */
function walkJs(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkJs(p, acc);
    else if (ent.name.endsWith(".js") || ent.name.endsWith(".ts")) acc.push(p);
  }
  return acc;
}

/**
 * @param {string} apiPath e.g. /api/inventory/scan/check-in
 * @param {Array<{ mount: string, source: string, abs: string }>} mounts
 * @param {string} backendRoot
 */
export function resolveRouteFilesForApiPath(apiPath, mounts, backendRoot) {
  /** @type {string[]} */
  const files = [];
  const path = String(apiPath || "");
  const mount = mounts
    .filter((m) => path === m.mount || path.startsWith(m.mount + "/"))
    .sort((a, b) => b.mount.length - a.mount.length)[0];
  if (mount && existsSync(mount.abs)) {
    files.push(mount.abs);
    // HSS modular entry — also scan routes/hss/
    if (mount.source.includes("hss-management") || mount.mount === "/api/hss") {
      for (const f of walkJs(join(backendRoot, "routes/hss"))) files.push(f);
    }
    if (mount.source.includes("plans") || mount.mount === "/api/plans") {
      for (const f of walkJs(join(backendRoot, "routes/plans"))) files.push(f);
    }
  }
  // Known alias: /api/bundles → hardwareBundles.js
  if (path.startsWith("/api/bundles")) {
    const hb = join(backendRoot, "routes/hardwareBundles.js");
    if (existsSync(hb) && !files.includes(hb)) files.push(hb);
  }
  // Models often hold enums / required fields
  if (path.startsWith("/api/inventory")) {
    const model = join(backendRoot, "models/inventory.js");
    if (existsSync(model)) files.push(model);
  }
  if (path.startsWith("/api/bundles")) {
    const model = join(backendRoot, "models/hardwareBundle.js");
    if (existsSync(model)) files.push(model);
  }
  return [...new Set(files)];
}

/**
 * Extract handler snippets that mention a path suffix or nearby req.body fields.
 * @param {string} fileAbs
 * @param {string} apiPath
 * @param {string} backendRoot
 */
export function extractHandlerDocs(fileAbs, apiPath, backendRoot) {
  const text = readFileSync(fileAbs, "utf8");
  const rel = relative(backendRoot, fileAbs).replace(/\\/g, "/");
  const suffix = apiPath.replace(/^\/api\/[^/]+/, "") || "/";
  // tokens from suffix for matching router paths
  const tokens = suffix
    .split("/")
    .filter(Boolean)
    .filter((t) => !t.startsWith(":"))
    .slice(-3);
  const lines = text.split(/\r?\n/);
  /** @type {Array<{ line: number, method?: string, route?: string, snippet: string, bodyFields: string[] }>} */
  const hits = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/router\.(get|post|put|patch|delete)\(\s*['`]([^'`]+)['`]/i);
    if (!m) continue;
    const route = m[2];
    const method = m[1].toUpperCase();
    const matchToken =
      tokens.length === 0 ||
      tokens.some((t) => route.includes(t)) ||
      (apiPath.includes("bandwidth") && route.includes("bandwidth")) ||
      (apiPath.includes("scan") && route.includes("scan"));
    if (!matchToken) continue;

    // Pull preceding JSDoc (up to 12 lines) + following 40 lines for body destructure
    const start = Math.max(0, i - 12);
    const end = Math.min(lines.length, i + 45);
    const block = lines.slice(start, end).join("\n");
    const bodyFields = [];
    const bodyRe =
      /(?:const|let)\s*\{\s*([^}]+)\s*\}\s*=\s*req\.body|req\.body\.([a-zA-Z0-9_]+)/g;
    let bm;
    while ((bm = bodyRe.exec(block)) !== null) {
      if (bm[1]) {
        for (const part of bm[1].split(",")) {
          const name = part.trim().split("=")[0].trim().replace(/\s+/g, "");
          if (name && /^[a-zA-Z_]/.test(name)) bodyFields.push(name);
        }
      } else if (bm[2]) bodyFields.push(bm[2]);
    }
    // transferTo('check-in') style — document literal reasons
    const reasonLit = [...block.matchAll(/transferTo\([^,]+,\s*['"]([^'"]+)['"]/g)].map(
      (x) => x[1],
    );
    hits.push({
      line: i + 1,
      method,
      route,
      snippet: block.slice(0, 900),
      bodyFields: [...new Set(bodyFields)],
      transferReasons: reasonLit,
    });
  }

  // Enum docs from model files
  if (/models\//.test(rel) || /Schema/.test(text)) {
    const enumBlocks = [...text.matchAll(/enum:\s*\[([^\]]+)\]/g)].slice(0, 8).map((m) =>
      m[1]
        .split(",")
        .map((s) => s.trim().replace(/['"]/g, ""))
        .filter(Boolean),
    );
    if (enumBlocks.length) {
      hits.push({
        line: 1,
        snippet: `model enums (sample): ${JSON.stringify(enumBlocks.slice(0, 4))}`,
        bodyFields: [],
        enums: enumBlocks,
      });
    }
  }

  return { file: rel, abs: fileAbs, hits };
}

/**
 * Optional Module_Manager service client hints (secondary — still origin).
 * @param {string} wispRoot
 * @param {string} apiPath
 */
export function extractServiceClientHints(wispRoot, apiPath) {
  const servicesDir = join(wispRoot, "src/lib/services");
  if (!existsSync(servicesDir)) return [];
  /** @type {Array<{ file: string, line: number, snippet: string }>} */
  const out = [];
  const needle = apiPath.replace(/^\/api\/[^/]+/, "") || apiPath;
  const last = needle.split("/").filter(Boolean).slice(-2).join("/");
  for (const f of walkJs(servicesDir)) {
    if (!/\.(ts|js)$/.test(f)) continue;
    const text = readFileSync(f, "utf8");
    if (!text.includes(last) && !text.includes(apiPath)) continue;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(last) || lines[i].includes(apiPath)) {
        out.push({
          file: relative(wispRoot, f).replace(/\\/g, "/"),
          line: i + 1,
          snippet: lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 8)).join("\n").slice(0, 500),
        });
        if (out.length >= 3) return out;
      }
    }
  }
  return out;
}

/**
 * @param {object} [opts]
 */
export function documentDeepenCandidatesFromSource(opts = {}) {
  const catalog = opts.catalog || loadCatalog();
  const candidates = buildDeepenCandidates({ limit: opts.limit ?? 40, catalog });
  if (!candidates.ok) return candidates;

  const backendRoot = resolveBackendRoot(opts);
  const wispRoot = resolveModuleManagerRoot(opts);
  const mounts = listBackendMounts(backendRoot);

  /** @type {Array<object>} */
  const queue = [
    ...(candidates.held || []).map((h) => ({
      ...h,
      path: h.api || h.path || (h.title?.includes("scan") ? "/api/inventory/scan/check-in" : null),
    })),
    ...(candidates.catalogHints || []).map((h) => ({ ...h, path: h.api || h.path })),
    ...(candidates.unclaimedGoldenPaths || []),
  ].filter((c) => c.path && String(c.path).startsWith("/api/"));

  /** @type {Array<object>} */
  const docs = [];
  for (const c of queue.slice(0, opts.limit ?? 40)) {
    const files = resolveRouteFilesForApiPath(c.path, mounts, backendRoot);
    const handlers = files.map((f) => extractHandlerDocs(f, c.path, backendRoot));
    const clients = extractServiceClientHints(wispRoot, c.path);
    const bodyFields = [
      ...new Set(handlers.flatMap((h) => h.hits.flatMap((x) => x.bodyFields || []))),
    ];
    const transferReasons = [
      ...new Set(handlers.flatMap((h) => h.hits.flatMap((x) => x.transferReasons || []))),
    ];
    docs.push({
      path: c.path,
      title: c.title || c.kind,
      kind: c.kind,
      backendRoot,
      sourceFiles: handlers.map((h) => h.file),
      bodyFields,
      transferReasons,
      handlers: handlers
        .filter((h) => h.hits.length)
        .map((h) => ({
          file: h.file,
          hits: h.hits.map(({ line, method, route, bodyFields: bf, transferReasons: tr, snippet, enums }) => ({
            line,
            method,
            route,
            bodyFields: bf,
            transferReasons: tr,
            enums,
            snippet: String(snippet || "").slice(0, 600),
          })),
        })),
      moduleManagerClients: clients,
      note:
        files.length === 0
          ? "No backend-services file resolved — check mount / alias"
          : "Use source bodyFields/enums; live probe only verifies deploy parity",
    });
  }

  const report = {
    kind: SOURCE_DOC_KIND,
    schemaVersion: 1,
    ok: true,
    backendRoot,
    wispRoot,
    mountCount: mounts.length,
    closedThroughPass: catalog?.closedThroughPass,
    nextBatchId: catalog?.nextBatchId,
    workflow: [
      "1. candidates",
      "2. --source-doc (backend-services + Module_Manager services) — contract authority",
      "3. --probe live HSS only to verify deploy parity (do not invent bodies)",
      "4. AI proposes ×10 from source docs",
      "5. --batch → FUTURE §7",
    ],
    documented: docs,
    generatedAt: new Date().toISOString(),
  };

  const reportPath = join(scriptRoot, "reports/wisp/fidelity-deepen-candidates-source-doc.json");
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  report.reportPath = reportPath;
  return report;
}

async function main() {
  const limitIdx = process.argv.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) || 40 : 40;
  const report = documentDeepenCandidatesFromSource({ limit });
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        backendRoot: report.backendRoot,
        mountCount: report.mountCount,
        documented: (report.documented || []).map((d) => ({
          path: d.path,
          title: d.title,
          sourceFiles: d.sourceFiles,
          bodyFields: d.bodyFields,
          transferReasons: d.transferReasons,
          hitCount: (d.handlers || []).reduce((n, h) => n + (h.hits?.length || 0), 0),
          note: d.note,
        })),
        reportPath: report.reportPath,
      },
      null,
      2,
    ),
  );
  process.exit(report.ok ? 0 : 1);
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]).includes("wisp-fidelity-deepen-source-doc");
if (isMain) main();
