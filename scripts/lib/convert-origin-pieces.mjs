#!/usr/bin/env node
/**
 * D6444 / G9993 — convert origin corpus pieces (piecemeal → all).
 *
 * Status vocabulary: pending | converting | converted-ok | bound | island-bound | hole
 * (`demo-ok` kept as alias write for one release; prefer converted-ok — D6447)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { updatePieceStatuses } from "./source-corpus.mjs";
import { replaceRouteHandlerBlock, routesPath as defaultRoutesPath } from "./cwl-apply-surfaces.mjs";
import { sveltePagePathForRoute } from "./cwl-bulk-svelte-lift.mjs";
import { buildWispModuleHtmlPageBlock, WISP_GCE_LOGIN_PROFILE } from "../wisp-cwl-ui-parity-lib.mjs";
import { resolveWispModuleRoot } from "./wisp-origin-paths.mjs";

export const CONVERT_ALL_PIECES_KIND = "chrysalis.convert-all-pieces";
export const CONVERT_ALL_PIECES_SCHEMA_VERSION = 1;
export const CONVERT_ALL_PIECES_GATE = "G9993";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultCorpusDir = join(scriptRoot, "reports/origin-corpus");

/** Visible demo login credentials panel for the GCE test site (main/login page). */
function injectDemoCredentialsPanel(html, profile = WISP_GCE_LOGIN_PROFILE) {
  if (html.includes("demo-credentials-panel")) return html;
  const email = String(profile.demoEmail || "demo@wisptools.io");
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const panel = `<div class="demo-credentials-panel" role="note">
        <p class="demo-credentials-title">Demo login</p>
        <p><strong>Email:</strong> ${esc(email)}</p>
        <p><strong>Password:</strong> set via env <code>CHRYSALIS_WISP_DEMO_PASSWORD</code> (operators only; not printed here)</p>
        <p class="demo-credentials-hint">Use these on the GCE test site. Firebase Auth on management.wisptools.io.</p>
      </div>`;
  let out = html;
  if (/<div class="login-card">\s*<h2>/.test(out)) {
    out = out.replace(/(<div class="login-card">\s*<h2>[^<]*<\/h2>)/, `$1\n      ${panel}`);
  } else if (/<form\b[^>]*>/.test(out)) {
    out = out.replace(/<form\b[^>]*>/, `${panel}\n      $&`);
  } else {
    out = `${panel}\n${out}`;
  }
  // Prefill the email field when empty.
  out = out.replace(
    /(<input[^>]*\bid="email"[^>]*?)(?:\s+value="[^"]*")?([^>]*>)/i,
    (_m, a, b) => {
      if (/\bvalue=/.test(a)) return `${a}${b}`;
      return `${a} value="${esc(email)}"${b}`;
    },
  );
  // Mask password placeholder — never embed a real password in markup.
  out = out.replace(
    /(<input[^>]*\bid="password"[^>]*?\splaceholder=")([^"]*)(")/i,
    `$1••••••••$3`,
  );
  return out;
}

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
 * Components under a module route — deep lift (D6442/D6443).
 * Shared `$lib` components stay on {@link DEFAULT_STRUCTURAL_INLINE_COMPONENTS}
 * / modal shells only — auto-inlining all of `$lib` hole-flooded every page.
 * @param {Map<string, string>} sources
 * @param {string} [moduleName]
 * @param {ReadonlySet<string>} [base]
 */
