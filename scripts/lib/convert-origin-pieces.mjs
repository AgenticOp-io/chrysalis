#!/usr/bin/env node
/**
 * D6444 / G9993 — convert origin corpus pieces (piecemeal → all).
 *
 * Status vocabulary: pending | converting | demo-ok | bound | island-bound | hole
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { updatePieceStatuses } from "./source-corpus.mjs";
import { replaceRouteHandlerBlock, routesPath as defaultRoutesPath } from "./cwl-apply-surfaces.mjs";
import { sveltePagePathForRoute } from "./cwl-bulk-svelte-lift.mjs";
import {
  buildWispModuleHtmlPageBlock,
  buildWispLoginParityHtml,
  buildWispDashboardParityHtml,
  buildWispCoverageMapParityHtml,
  buildWispPlanParityHtml,
  buildWispDeployParityHtml,
} from "../wisp-cwl-ui-parity-lib.mjs";

export const CONVERT_ALL_PIECES_KIND = "chrysalis.convert-all-pieces";
export const CONVERT_ALL_PIECES_SCHEMA_VERSION = 1;
export const CONVERT_ALL_PIECES_GATE = "G9993";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultCorpusDir = join(scriptRoot, "reports/origin-corpus");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  }
}

function pageNameFor(httpPath) {
  return `${httpPath.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+/, "") || "root"}_page`;
}

function sveltePagePath(wispRoot, httpPath) {
  return sveltePagePathForRoute(wispRoot, httpPath);
}

function listApiRoutes(apiProxyPath, routesCwlPath) {
  /** @type {Set<string>} */
  const set = new Set();
  for (const p of [apiProxyPath, routesCwlPath]) {
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const m of text.matchAll(/@route\s+(?:GET|POST|PUT|PATCH|DELETE)\s+"([^"]+)"/g)) {
      set.add(m[1]);
    }
  }
  return set;
}

/**
 * Components under a module route + shared modals — deep lift (D6442/D6443).
 * @param {Map<string, string>} sources
 * @param {string} [moduleName]
 * @param {ReadonlySet<string>} [base]
 */