function structuralInlineSet(sources, moduleName, base, pageSource) {
  const out = new Set(base ?? []);
  for (const [name, abs] of sources) {
    const p = abs.replace(/\\/g, "/");
    if (moduleName && p.includes(`/modules/${moduleName}/`)) out.add(name);
    // Shared interactive UI is source authority too. Inline its markup so
    // modals/wizards/menus/panels retain real fields and controls; client CWL
    // bindings supply behavior. Charts/maps remain dedicated runtime islands.
    // Applies to non-module routes too (/wizards, /dashboard, /onboarding).
    if (
      p.includes("/lib/components/") &&
      !/(?:Chart|Map)$/.test(name) &&
      /(?:Modal|Wizard|Menu|Panel|Widget|Manager|Switcher|Connections|Plans|Stats|BulkImport|CardForm|DeviceRow)$/.test(
        name,
      )
    ) {
      out.add(name);
    }
  }
  // Cross-module imports rendered by this page (e.g. hardware page rendering
  // inventory's ScanModal, deploy rendering hss-management's SubscriberList) —
  // the page's import list is source truth. Charts/maps stay runtime islands.
  if (pageSource) {
    const impRe = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)\.svelte['"]/g;
    let m;
    while ((m = impRe.exec(pageSource))) {
      const name = m[1];
      if (!sources.has(name)) continue;
      if (/(?:Chart|Map)$/.test(name)) continue;
      const spec = m[2].replace(/\\/g, "/");
      const isModuleComponent =
        /(?:^|\/)components\//.test(spec) || /\/modules\//.test(spec);
      if (isModuleComponent || /(?:Modal|Wizard|Menu|Panel|Widget)$/.test(name)) {
        out.add(name);
      }
    }
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
      resolveWispModuleRoot(process.env.CHRYSALIS_WISP_ROOT ?? process.env.WISP_MODULE_DIR),
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
          status: "converted-ok",
          note: "origin-css-assets-sync",
          files: piece.pathCount ?? 0,
        });
        statusUpdates.push({ id: piece.id, status: "converted-ok" });
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
  const holePieces = byStatus.hole ?? 0;
  const report = {
    kind: CONVERT_ALL_PIECES_KIND,
    schemaVersion: CONVERT_ALL_PIECES_SCHEMA_VERSION,
    gate: CONVERT_ALL_PIECES_GATE,
    // Incomplete if any piece remains in hole status (D6448 — do not report success with unresolved pieces).
    ok: holePieces === 0,
    holePieces,
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

/**
 * Resolve `import { X } from '$lib/…'` and append the imported `export const X = {…}`
 * / `[…]` literal declarations as an extra script block, so the structural lift can
 * settle `{ROLE_NAMES[role]}`-style interps from origin truth (D6442, no invention).
 * @param {string} raw +page.svelte source
 * @param {string} wispRoot Module_Manager root
 */
function inlineLibConstLiterals(raw, wispRoot) {
  const extras = [];
  const importRe = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*['"]\$lib\/([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(raw))) {
    const names = m[1]
      .split(",")
      .map((n) => n.replace(/^\s*type\s+/, "").trim())
      .filter((n) => /^[A-Za-z_$][\w$]*$/.test(n));
    if (names.length === 0) continue;
    let libSrc = null;
    for (const cand of [m[2], `${m[2]}.ts`, `${m[2]}.js`, `${m[2]}/index.ts`]) {
      const abs = join(wispRoot, "src", "lib", cand);
      if (existsSync(abs)) {
        try {
          libSrc = readFileSync(abs, "utf8");
        } catch {
          libSrc = null;
        }
        break;
      }
    }
    if (libSrc === null) continue;
    for (const name of names) {
      // Maps only — inlining lib object *arrays* explodes each-row templates into
      // hundreds of unsettleable per-row holes (user-management/roles regression).
      const declRe = new RegExp(
        `export\\s+const\\s+${name}\\s*(?::[^=]+)?=\\s*(\\{)`,
        "g",
      );
      const dm = declRe.exec(libSrc);
      if (dm) {
        const open = dm[1];
        const close = "}";
        let depth = 0;
        let i = dm.index + dm[0].length - 1;
        for (; i < libSrc.length; i++) {
          const ch = libSrc[i];
          if (ch === open) depth++;
          else if (ch === close) {
            depth--;
            if (depth === 0) {
              i++;
              break;
            }
          }
        }
        extras.push(`const ${name} = ${libSrc.slice(dm.index + dm[0].length - 1, i)};`);
        continue;
      }
      // Static template-literal exports (help/docs HTML blobs — no `${}` interp).
      const tplRe = new RegExp(`export\\s+const\\s+${name}\\s*(?::[^=]+)?=\\s*\``, "g");
      const tm = tplRe.exec(libSrc);
      if (tm) {
        const start = tm.index + tm[0].length;
        let i = start;
        let hasInterp = false;
        for (; i < libSrc.length; i++) {
          const ch = libSrc[i];
          if (ch === "\\") {
            i++;
            continue;
          }
          if (ch === "$" && libSrc[i + 1] === "{") {
            hasInterp = true;
            break;
          }
          if (ch === "`") break;
        }
        if (!hasInterp && i < libSrc.length) {
          extras.push(`const ${name} = \`${libSrc.slice(start, i)}\`;`);
          continue;
        }
      }
      // Plain string exports (`export const projectStatusTitle = '…';`).
      const strRe = new RegExp(
        `export\\s+const\\s+${name}\\s*(?::[^=]+)?=\\s*('([^'\\\\]|\\\\.)*'|"([^"\\\\]|\\\\.)*")`,
        "g",
      );
      const sm = strRe.exec(libSrc);
      if (sm) {
        extras.push(`const ${name} = ${sm[1]};`);
      }
    }
  }
  if (extras.length === 0) return raw;
  return `${raw}\n<script>\n${extras.join("\n")}\n</script>`;
}

/**
 * Origin pages whose whole onMount is an unconditional goto() are redirects —
 * convert the behavior, not just the placeholder markup (e.g. /modules).
 * Conditional gotos (auth guards) do not match: the block body must be only
 * the goto call.
 * @returns {string | null} redirect target path
 */
/** Extract the body of the first onMount(() => { ... }) / onMount(async () => { ... }). */
function extractOnMountBlockBody(raw) {
  const head = /onMount\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{/.exec(raw);
  if (!head) return null;
  const openBrace = raw.indexOf("{", head.index + head[0].length - 1);
  if (openBrace < 0) return null;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = openBrace; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return raw.slice(openBrace + 1, i);
    }
  }
  return null;
}

export function detectMountRedirectTarget(raw) {
  const exprForm =
    /onMount\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*goto\(\s*(['"`])([^'"`$]+)\1\s*\)\s*\)/.exec(raw);
  if (exprForm) return exprForm[2];
  const body = extractOnMountBlockBody(raw);
  if (body == null) return null;
  const cleaned = body
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim()
    // Origin often wraps the only goto in `if (browser) { ... }`.
    .replace(/^if\s*\(\s*browser\s*\)\s*\{\s*/, "")
    .replace(/\s*\}\s*$/, "")
    .trim();
  const only = /^(?:await\s+)?goto\(\s*(['"`])([^'"`$]+)\1\s*(?:,[\s\S]*)?\);?$/.exec(cleaned);
  if (only) return only[2];
  return null;
}

/**
 * Auth-gate mount: if authenticated → pathA else → pathB (origin root / portal).
 * @returns {{ whenAuth: string, whenAnon: string } | null}
 */
export function detectAuthMountRedirect(raw) {
  const body = extractOnMountBlockBody(raw);
  if (body == null) return null;
  // if (isAuthenticated|user|customer|...) { goto(A) } else { goto(B) }
  const authThen =
    /if\s*\(\s*(!?\s*)(?:isAuthenticated|user|customer|currentUser|currentCustomer|auth(?:User)?)\b[^)]*\)\s*\{[\s\S]*?goto\(\s*(['"`])([^'"`$]+)\2/.exec(
      body,
    );
  if (!authThen) return null;
  const elseGoto = /else\s*\{[\s\S]*?goto\(\s*(['"`])([^'"`$]+)\1/.exec(body);
  if (!elseGoto) return null;
  const firstIsNegated = /^\s*!/.test(authThen[1] || "");
  const a = authThen[3];
  const b = elseGoto[2];
  if (!a.startsWith("/") || !b.startsWith("/")) return null;
  return firstIsNegated
    ? { whenAuth: b, whenAnon: a }
    : { whenAuth: a, whenAnon: b };
}

function mountRedirectHtml(httpPath, target) {
  const safe = target.replace(/"/g, "&quot;");
  return (
    `<div class="wisp-app-surface" data-wisp-page="redirect" data-wisp-path="${httpPath}">` +
    `<div class="redirect-message">Redirecting…</div>` +
    `<script>location.replace(${JSON.stringify(target)});</script>` +
    `<noscript><a href="${safe}">Continue</a></noscript></div>`
  );
}

function authMountRedirectHtml(httpPath, whenAuth, whenAnon) {
  // Prefer live Firebase session when available; fall back to demo/local markers.
  // Also honor customer-portal session keys used by customerAuthService.
  const script = `(function(){function go(p){location.replace(p);}try{var a=window.firebase&&firebase.auth&&firebase.auth();if(a&&a.onAuthStateChanged){a.onAuthStateChanged(function(u){go(u?${JSON.stringify(whenAuth)}:${JSON.stringify(whenAnon)});});return;}var u=localStorage.getItem("firebase:authUser")||sessionStorage.getItem("wisp-demo-user")||localStorage.getItem("wisp-customer-session")||sessionStorage.getItem("wisp-customer-session");go(u?${JSON.stringify(whenAuth)}:${JSON.stringify(whenAnon)});}catch(e){go(${JSON.stringify(whenAnon)});}})();`;
  return (
    `<div class="wisp-app-surface" data-wisp-page="auth-redirect" data-wisp-path="${httpPath}">` +
    `<div class="loading-page"><div class="spinner"></div><p>Checking authentication...</p></div>` +
    `<script>${script}</script>` +
    `<noscript><a href="${whenAnon.replace(/"/g, "&quot;")}">Continue to login</a></noscript></div>`
  );
}

/**
 * Structural lift of one Module_Manager +page.svelte (D6442/D6443).
 * No invented parity HTML — origin markup + class names are look authority.
 * @returns {{ html: string, note: string } | { hole: string }}
 */
function structuralLiftUiPage(httpPath, ctx) {
  const pageFile = sveltePagePath(ctx.wispRoot, httpPath);
  if (!existsSync(pageFile)) {
    return { hole: "missing-svelte-page" };
  }
  const raw = inlineLibConstLiterals(readFileSync(pageFile, "utf8"), ctx.wispRoot);
  // Faithful conversion of onMount(() => goto(target)) redirect pages.
  const redirectTarget = detectMountRedirectTarget(raw);
  if (redirectTarget && redirectTarget.startsWith("/")) {
    return { html: mountRedirectHtml(httpPath, redirectTarget), note: "mount-redirect" };
  }
  // Origin portal/[tenantId]: goto(`/modules/customers/portal/login?tenant=${tenantId}`)
  if (
    /portal\/(?:\[tenantId\]|:tenantId)/.test(httpPath) ||
    /goto\s*\(\s*[`]\/modules\/customers\/portal\/login\?tenant=\$\{/.test(raw)
  ) {
    const html =
      `<div class="wisp-app-surface" data-wisp-page="redirect" data-wisp-path="${httpPath}">` +
      `<div class="redirect-message">Redirecting to portal…</div>` +
      `<script>var m=location.pathname.match(/^\\/portal\\/([^/]+)/);location.replace(m?"/modules/customers/portal/login?tenant="+encodeURIComponent(m[1]):"/modules/customers/portal/login");</script>` +
      `<noscript><a href="/modules/customers/portal/login">Continue</a></noscript></div>`;
    return { html, note: "portal-tenant-redirect" };
  }
  // Single-tenant demo fork: origin tenant-selector / tenant-setup redirect to
  // /dashboard on mount when isSingleTenantMode() — which is the origin default
  // now that getConfiguredSingleTenantId() falls back to the demo tenant id.
  // The multitenant org UI behind that gate is dead in this deployment, so
  // compile the redirect instead of lifting the stale selector/setup markup.
  const mountBody = extractOnMountBlockBody(raw) || "";
  if (
    /if\s*\(\s*isSingleTenantMode\s*\(\s*\)[\s\S]{0,400}?goto\(\s*['"`]\/dashboard['"`]/.test(
      mountBody,
    )
  ) {
    return {
      html: authMountRedirectHtml(httpPath, "/dashboard", "/login"),
      note: "single-tenant-mount-redirect",
    };
  }
  // Auth gate on a thin redirect shell (root / portal entry) — not on full pages
  // that merely guard their own content with a login goto.
  const authRedirect = detectAuthMountRedirect(raw);
  if (authRedirect) {
    const markup = raw.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
    const thinShell =
      /Redirecting|Checking authentication|loading-page|class=["']redirect/i.test(markup) &&
      !/<table|<form|data-cwl-|module-header|modal-overlay/i.test(markup);
    if (thinShell) {
      return {
        html: authMountRedirectHtml(httpPath, authRedirect.whenAuth, authRedirect.whenAnon),
        note: "auth-mount-redirect",
      };
    }
  }
  // Onboarding localStorage gate from origin FirstTimeSetup flow.
  if (
    httpPath === "/onboarding" &&
    /onboardingCompleted/.test(raw) &&
    /tenantSetupCompleted/.test(raw)
  ) {
    const script =
      `(function(){try{if(localStorage.getItem("onboardingCompleted")==="true"){location.replace("/dashboard");return;}` +
      `if(localStorage.getItem("tenantSetupCompleted")!=="true"){location.replace("/tenant-setup");return;}}catch(e){}` +
      `})();`;
    return {
      html:
        `<div class="wisp-app-surface" data-wisp-page="onboarding" data-wisp-path="/onboarding" data-cwl-island="client">` +
        `<div class="onboarding-message"><p>Redirecting to the appropriate setup step...</p></div>` +
        `<div class="cwl-wizard-shell" data-cwl-wizard-shell="FirstTimeSetupWizard" aria-hidden="true" role="dialog"></div>` +
        `<script>${script}</script></div>`,
      note: "onboarding-mount-redirect",
    };
  }
  const moduleName = httpPath.match(/^\/modules\/([^/]+)/)?.[1];
  const inline = structuralInlineSet(ctx.componentSources, moduleName, ctx.defaultInline, raw);
  const isDeploy =
    httpPath === "/modules/deploy" || httpPath.startsWith("/modules/deploy/");
  const lifted = ctx.ingest.liftStructuralSveltePageHtml(raw, {
    applyShowcaseLoadBools: true,
    // Supported dynamic expressions are compiled runtime bindings, not holes.
    // This keeps one-pass output honest while allowing live API hydration.
    promoteRuntimeBindings: true,
    componentSources: ctx.componentSources,
    structuralInlineComponents: inline,
    loadBools: {
      isDeployMode: isDeploy,
      hideStats: false,
      isLoading: false,
      loading: false,
      error: false,
      success: false,
    },
  });
  if (!lifted || typeof lifted.html !== "string" || lifted.html.trim().length < 20) {
    return { hole: "lift-empty" };
  }
  let html =
    typeof ctx.ingest.scrubStructuralMarkupArtifacts === "function"
      ? ctx.ingest.scrubStructuralMarkupArtifacts(lifted.html)
      : lifted.html;
  // Always stamp page identity so client islands (initMapShell) boot — even when
  // lifted HTML already contains data-cwl-island markers (D6448-ST).
  if (!html.includes("data-wisp-page")) {
    // Prefer short module ids (`plan`) over `modules-plan` so client islands match.
    const slug =
      httpPath.match(/^\/modules\/([^/]+)/)?.[1] ||
      httpPath.replace(/^\//, "").replace(/\//g, "-") ||
      "home";
    html = `<div class="wisp-app-surface" data-wisp-page="${slug}" data-wisp-path="${httpPath}" data-cwl-island="client">${html}</div>`;
  }
  if (httpPath === "/login") {
    html = injectDemoCredentialsPanel(html);
  }
  // Deploy SharedMap defaults to plan when mode={mapMode} — fix from route (origin).
  if (isDeploy) {
    html = html
      .replace(/\bid="plan-map-iframe"/g, 'id="deploy-map-iframe"')
      .replace(/\bdata-cwl-map-mode="plan"/g, 'data-cwl-map-mode="deploy"')
      .replace(
        /\/modules\/coverage-map\?mode=plan&amp;hideStats=true&amp;planMode=true/g,
        "/modules/coverage-map?mode=deploy&amp;hideStats=true&amp;deployMode=true",
      )
      .replace(
        /\/modules\/coverage-map\?mode=plan&hideStats=true&planMode=true/g,
        "/modules/coverage-map?mode=deploy&hideStats=true&deployMode=true",
      )
      .replace(/\btitle="Plan map"/g, 'title="Deploy map"');
  }
  // Closed first paint: overlays must carry boolean `hidden` (not merely aria-hidden —
  // `\bhidden\b` matches inside aria-hidden and wrongly skips the real attribute).
  const hasBoolHidden = (attrs) => /(?:^|\s)hidden(?:\s|=|>|$)/i.test(attrs);
  html = html.replace(
    /<(div|section)(\s+[^>]*\bclass="[^"]*(?:modal-overlay|popup-overlay|tips-overlay|help-overlay|wizard-overlay|settings-overlay|filters-modal|marketing-backdrop)[^"]*"[^>]*)>/gi,
    (full, tag, attrs) => {
      if (hasBoolHidden(attrs)) {
        if (!/\baria-hidden\b/i.test(attrs)) return `<${tag}${attrs} aria-hidden="true">`;
        return full;
      }
      if (/\baria-hidden\b/i.test(attrs)) return `<${tag}${attrs} hidden>`;
      return `<${tag}${attrs} hidden aria-hidden="true">`;
    },
  );
  // Origin back chrome often lacks href/data-action after Svelte strip — stamp nav (D6442).
  html = html.replace(
    /<button(\s[^>]*\b(?:module-back-btn|wisp-back-btn|back-button|btn-back)\b[^>]*)>/gi,
    (full, attrs) => {
      let next = attrs;
      if (!/\bdata-cwl-nav\s*=/.test(next)) next += ' data-cwl-nav="/dashboard"';
      next = next
        .replace(/\s+data-action="[^"]*"/gi, "")
        .replace(/\s+data-cwl-action="[^"]*"/gi, "")
        .replace(/\s+data-cwl-action-args="[^"]*"/gi, "")
        .replace(/\s+data-cwl-set="href:[^"]*"/gi, "");
      if (!/\btype\s*=/.test(next)) next += ' type="button"';
      return `<button${next}>`;
    },
  );
  // Every converted button needs one behavior owner and an accessible semantic
  // label even when its visible Svelte interpolation settles only at runtime.
  html = html.replace(/<button(\s[^>]*)>/gi, (full, attrs) => {
    let next = attrs;
    if (/\bdata-cwl-nav\s*=/.test(next)) {
      next = next
        .replace(/\s+data-action="[^"]*"/gi, "")
        .replace(/\s+data-cwl-action="[^"]*"/gi, "")
        .replace(/\s+data-cwl-action-args="[^"]*"/gi, "")
        .replace(/\s+data-cwl-set="href:[^"]*"/gi, "");
    }
    if (!/\b(?:aria-label|title)\s*=/.test(next)) {
      const action = /\bdata-cwl-action="([^"]+)"/i.exec(next)?.[1];
      const toggle = /\bdata-cwl-toggle="([^":]+)/i.exec(next)?.[1];
      const className = /\bclass="([^"]*)"/i.exec(next)?.[1] ?? "";
      const source = action || toggle || (/wizard-step/i.test(className) ? "Wizard step" : "");
      if (source) {
        const words = source
          .replace(/^(?:handle|on)(?=[A-Z])/, "")
          .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
          .replace(/[-_]+/g, " ")
          .trim();
        const label = words ? words[0].toUpperCase() + words.slice(1) : "";
        if (label) next += ` aria-label="${label.replace(/"/g, "&quot;")}"`;
      }
    }
    return `<button${next}>`;
  });
  // Login / dashboard: preserve origin chrome; demo credentials stay CWL-additive CSS/client only.
  return { html, note: "structural-lift" };
}

function convertUiPiece(piece, ctx) {
  const httpPath = piece.httpPaths?.[0];
  if (!httpPath) {
    return { id: piece.id, status: "hole", note: "missing-http-path", files: piece.pathCount ?? 0 };
  }

  const liftedPage = structuralLiftUiPage(httpPath, ctx);
  if ("hole" in liftedPage) {
    return { id: piece.id, status: "hole", note: liftedPage.hole, files: piece.pathCount ?? 0 };
  }
  const { html, note } = liftedPage;

  const pageBlock = buildWispModuleHtmlPageBlock(
    httpPath,
    pageNameFor(httpPath),
    html,
    // Use httpPath — bare `path` poisons SVG `<path>` via CWL HTML interpolation (G1189).
    `{ source: "origin-convert-all", httpPath: ${JSON.stringify(httpPath)} }`,
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
    status: "converted-ok",
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
      // The orphan's own imports are its children (HSSManagementModal →
      // SubscriberList) — include them so nested tabs lift, not hole.
      const orphanInline = new Set([name]);
      const orphanImpRe = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]+\.svelte['"]/g;
      let oim;
      while ((oim = orphanImpRe.exec(raw))) {
        const child = oim[1];
        if (!componentSources.has(child)) continue;
        if (/(?:Chart|Map)$/.test(child)) continue;
        orphanInline.add(child);
      }
      const lifted = ingest.liftStructuralSveltePageHtml(raw, {
        loadBools: { show: true },
        applyShowcaseLoadBools: true,
        promoteRuntimeBindings: true,
        componentSources,
        structuralInlineComponents: orphanInline,
      });
      if (!lifted?.html || lifted.html.trim().length < 40) continue;
      // Hole-flooded orphans (nested each/if) — keep a closed shell, do not paste D6448 noise.
      if ((lifted.holes?.length ?? 0) > 12) {
        out += `\n<div class="modal-overlay" data-cwl-modal-shell="${name}" data-cwl-orphan-modal="1" hidden aria-hidden="true"></div>`;
        continue;
      }
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

  // D6443 — always structural-lift origin page; never invent parity shells.
  // Reuse structuralLiftUiPage so Deploy map mode, overlay hidden, and back nav stamp.
  if (!existsSync(pageFile)) {
    return { id: piece.id, status: "hole", note: "support-missing-page", files: piece.pathCount ?? 0 };
  }
  const lifted = structuralLiftUiPage(httpPath, {
    ...ctx,
    defaultInline: inline,
  });
  if (lifted.hole || !lifted.html) {
    return { id: piece.id, status: "hole", note: lifted.hole || "support-lift-empty", files: piece.pathCount ?? 0 };
  }
  let html = lifted.html;
  const note = "module-support-structural";

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
  const status = liftedCount > 0 || shellCount === 0 ? "converted-ok" : "hole";
  return {
    id: piece.id,
    status,
    note: `${note};inline=${inline.size};lifted=${liftedCount};shells=${shellCount};orphans=${orphanCount}`,
    files: piece.pathCount ?? 0,
  };
}