function structuralInlineSet(sources, moduleName, base) {
  const out = new Set(base ?? []);
  for (const [name, abs] of sources) {
    const p = abs.replace(/\\/g, "/");
    if (moduleName && p.includes(`/modules/${moduleName}/`)) out.add(name);
    if (/\/lib\/components\//.test(p)) out.add(name);
  }
  return out;
}

/**
 * @param {object} opts
 * @param {string} opts.wispRoot
 * @param {string} [opts.routesPath]
 * @param {string} [opts.apiProxyPath]
 * @param {string} [opts.sqlitePath]
 * @param {string} [opts.queuePath]
 * @param {string} [opts.reportPath]
 * @param {number} [opts.limit]
 * @param {string[]} [opts.onlyIds]
 */
export async function convertAllOriginPieces(opts = {}) {
  const wispRoot = resolve(
    opts.wispRoot ??
      process.env.CHRYSALIS_WISP_ROOT ??
      process.env.WISP_MODULE_DIR ??
      "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
  );
  const routesPath = opts.routesPath ?? defaultRoutesPath;
  const apiProxyPath = opts.apiProxyPath ?? join(scriptRoot, "fixtures/hub-wisp-management/api-proxy.cwl");
  const sqlitePath = opts.sqlitePath ?? join(defaultCorpusDir, "chrysalis.source-corpus.v1.sqlite");
  const queuePath = opts.queuePath ?? join(defaultCorpusDir, "chrysalis.convert-queue.v1.json");
  const reportPath =
    opts.reportPath ?? join(scriptRoot, "reports/origin-corpus/chrysalis.convert-all-pieces.v1.json");

  if (!existsSync(queuePath)) {
    return { kind: CONVERT_ALL_PIECES_KIND, schemaVersion: 1, ok: false, skip: "missing-queue" };
  }
  if (!existsSync(wispRoot)) {
    return { kind: CONVERT_ALL_PIECES_KIND, schemaVersion: 1, ok: false, skip: "missing-wisp-root", wispRoot };
  }

  const queueDoc = JSON.parse(readFileSync(queuePath, "utf8"));
  let pieces = queueDoc.queue ?? [];

  // Queue JSON often omits `paths` — restore from SQLite when present.
  if (existsSync(sqlitePath)) {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(sqlitePath, { readOnly: true });
    const pathById = new Map(
      db.prepare("SELECT id, paths_json, path_count FROM pieces").all().map((r) => [
        r.id,
        { paths: JSON.parse(r.paths_json || "[]"), pathCount: r.path_count },
      ]),
    );
    db.close();
    pieces = pieces.map((p) => {
      const extra = pathById.get(p.id);
      if (!extra) return p;
      return {
        ...p,
        paths: p.paths?.length ? p.paths : extra.paths,
        pathCount: p.pathCount ?? extra.pathCount,
      };
    });
  }

  if (opts.onlyIds?.length) {
    const want = new Set(opts.onlyIds);
    pieces = pieces.filter((p) => want.has(p.id));
  }
  if (typeof opts.limit === "number" && opts.limit > 0) {
    pieces = pieces.slice(0, opts.limit);
  }

  const ingest = await loadIngest();
  const componentSources = ingest.indexSvelteComponentSources(join(wispRoot, "src"));
  const defaultInline = ingest.DEFAULT_STRUCTURAL_INLINE_COMPONENTS ?? new Set();
  const apiRoutes = listApiRoutes(apiProxyPath, routesPath);
  const apiManifestPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-api-paths.json");
  /** @type {object[]} */
  let manifestPaths = [];
  if (existsSync(apiManifestPath)) {
    try {
      manifestPaths = JSON.parse(readFileSync(apiManifestPath, "utf8")).paths ?? [];
    } catch {
      manifestPaths = [];
    }
  }

  let routesText = existsSync(routesPath) ? readFileSync(routesPath, "utf8") : "";
  /** @type {Array<{ id: string, status: string, note?: string, files?: number }>} */
  const results = [];
  /** @type {Array<{ id: string, status: string }>} */
  const statusUpdates = [];

  for (const piece of pieces) {
    statusUpdates.push({ id: piece.id, status: "converting" });
  }
  updatePieceStatuses(sqlitePath, statusUpdates, { queuePath });
  statusUpdates.length = 0;

  for (const piece of pieces) {
    try {
      if (piece.kind === "ui-route") {
        const r = convertUiPiece(piece, {
          wispRoot,
          ingest,
          componentSources,
          defaultInline,
          getRoutesText: () => routesText,
          setRoutesText: (t) => {
            routesText = t;
          },
        });
        results.push(r);
        statusUpdates.push({ id: piece.id, status: r.status });
        continue;
      }
      if (piece.kind === "module-support") {
        const r = convertModuleSupportPiece(piece, {
          wispRoot,
          ingest,
          componentSources,
          defaultInline,
          getRoutesText: () => routesText,
          setRoutesText: (t) => {
            routesText = t;
          },
        });
        results.push(r);
        statusUpdates.push({ id: piece.id, status: r.status });
        continue;
      }
      if (piece.kind === "api-cluster") {
        const r = convertApiPiece(piece, apiRoutes, manifestPaths);
        results.push(r);
        statusUpdates.push({ id: piece.id, status: r.status });
        continue;
      }
      if (piece.kind === "shared-lib") {
        const r = convertSharedLibPiece(piece);
        results.push(r);
        statusUpdates.push({ id: piece.id, status: r.status });
        continue;
      }
      if (piece.kind === "ui-layout" || piece.kind === "ui-style") {
        results.push({
          id: piece.id,
          status: "demo-ok",
          note: "origin-css-assets-sync",
          files: piece.pathCount ?? 0,
        });
        statusUpdates.push({ id: piece.id, status: "demo-ok" });
        continue;
      }
      if (piece.kind === "ui-component" || piece.kind === "ui-source") {
        results.push({
          id: piece.id,
          status: "island-bound",
          note: "available-for-structural-inline",
          files: piece.pathCount ?? 0,
        });
        statusUpdates.push({ id: piece.id, status: "island-bound" });
        continue;
      }
      if (piece.kind === "corpus-residual") {
        results.push({
          id: piece.id,
          status: "indexed",
          note: "docs-assets-ops-not-runtime",
          files: piece.pathCount ?? 0,
        });
        statusUpdates.push({ id: piece.id, status: "indexed" });
        continue;
      }
      results.push({ id: piece.id, status: "hole", note: `unknown-kind:${piece.kind}` });
      statusUpdates.push({ id: piece.id, status: "hole" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ id: piece.id, status: "hole", note: `error:${msg.slice(0, 200)}` });
      statusUpdates.push({ id: piece.id, status: "hole" });
    }
  }

  if (routesText && existsSync(routesPath)) {
    writeFileSync(routesPath, routesText, "utf8");
  }

  const statusResult = updatePieceStatuses(sqlitePath, statusUpdates, { queuePath });
  const byStatus = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

  const fileCovered = results.reduce((n, r) => n + (r.files || 0), 0);
  const report = {
    kind: CONVERT_ALL_PIECES_KIND,
    schemaVersion: CONVERT_ALL_PIECES_SCHEMA_VERSION,
    gate: CONVERT_ALL_PIECES_GATE,
    ok: true,
    generatedAt: new Date().toISOString(),
    wispRoot: wispRoot.replace(/\\/g, "/"),
    pieceCount: results.length,
    byStatus,
    fileCoveredEstimate: fileCovered,
    statusWrite: statusResult,
    results,
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

function convertApiPiece(piece, apiRoutes, manifestPaths = []) {
  const cluster = String(piece.id).replace(/^api:/, "");
  const prefixes = new Set(
    (piece.httpPaths?.length ? piece.httpPaths : []).concat([`/api/${cluster}`, `/api/${cluster.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`]),
  );
  // Alias table from known Express mounts (backend-services/server.js).
  const aliases = {
    auth: ["/api/auth"],
    agent: ["/api/agent"],
    "branding-api": ["/api/branding"],
    "customer-portal-api": ["/api/customer-portal"],
    deployment: ["/api/deploy"],
    epc: ["/api/epc"],
    "epc-checkin": ["/api/epc"],
    "epc-commands": ["/api/epc"],
    "epc-deployment": ["/api/deploy"],
    "epc-logs": ["/api/epc"],
    "epc-management": ["/api/epc-management"],
    "epc-snmp": ["/api/epc/snmp"],
    epcMetrics: ["/api/epc"],
    epcUpdates: ["/api/epc-updates", "/api/epc"],
    "equipment-pricing": ["/api/equipment-pricing"],
    hardwareBundles: ["/api/bundles"],
    "hss-management": ["/api/hss"],
    incidents: ["/api/incidents"],
    "installation-documentation": ["/api/installation-documentation"],
    "inventory-schema": ["/api/inventory"],
    mikrotikAPI: ["/api/mikrotik"],
    "mme-status": ["/api/mme"],
    "mobile-tasks": ["/api/mobile"],
    "monitoring-graphs": ["/api/monitoring/graphs"],
    "monitoring-schema": ["/api/monitoring"],
    "portal-content": ["/api/portal-content"],
    "portal-domain": ["/api/portal"],
    "remote-agents-status": ["/api/remote-agents"],
    setup: ["/setup-admin"],
    "snmp-routes": ["/api/snmp"],
    snmpMonitoring: ["/api/snmp"],
    subcontractors: ["/api/subcontractors"],
    system: ["/api/system"],
    "tenant-settings": ["/api/tenant-settings"],
    "voice-sip": ["/api/voice"],
    "voice-webhooks": ["/api/voice"],
    admin: ["/api/admin"],
  };
  for (const a of aliases[cluster] ?? []) prefixes.add(a);
  for (const mp of manifestPaths) {
    const p = typeof mp === "string" ? mp : mp?.path;
    if (!p) continue;
    const slug = p.replace(/^\/api\//, "").split("/")[0];
    if (
      slug &&
      (slug === cluster ||
        slug.replace(/-/g, "") === cluster.replace(/-/g, "").toLowerCase() ||
        cluster.toLowerCase().includes(slug.toLowerCase()) ||
        slug.toLowerCase().includes(cluster.toLowerCase().replace(/api$/i, "")))
    ) {
      prefixes.add(p);
    }
  }

  const hits = [...apiRoutes].filter((a) =>
    [...prefixes].some((pref) => a === pref || a.startsWith(`${pref}/`) || pref.startsWith(`${a}/`)),
  );
  if (hits.length > 0) {
    return {
      id: piece.id,
      status: "bound",
      note: `native-cwl:${hits.slice(0, 5).join(",")}`,
      files: piece.pathCount ?? 0,
    };
  }
  // misc = non-route support files in backend — island-bound to hosting backend, not a hole invent.
  if (cluster === "misc") {
    return {
      id: piece.id,
      status: "island-bound",
      note: "backend-services-support-files",
      files: piece.pathCount ?? 0,
    };
  }
  return {
    id: piece.id,
    status: "hole",
    note: "legacy:api-cluster-unbound — no invented handler (D6442)",
    files: piece.pathCount ?? 0,
  };
}

function convertSharedLibPiece(piece) {
  const id = String(piece.id);
  if (id.includes("maps")) {
    return { id, status: "island-bound", note: "arcgis-map-island", files: piece.pathCount ?? 0 };
  }
  if (id.includes("auth") || id.includes("api-client") || id.includes("tenant")) {
    return { id, status: "island-bound", note: "wisp-cwl-client", files: piece.pathCount ?? 0 };
  }
  return { id, status: "island-bound", note: "client-runtime-lib", files: piece.pathCount ?? 0 };
}

function convertUiPiece(piece, ctx) {
  const httpPath = piece.httpPaths?.[0];
  if (!httpPath) {
    return { id: piece.id, status: "hole", note: "missing-http-path", files: piece.pathCount ?? 0 };
  }

  let html = null;
  let note = "structural-lift";

  if (httpPath === "/login") {
    html = buildWispLoginParityHtml();
    note = "parity:login";
  } else if (httpPath === "/dashboard") {
    html = buildWispDashboardParityHtml();
    note = "parity:dashboard";
  } else if (httpPath === "/modules/coverage-map") {
    html = buildWispCoverageMapParityHtml();
    note = "parity:coverage-map-structural";
  } else if (httpPath === "/modules/plan") {
    html = buildWispPlanParityHtml();
    note = "parity:plan";
  } else if (httpPath === "/modules/deploy") {
    html = buildWispDeployParityHtml();
    note = "parity:deploy";
  } else {
    const pageFile = sveltePagePath(ctx.wispRoot, httpPath);
    if (!existsSync(pageFile)) {
      return { id: piece.id, status: "hole", note: "missing-svelte-page", files: piece.pathCount ?? 0 };
    }
    const raw = readFileSync(pageFile, "utf8");
    const moduleName = httpPath.match(/^\/modules\/([^/]+)/)?.[1];
    const inline = structuralInlineSet(ctx.componentSources, moduleName, ctx.defaultInline);
    const lifted = ctx.ingest.liftStructuralSveltePageHtml(raw, {
      applyShowcaseLoadBools: true,
      componentSources: ctx.componentSources,
      structuralInlineComponents: inline,
      loadBools: {
        isDeployMode: false,
        hideStats: false,
        isLoading: false,
        error: false,
        success: false,
      },
    });
    if (!lifted || typeof lifted.html !== "string" || lifted.html.trim().length < 20) {
      return { id: piece.id, status: "hole", note: "lift-empty", files: piece.pathCount ?? 0 };
    }
    html = lifted.html;
    if (!html.includes("data-wisp-page") && !html.includes("data-cwl-island")) {
      const slug = httpPath.replace(/^\//, "").replace(/\//g, "-") || "home";
      html = `<div class="wisp-app-surface" data-wisp-page="${slug}" data-wisp-path="${httpPath}" data-cwl-island="client">${html}</div>`;
    }
  }

  const pageBlock = buildWispModuleHtmlPageBlock(
    httpPath,
    pageNameFor(httpPath),
    html,
    `{ source: "origin-convert-all", path: ${JSON.stringify(httpPath)} }`,
  );
  const applied = replaceRouteHandlerBlock(
    ctx.getRoutesText(),
    [`@page GET "${httpPath}"`, `@route GET "${httpPath}"`],
    pageBlock,
  );
  if (!applied.ok) {
    return { id: piece.id, status: "hole", note: `patch-failed:${applied.skip}`, files: piece.pathCount ?? 0 };
  }
  ctx.setRoutesText(applied.text);

  const liftedCount = (html.match(/data-cwl-lifted-component=/g) || []).length;
  const shellCount = (html.match(/data-cwl-modal-shell=/g) || []).length;
  const holeCount = (html.match(/data-cwl-hole=/g) || []).length;
  return {
    id: piece.id,
    status: "demo-ok",
    note: `${note};lifted=${liftedCount};shells=${shellCount};holes=${holeCount}`,
    files: piece.pathCount ?? 1,
  };
}

/**
 * Append origin modal components that exist under this module but are not
 * referenced in the page markup (orphan support chrome — D6443/D6444).
 * @param {string} html
 * @param {Set<string>} forceNames
 * @param {Map<string, string>} componentSources
 * @param {object} ingest
 * @param {string} [moduleName] limit orphans to this module's path
 */
function appendOrphanLiftedModals(html, forceNames, componentSources, ingest, moduleName) {
  let out = html;
  const modNeedle = moduleName ? `/modules/${moduleName}/` : null;
  for (const name of forceNames) {
    if (!/Modal$/.test(name)) continue;
    if (out.includes(`data-cwl-lifted-component="${name}"`)) continue;
    if (out.includes(`data-cwl-modal-shell="${name}"`)) continue;
    const path = componentSources.get(name);
    if (!path || !existsSync(path)) continue;
    const norm = path.replace(/\\/g, "/");
    if (modNeedle && !norm.includes(modNeedle) && !norm.includes("/lib/components/modals/")) {
      // Only module-local or shared $lib modals — not other modules' Add* trees
      continue;
    }
    if (modNeedle && norm.includes("/modules/") && !norm.includes(modNeedle)) continue;
    try {
      const raw = readFileSync(path, "utf8");
      const lifted = ingest.liftStructuralSveltePageHtml(raw, {
        loadBools: { show: true },
        applyShowcaseLoadBools: false,
        componentSources,
        structuralInlineComponents: new Set([name]),
      });
      if (!lifted?.html || lifted.html.trim().length < 40) continue;
      const stamped =
        typeof ingest.stampClosedUiChrome === "function"
          ? ingest.stampClosedUiChrome(lifted.html)
          : `<div hidden aria-hidden="true">${lifted.html}</div>`;
      out += `\n<div data-cwl-component="${name}" data-cwl-lifted-component="${name}" data-cwl-orphan-modal="1">${stamped}</div>`;
    } catch {
      /* skip orphan */
    }
  }
  return out;
}

function convertModuleSupportPiece(piece, ctx) {
  const mod = String(piece.id).replace(/^module-support:/, "");
  const httpPath = `/modules/${mod}`;
  const pageFile = sveltePagePath(ctx.wispRoot, httpPath);
  if (!existsSync(pageFile) && httpPath !== "/modules/coverage-map") {
    return {
      id: piece.id,
      status: "hole",
      note: "parent-ui-missing",
      files: piece.pathCount ?? 0,
    };
  }

  const forceNames = new Set(ctx.defaultInline);
  for (const key of piece.paths || []) {
    const rel = String(key).includes(":") ? String(key).split(":").slice(1).join(":") : String(key);
    const base = basename(rel).replace(/\.svelte$/, "");
    if (rel.endsWith(".svelte") && base) forceNames.add(base);
  }
  const inline = structuralInlineSet(ctx.componentSources, mod, forceNames);

  let html;
  let note = "module-support-inline";
  if (httpPath === "/modules/coverage-map") {
    html = buildWispCoverageMapParityHtml();
    note = "parity:coverage-map+support";
  } else if (httpPath === "/modules/plan") {
    html = buildWispPlanParityHtml();
    note = "parity:plan+support";
  } else if (httpPath === "/modules/deploy") {
    html = buildWispDeployParityHtml();
    note = "parity:deploy+support";
  } else {
    const raw = readFileSync(pageFile, "utf8");
    const lifted = ctx.ingest.liftStructuralSveltePageHtml(raw, {
      applyShowcaseLoadBools: true,
      componentSources: ctx.componentSources,
      structuralInlineComponents: inline,
      loadBools: {
        isDeployMode: false,
        hideStats: false,
        isLoading: false,
        error: false,
        success: false,
      },
    });
    if (!lifted || typeof lifted.html !== "string" || lifted.html.trim().length < 40) {
      return { id: piece.id, status: "hole", note: "support-lift-empty", files: piece.pathCount ?? 0 };
    }
    html = lifted.html;
  }

  html = appendOrphanLiftedModals(html, inline, ctx.componentSources, ctx.ingest, mod);

  const pageBlock = buildWispModuleHtmlPageBlock(
    httpPath,
    pageNameFor(httpPath),
    html,
    `{ source: "origin-convert-all", moduleSupport: ${JSON.stringify(mod)} }`,
  );
  const applied = replaceRouteHandlerBlock(
    ctx.getRoutesText(),
    [`@page GET "${httpPath}"`, `@route GET "${httpPath}"`],
    pageBlock,
  );
  if (!applied.ok) {
    return { id: piece.id, status: "hole", note: `patch-failed:${applied.skip}`, files: piece.pathCount ?? 0 };
  }
  ctx.setRoutesText(applied.text);

  const liftedCount = (html.match(/data-cwl-lifted-component=/g) || []).length;
  const shellCount = (html.match(/data-cwl-modal-shell=/g) || []).length;
  const orphanCount = (html.match(/data-cwl-orphan-modal=/g) || []).length;
  const status = liftedCount > 0 || note.startsWith("parity:") ? "demo-ok" : shellCount > 0 ? "hole" : "demo-ok";
  return {
    id: piece.id,
    status,
    note: `${note};inline=${inline.size};lifted=${liftedCount};shells=${shellCount};orphans=${orphanCount}`,
    files: piece.pathCount ?? 0,
  };
}
