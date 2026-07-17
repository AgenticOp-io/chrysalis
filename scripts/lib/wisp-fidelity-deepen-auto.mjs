#!/usr/bin/env node
/**
 * Autonomous deepen exhaust loop (D6445).
 *
 * Continues proposing ×10 deepen rounds across static GET → param GET →
 * golden-backed mutations until **3 consecutive** rounds show **no improvement**
 * (zero newly green exact method+path probes). Empty queue alone is **not** a
 * stop — it only increments the no-improvement streak. Operator does not need
 * to say "continue".
 *
 *   pnpm run hub:fidelity-deepen-until-exhausted
 *   node scripts/lib/wisp-fidelity-deepen-cli.mjs --until-exhausted
 *
 * Laws: D6442 translate-only bodies (mutation bodies from goldens / no invent);
 * D6445 external-deps briefing; never invent API keys.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import {
  runDeepenBatch,
  loadCatalog,
  catalogPath,
  scriptRoot,
  DEFAULT_TENANT_ID,
} from "./wisp-fidelity-deepen-harness.mjs";
import { runExternalDepsProtocol, externalRiskForApiPath } from "./wisp-external-deps-protocol.mjs";
import { extractExpressApiMounts } from "./sync-api-paths-from-backend.mjs";

export const AUTO_KIND = "chrysalis.wisp.fidelity-deepen-auto-exhaust";
export const AUTO_SCHEMA = 1;
export const STOP_AFTER_NO_IMPROVEMENT = 3;
export const BATCH_SIZE = 10;
/** Safety ceiling only — real stop is 3× no-improvement. */
export const DEFAULT_MAX_ROUNDS = 200;

const autoStatePath = join(
  scriptRoot,
  "fixtures/hub-wisp-management/chrysalis.wisp-fidelity-deepen-auto-state.v1.json",
);

const SKIP_DIR = new Set(["node_modules", ".git", "dist", "build", "coverage"]);

/** Routes auto must not touch (session break / destructive / cron). */
const SKIP_ROUTE_RE =
  /^\/api\/auth\/(login|logout|refresh|send-verification|verify-email)|\/api\/internal\/cron|\/api\/internal\/first-tenant|DELETE\s/i;

/**
 * @param {object} [opts]
 */
export function loadAutoState(opts = {}) {
  const p = opts.statePath || autoStatePath;
  if (!existsSync(p)) {
    return {
      kind: AUTO_KIND,
      schemaVersion: AUTO_SCHEMA,
      stopAfterNoImprovement: STOP_AFTER_NO_IMPROVEMENT,
      consecutiveNoImprovement: 0,
      status: "idle",
      exactPathsProbed: [],
      patternsProbed: [],
      rounds: [],
      updatedAt: null,
    };
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

/**
 * @param {object} state
 * @param {object} [opts]
 */
export function saveAutoState(state, opts = {}) {
  const p = opts.statePath || autoStatePath;
  mkdirSync(dirname(p), { recursive: true });
  const next = { ...state, updatedAt: new Date().toISOString() };
  writeFileSync(p, JSON.stringify(next, null, 2) + "\n");
  return next;
}

export function resolveBackendRoot(opts = {}) {
  return resolve(
    opts.backendRoot ??
      process.env.CHRYSALIS_WISP_BACKEND ??
      join(
        process.env.CHRYSALIS_WISP_ROOT ??
          process.env.WISP_MODULE_DIR ??
          "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
        "..",
        "backend-services",
      ),
  );
}

function walkJs(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkJs(p, acc);
    else if (ent.name.endsWith(".js")) {
      try {
        if (statSync(p).size < 1_500_000) acc.push(p);
      } catch {
        /* ignore */
      }
    }
  }
  return acc;
}

/**
 * Exact probe key.
 * @param {string} method
 * @param {string} path
 */
export function exactKey(method, path) {
  return `${String(method).toUpperCase()} ${path}`;
}

/**
 * Pattern key keeps :params (for “already tried this route shape”).
 * @param {string} method
 * @param {string} template
 */
export function patternKey(method, template) {
  return `${String(method).toUpperCase()} ${template}`;
}

/**
 * Discover Express routes (all methods) from mounts + router.* .
 * @param {string} backendRoot
 * @returns {Array<{ method: string, template: string, source: string, hasParams: boolean }>}
 */
export function discoverExpressRoutes(backendRoot) {
  const serverPath = join(backendRoot, "server.js");
  if (!existsSync(serverPath)) return [];
  const mounts = extractExpressApiMounts(readFileSync(serverPath, "utf8"));
  mounts.push({ path: "/api/branding", source: "routes/branding-api.js" });

  /** @type {Map<string, { method: string, template: string, source: string, hasParams: boolean }>} */
  const out = new Map();
  const routeRe = /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/gi;
  const appRe = /app\.(get|post|put|patch|delete)\(\s*['"`](\/api[^'"`]+)['"`]/gi;

  for (const mount of mounts) {
    let rel = mount.source.replace(/^\.\//, "");
    const candidates = [];
    if (rel.endsWith(".js")) candidates.push(join(backendRoot, rel));
    else {
      candidates.push(join(backendRoot, `${rel}.js`));
      candidates.push(join(backendRoot, rel, "index.js"));
      const dir = join(backendRoot, rel);
      if (existsSync(dir)) walkJs(dir, candidates);
    }
    for (const file of candidates) {
      if (!existsSync(file) || !file.endsWith(".js")) continue;
      let text;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const src = relative(backendRoot, file).replace(/\\/g, "/");
      for (const m of text.matchAll(routeRe)) {
        const method = m[1].toUpperCase();
        const sub = m[2];
        if (sub.includes("*")) continue;
        const full = (mount.path.replace(/\/$/, "") + (sub.startsWith("/") ? sub : `/${sub}`)).replace(
          /\/+/g,
          "/",
        );
        if (!full.startsWith("/api") && !full.startsWith("/admin")) continue;
        const key = patternKey(method, full);
        out.set(key, {
          method,
          template: full,
          source: src,
          hasParams: full.includes(":"),
        });
      }
      for (const m of text.matchAll(appRe)) {
        const method = m[1].toUpperCase();
        const full = m[2];
        if (full.includes("*")) continue;
        out.set(patternKey(method, full), {
          method,
          template: full,
          source: src,
          hasParams: full.includes(":"),
        });
      }
    }
  }
  return [...out.values()].sort((a, b) =>
    a.method === b.method
      ? a.template.localeCompare(b.template)
      : a.method.localeCompare(b.method),
  );
}

/**
 * @deprecated prefer discoverExpressRoutes — kept for callers
 */
export function discoverStaticGetRoutes(backendRoot) {
  return discoverExpressRoutes(backendRoot)
    .filter((r) => r.method === "GET" && !r.hasParams)
    .map((r) => ({ path: r.template, source: r.source }));
}

/**
 * Load mutate request bodies from API golden files (D6442 — not invented).
 * @returns {Map<string, object|null>} patternKey → body (null = no JSON body)
 */
export function loadGoldenBodies() {
  /** @type {Map<string, object|null>} */
  const map = new Map();
  const indexPath = join(
    scriptRoot,
    "fixtures/hub-wisp-management/chrysalis.wisp-api-goldens.v1.json",
  );
  if (!existsSync(indexPath)) return map;
  const idx = JSON.parse(readFileSync(indexPath, "utf8"));
  const goldensDir = join(
    scriptRoot,
    "fixtures/hub-wisp-management",
    idx.goldensDir || "wisp-api-goldens",
  );
  for (const h of idx.routes || []) {
    const method = String(h.method || "GET").toUpperCase();
    if (method === "GET" || method === "OPTIONS" || method === "HEAD") continue;
    const path = String(h.path || "");
    if (!path.startsWith("/api/") && !path.startsWith("/admin")) continue;
    // Concrete golden paths may use literal ids — normalize :id-ish segments later
    const template = path.replace(/\/[a-f0-9]{24}(?=\/|$)/gi, "/:id").replace(/\/x97YKjYJob7VECtfDGV2/g, "/:id");
    let body = null;
    const gp = h.goldenPath ? join(scriptRoot, "fixtures/hub-wisp-management", h.goldenPath) : null;
    if (gp && existsSync(gp)) {
      try {
        const g = JSON.parse(readFileSync(gp, "utf8"));
        // Goldens are often the request body itself, or { request, body, payload }
        if (g && typeof g === "object") {
          if (g.request && typeof g.request === "object") body = g.request;
          else if (g.body && typeof g.body === "object" && !Array.isArray(g.body)) body = g.body;
          else if (g.payload && typeof g.payload === "object") body = g.payload;
          else if (!("status" in g) && !("ok" in g) && !("response" in g)) body = g;
        }
      } catch {
        /* ignore */
      }
    }
    map.set(patternKey(method, template), body);
    map.set(patternKey(method, path), body);
  }
  return map;
}

function isSkippedRoute(method, template) {
  const key = `${method} ${template}`;
  if (SKIP_ROUTE_RE.test(key) || SKIP_ROUTE_RE.test(template)) return true;
  if (method === "DELETE") return true; // never auto-delete live demo rows
  return false;
}

/**
 * Seed exactPathsProbed + patternsProbed from prior deepen history.
 * Skip-only probes do **not** burn patterns (so param GETs can retry with better ids).
 */
export function seedExactPathsFromHistory(state) {
  const probed = new Set(state.exactPathsProbed || []);
  const patterns = new Set(state.patternsProbed || []);
  /** @type {Set<string>} */
  const skippedPatterns = new Set();
  const batchesDir = join(scriptRoot, "scripts/lib/wisp-fidelity-deepen-batches");
  if (existsSync(batchesDir)) {
    for (const name of readdirSync(batchesDir)) {
      if (!name.endsWith(".mjs") || name === "index.mjs") continue;
      try {
        const text = readFileSync(join(batchesDir, name), "utf8");
        for (const m of text.matchAll(
          /"method":\s*"(GET|POST|PUT|PATCH|DELETE)"\s*,\s*\n\s*"template":\s*"([^"]+)"/g,
        )) {
          patterns.add(patternKey(m[1], m[2]));
        }
        for (const m of text.matchAll(
          /probeDemo\(\s*["'](GET|POST|PUT|PATCH|DELETE)["']\s*,\s*["']([^"'${}]+)["']/g,
        )) {
          probed.add(exactKey(m[1], m[2]));
          patterns.add(patternKey(m[1], m[2]));
        }
      } catch {
        /* ignore */
      }
    }
  }
  const reportsDir = join(scriptRoot, "reports/wisp");
  if (existsSync(reportsDir)) {
    for (const name of readdirSync(reportsDir)) {
      if (!/^fidelity-deepen-.*\.json$/.test(name)) continue;
      try {
        const j = JSON.parse(readFileSync(join(reportsDir, name), "utf8"));
        for (const p of j.probes || []) {
          if (!p.path && !p.template) continue;
          const method = p.method || "GET";
          const tmpl = p.template || p.path;
          if (String(p.action || "").startsWith("skip")) {
            skippedPatterns.add(patternKey(method, tmpl));
            continue;
          }
          if (p.ok === true || (p.status >= 200 && p.status < 300)) {
            if (p.path) probed.add(exactKey(method, p.path));
          }
          if (p.path && !String(p.path).includes(":")) {
            patterns.add(patternKey(method, p.path));
          }
          if (tmpl) patterns.add(patternKey(method, tmpl));
        }
      } catch {
        /* ignore */
      }
    }
  }
  const catalog = loadCatalog();
  for (const p of catalog?.passes || []) {
    if (p.exactPath && p.status === "done") {
      probed.add(exactKey("GET", p.exactPath));
      patterns.add(patternKey("GET", p.exactPath));
    }
    if (p.pattern && p.status === "done") patterns.add(String(p.pattern));
    // Do not burn honest/skip catalog entries as patterns forever
  }
  // Unburn patterns that were only ever skipped
  for (const sk of skippedPatterns) {
    // keep burned only if also seen as a real HTTP attempt (already in patterns from non-skip)
    // if pattern exists solely from skip, remove it
  }
  // Rebuild: start from patterns, then remove pure-skips that never had a non-skip probe
  // Simpler: remove all skippedPatterns from the set so they can be retried once
  for (const sk of skippedPatterns) patterns.delete(sk);

  // Also ignore skip-status catalog patterns so retries can proceed
  for (const p of catalog?.passes || []) {
    if (p.pattern && p.status === "skip") {
      patterns.delete(String(p.pattern));
    }
  }

  return {
    exactPathsProbed: [...probed].sort(),
    patternsProbed: [...patterns].sort(),
  };
}

/**
 * Harvest POST/PUT/PATCH bodies from hand-written deepen batches (D6442 — already sourced).
 * @returns {Array<{ method: string, path: string, template: string, body: object, source: string, hasParams: boolean }>}
 */
export function harvestBatchMutationTargets() {
  const batchesDir = join(scriptRoot, "scripts/lib/wisp-fidelity-deepen-batches");
  /** @type {Array<object>} */
  const out = [];
  if (!existsSync(batchesDir)) return out;
  for (const name of readdirSync(batchesDir)) {
    if (!name.endsWith(".mjs") || name === "index.mjs") continue;
    // Prefer hand-authored n10* / deepen*; auto modules rarely embed bodies
    let text;
    try {
      text = readFileSync(join(batchesDir, name), "utf8");
    } catch {
      continue;
    }
    for (const m of text.matchAll(
      /probeDemo\(\s*["'](POST|PUT|PATCH)["']\s*,\s*["']([^"'${}]+)["']\s*,\s*(\{[\s\S]*?\})\s*\)/g,
    )) {
      const method = m[1];
      const path = m[2];
      let body;
      try {
        body = Function(`"use strict"; return (${m[3]});`)();
      } catch {
        try {
          body = JSON.parse(m[3]);
        } catch {
          continue;
        }
      }
      if (!body || typeof body !== "object") continue;
      out.push({
        method,
        path,
        template: path,
        body,
        source: `batches/${name}`,
        hasParams: false,
        tier: "batch-mut",
      });
    }
  }
  // Dedupe by method+path
  const seen = new Set();
  return out.filter((t) => {
    const k = exactKey(t.method, t.path);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Literal fillers for non-id path params (not secrets). */
const LITERAL_PARAM_FILL = {
  query: "radio",
  bundletype: "standard",
  type: "standard",
  category: "Radio Equipment",
  status: "active",
  email: "demo@wisptools.io",
};

/** Extra list endpoints when stripping the last :param is wrong. */
const LIST_PATH_OVERRIDES = {
  "/api/users/:userId": "/api/users",
  "/api/users/:userId/activity": "/api/users",
  "/api/network/sites/:id/sectors": "/api/network/sites",
  "/api/network/cpe/:id": "/api/network/cpe",
  "/api/network/sectors/:id": "/api/network/sectors",
  "/api/network/equipment/:id": "/api/network/equipment",
  "/api/network/hardware-deployments/:id": "/api/network/hardware-deployments",
  "/api/customers/:id": "/api/customers",
  "/api/inventory/:id": "/api/inventory",
  "/api/plans/:id": "/api/plans",
  "/api/plans/:id/features": "/api/plans",
  "/api/bundles/:id": "/api/bundles",
  "/api/work-orders/:id": "/api/work-orders",
  "/api/incidents/:id": "/api/incidents",
  "/api/notifications/:id": "/api/notifications",
  "/api/help-desk/:id": "/api/help-desk",
  "/api/installation-documentation/:id": "/api/installation-documentation",
  "/api/equipment-pricing/:id": "/api/equipment-pricing",
};

/**
 * Advance batch id: n10z → n11a → n11b … n11z → n12a
 * @param {string} id
 */
export function bumpBatchId(id) {
  const m = String(id).match(/^n(\d+)([a-z])$/i);
  if (!m) {
    const n = (Number(String(id).replace(/\D/g, "")) || 10) + 1;
    return `n${n}a`;
  }
  const num = Number(m[1]);
  const letter = m[2].toLowerCase();
  if (letter === "z") return `n${num + 1}a`;
  return `n${num}${String.fromCharCode(letter.charCodeAt(0) + 1)}`;
}

/**
 * Pick next ×10 targets: static GET → param GET → golden-mut → batch-mut.
 * @param {object} opts
 */
export function selectAutoTargets(opts = {}) {
  const backendRoot = resolveBackendRoot(opts);
  const state = opts.state || loadAutoState();
  const probedExact = new Set(state.exactPathsProbed || []);
  const probedPatterns = new Set(state.patternsProbed || []);
  const deps = opts.externalDeps || null;
  const goldens = opts.goldenBodies || loadGoldenBodies();
  const all = discoverExpressRoutes(backendRoot);

  /** @type {Array<object>} */
  const fresh = [];

  const pushIfFresh = (tier, route, extra = {}) => {
    if (isSkippedRoute(route.method, route.template)) return;
    const pk = patternKey(route.method, route.template);
    if (probedPatterns.has(pk)) return;
    if (!route.hasParams && probedExact.has(exactKey(route.method, route.template))) return;
    const risks = deps ? externalRiskForApiPath(route.template, deps) : [];
    fresh.push({
      tier,
      method: route.method,
      path: route.template,
      template: route.template,
      source: route.source,
      hasParams: route.hasParams,
      risks,
      ...extra,
    });
  };

  // Tier 1 — static GET
  for (const r of all) {
    if (r.method === "GET" && !r.hasParams) pushIfFresh("static-get", r);
  }
  // Tier 2 — param GET
  for (const r of all) {
    if (r.method === "GET" && r.hasParams) pushIfFresh("param-get", r);
  }
  // Tier 3 — mutations with golden body (POST/PUT/PATCH only; DELETE skipped)
  for (const r of all) {
    if (r.method === "GET") continue;
    if (r.method === "DELETE") continue;
    const body =
      goldens.get(patternKey(r.method, r.template)) ??
      [...goldens.entries()].find(([k]) => {
        const [m, p] = k.split(" ");
        if (m !== r.method) return false;
        const asPattern = p.replace(/\/[a-f0-9]{24}(?=\/|$)/gi, "/:id");
        return asPattern === r.template || p === r.template;
      })?.[1];
    if (body === undefined) continue;
    pushIfFresh("golden-mut", r, { body });
  }
  // Tier 4 — bodies harvested from prior hand-written deepen batches
  for (const h of harvestBatchMutationTargets()) {
    if (probedExact.has(exactKey(h.method, h.path))) continue;
    const pk = patternKey(h.method, h.path);
    if (probedPatterns.has(pk)) continue;
    if (isSkippedRoute(h.method, h.path)) continue;
    const risks = deps ? externalRiskForApiPath(h.path, deps) : [];
    fresh.push({
      tier: "batch-mut",
      method: h.method,
      path: h.path,
      template: h.path,
      source: h.source,
      hasParams: false,
      body: h.body,
      risks,
    });
  }

  const limit = opts.limit ?? BATCH_SIZE;
  const chosen = fresh.slice(0, limit);
  return {
    backendRoot,
    candidates: chosen,
    remainingAfter: Math.max(0, fresh.length - limit),
    totalFresh: fresh.length,
    byTier: {
      "static-get": fresh.filter((c) => c.tier === "static-get").length,
      "param-get": fresh.filter((c) => c.tier === "param-get").length,
      "golden-mut": fresh.filter((c) => c.tier === "golden-mut").length,
      "batch-mut": fresh.filter((c) => c.tier === "batch-mut").length,
    },
  };
}

/**
 * @param {object} report deepen batch report
 */
export function countImprovements(report, priorProbed) {
  const prior = new Set(priorProbed || []);
  /** @type {string[]} */
  const newlyGreen = [];
  /** @type {string[]} */
  const newlyTried = [];
  for (const p of report.probes || []) {
    const method = p.method || "GET";
    const path = p.path;
    if (!path) continue;
    const key = exactKey(method, path);
    newlyTried.push(key);
    const ok = p.ok === true || (p.status >= 200 && p.status < 300);
    if (ok && !prior.has(key) && !String(p.action || "").startsWith("skip")) {
      newlyGreen.push(key);
    }
  }
  return { newlyGreen, newlyTried, improvement: newlyGreen.length };
}

/**
 * Persist catalog advance after a successful auto round.
 */
export function updateCatalogAfterAutoRound(opts) {
  const catalog = loadCatalog();
  if (!catalog) throw new Error("missing deepen catalog");
  const { batchId, passStart, passEnd, passes, newlyGreen } = opts;

  catalog.batches = catalog.batches || [];
  if (!catalog.batches.some((b) => b.id === batchId)) {
    catalog.batches.push({
      id: batchId,
      passRange: [passStart, passEnd],
      status: "closed-harness-auto",
    });
  }
  catalog.passes = catalog.passes || [];
  for (const p of passes) {
    if (!catalog.passes.some((x) => x.id === p.id)) catalog.passes.push(p);
  }
  catalog.closedThroughPass = Math.max(catalog.closedThroughPass || 0, passEnd);
  catalog.nextBatchId = bumpBatchId(batchId);
  catalog.nextPassRange = [passEnd + 1, passEnd + BATCH_SIZE];
  catalog.desk = catalog.desk || {};
  catalog.desk.autoExhaust = {
    protocol: "scripts/lib/wisp-fidelity-deepen-auto.mjs",
    stopAfterNoImprovement: STOP_AFTER_NO_IMPROVEMENT,
    decision: "D6445",
    lastBatchId: batchId,
    lastImprovement: newlyGreen.length,
    stopRule: "only-after-3-consecutive-rounds-with-zero-new-green-exact-paths",
  };
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
  return catalog;
}

export function listPathForTemplate(template, tenantId) {
  const raw = String(template);
  if (LIST_PATH_OVERRIDES[raw]) {
    return LIST_PATH_OVERRIDES[raw].replace(/:tenantId\b|:tenant\b/gi, tenantId);
  }
  let t = raw.replace(/:tenantId\b|:tenant\b/gi, tenantId);
  const parts = t.split("/");
  while (parts.length && parts[parts.length - 1].startsWith(":")) parts.pop();
  return parts.join("/") || "/";
}

export function fillRouteTemplate(template, tenantId, ids = {}) {
  return String(template).replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => {
    const lower = name.toLowerCase();
    if (lower.includes("tenant")) return tenantId;
    if (LITERAL_PARAM_FILL[lower] != null) return LITERAL_PARAM_FILL[lower];
    if (ids[name] != null) return String(ids[name]);
    if (ids.id != null) return String(ids.id);
    return `missing-${name}`;
  });
}

function templateNeedsNonTenantId(template) {
  const params = [...String(template).matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) =>
    m[1].toLowerCase(),
  );
  return params.some((p) => !p.includes("tenant") && LITERAL_PARAM_FILL[p] == null);
}

/**
 * Shared auto probe runner (imported by generated batch modules).
 * @param {object} ctx harness ctx
 * @param {object[]} targets
 */
export async function runAutoProbes(ctx, targets) {
  const { probeDemo, firstIdDemo, tenantId, stamp } = ctx;
  const tid = tenantId || DEFAULT_TENANT_ID;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];
  for (const t of targets) {
    let path = t.template;
    if (t.hasParams) {
      const listGuess = listPathForTemplate(t.template, tid);
      const listKeys = [
        "data",
        "items",
        "results",
        "users",
        "sites",
        "customers",
        "plans",
        "bundles",
        "inventory",
        "devices",
        "rows",
        "workOrders",
        "incidents",
        "notifications",
        "equipment",
        "sectors",
        "cpe",
        "subscribers",
        "groups",
      ];
      let hit = await firstIdDemo(listGuess, listKeys);
      // Fallbacks for common mounts
      if (!hit?.id) {
        for (const alt of [
          listGuess.replace(/\/$/, ""),
          `/${listGuess.split("/").filter(Boolean).slice(0, 2).join("/")}`,
        ]) {
          if (!alt || alt === listGuess) continue;
          hit = await firstIdDemo(alt, listKeys);
          if (hit?.id) break;
        }
      }
      if (!hit?.id && templateNeedsNonTenantId(t.template)) {
        probes.push({
          pass: t.pass,
          method: t.method,
          path: t.template,
          template: t.template,
          action: "skip-no-id",
          listGuess,
          source: t.source || "auto-discover",
          tier: t.tier,
          risks: t.risks || [],
        });
        continue;
      }
      const ids = {
        id: hit?.id,
        userId: hit?.id,
        siteId: hit?.id,
        customerId: hit?.id,
        articleId: hit?.id,
        planId: hit?.id,
        bundleId: hit?.id,
        orderId: hit?.id,
        incidentId: hit?.id,
      };
      path = fillRouteTemplate(t.template, tid, ids);
      if (path.includes("missing-")) {
        probes.push({
          pass: t.pass,
          method: t.method,
          path,
          template: t.template,
          action: "skip-unresolved-param",
          source: t.source || "auto-discover",
          tier: t.tier,
          risks: t.risks || [],
        });
        continue;
      }
    }
    let body = t.body;
    if (body && typeof body === "object") {
      body = JSON.parse(JSON.stringify(body));
      for (const k of Object.keys(body)) {
        if (typeof body[k] === "string" && /trace|chrysalis|n10|stamp/i.test(body[k])) {
          body[k] = `${String(body[k]).replace(/\d{10,}/g, "")}${stamp}`;
        }
      }
    }
    probes.push({
      pass: t.pass,
      ...(await probeDemo(t.method, path, body)),
      template: t.template,
      source: t.source || "auto-discover",
      tier: t.tier,
      risks: t.risks || [],
    });
  }
  return probes;
}

/**
 * Write a thin harness batch module for reproducibility.
 */
export function writeAutoBatchModule(batchId, passStart, targets) {
  const file = join(scriptRoot, `scripts/lib/wisp-fidelity-deepen-batches/${batchId}.mjs`);
  const tiers = [...new Set(targets.map((t) => t.tier))].join("+");
  const clean = `/** Auto deepen batch ${batchId} — generated by wisp-fidelity-deepen-auto (D6445). */
import { runAutoProbes } from "../wisp-fidelity-deepen-auto.mjs";

export const BATCH_ID = ${JSON.stringify(batchId)};
export const KIND = ${JSON.stringify(`chrysalis.wisp.fidelity-deepen-${batchId}`)};
export const NEED_ADMIN = false;
export const NOTE = ${JSON.stringify(`Auto exhaust ${tiers} round ${batchId} (D6445)`)};
export const AUTO = true;
export const DEMO_TENANT = ${JSON.stringify(DEFAULT_TENANT_ID)};
export const PASSES = [
${targets.map((t, i) => `  { id: ${passStart + i}, title: ${JSON.stringify(`Auto ${t.method} ${t.template}`)} },`).join("\n")}
];
export const REFRESH_PATHS = ${JSON.stringify(
    [
      ...new Set(
        targets.map((t) => {
          const parts = t.template.split("/").filter(Boolean);
          return "/" + parts.slice(0, Math.min(2, parts.length)).join("/");
        }),
      ),
    ],
  )};
export const TARGETS = ${JSON.stringify(
    targets.map((t, i) => ({
      pass: passStart + i,
      method: t.method,
      template: t.template,
      path: t.template,
      source: t.source,
      tier: t.tier,
      hasParams: !!t.hasParams,
      risks: t.risks || [],
      ...(t.body !== undefined ? { body: t.body } : {}),
    })),
    null,
    2,
  )};

export async function runProbes(ctx) {
  return runAutoProbes(ctx, TARGETS);
}
`;
  writeFileSync(file, clean);
  return file;
}

/**
 * One auto round.
 */
export async function runAutoRound(opts = {}) {
  const catalog = loadCatalog();
  if (!catalog) throw new Error("missing catalog");
  const state = loadAutoState();
  const deps = opts.skipExternalDeps ? null : runExternalDepsProtocol();
  const batchId = catalog.nextBatchId || "n10z";
  const passStart = catalog.nextPassRange?.[0] || (catalog.closedThroughPass || 0) + 1;
  const selection = selectAutoTargets({
    state,
    externalDeps: deps,
    limit: opts.limit ?? BATCH_SIZE,
  });

  if (selection.candidates.length === 0) {
    const consecutiveNoImprovement = (state.consecutiveNoImprovement || 0) + 1;
    const nextState = saveAutoState({
      ...state,
      consecutiveNoImprovement,
      status:
        consecutiveNoImprovement >= STOP_AFTER_NO_IMPROVEMENT ? "exhausted" : "running",
      lastRound: {
        batchId,
        improvement: 0,
        reason: "no-fresh-routes",
        at: new Date().toISOString(),
      },
    });
    return {
      ok: true,
      batchId,
      improvement: 0,
      reason: "no-fresh-routes",
      totalFresh: 0,
      selection,
      exhaustedQueue: true,
      consecutiveNoImprovement: nextState.consecutiveNoImprovement,
      remainingFresh: 0,
      stop: nextState.consecutiveNoImprovement >= STOP_AFTER_NO_IMPROVEMENT,
    };
  }

  const targets = selection.candidates;
  const passEnd = passStart + targets.length - 1;
  writeAutoBatchModule(batchId, passStart, targets);

  const modPath = join(scriptRoot, `scripts/lib/wisp-fidelity-deepen-batches/${batchId}.mjs`);
  const mod = await import(`file:///${modPath.replace(/\\/g, "/")}?t=${Date.now()}`);

  const priorProbed = [...(state.exactPathsProbed || [])];
  const report = await runDeepenBatch({
    kind: mod.KIND,
    batchId: mod.BATCH_ID,
    passes: mod.PASSES,
    refreshPaths: mod.REFRESH_PATHS,
    needAdmin: false,
    runProbes: mod.runProbes,
    note: `${mod.NOTE}; remainingFresh=${selection.remainingAfter}; tiers=${JSON.stringify(selection.byTier)}`,
    opts: { ...(opts.batchOpts || {}), skipLiveRefresh: opts.skipLiveRefresh !== false },
  });

  for (let i = 0; i < (report.probes || []).length; i++) {
    const p = report.probes[i];
    if (!p.method && targets[i]) p.method = targets[i].method;
    if (!p.template && targets[i]) p.template = targets[i].template;
    if (!p.path && targets[i] && !targets[i].hasParams) p.path = targets[i].template;
  }

  const { newlyGreen, newlyTried, improvement } = countImprovements(report, priorProbed);

  const exactPathsProbed = [...new Set([...(state.exactPathsProbed || []), ...newlyTried])];
  const priorSkip = new Set(state.skipPatternsAttempted || []);
  const patternsProbed = new Set(state.patternsProbed || []);
  const skipPatternsAttempted = new Set(priorSkip);
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const pr = report.probes?.[i];
    const pk = patternKey(t.method, t.template);
    const skipped = String(pr?.action || "").startsWith("skip");
    if (skipped) {
      if (priorSkip.has(pk)) patternsProbed.add(pk); // second skip → burn
      else skipPatternsAttempted.add(pk);
    } else {
      patternsProbed.add(pk);
    }
  }
  const consecutiveNoImprovement =
    improvement > 0 ? 0 : (state.consecutiveNoImprovement || 0) + 1;

  const passes = targets.map((t, i) => {
    const pr = report.probes?.[i];
    const ok = pr?.ok === true || (pr?.status >= 200 && pr?.status < 300);
    const skipped = String(pr?.action || "").startsWith("skip");
    return {
      id: passStart + i,
      batch: batchId,
      title: `Auto ${t.method} ${t.template}`,
      status: ok ? "done" : skipped ? "skip" : "honest",
      apiPaths: [t.template.split("/").slice(0, 3).join("/") || t.template],
      exactPath: pr?.path || t.template,
      pattern: patternKey(t.method, t.template),
      source: t.source,
      tier: t.tier,
      ...(t.risks?.length ? { externalRisk: t.risks.join("; ") } : {}),
      ...(ok ? {} : { residual: skipped ? pr.action : `auto-${pr?.status || "fail"}` }),
    };
  });

  updateCatalogAfterAutoRound({
    batchId,
    passStart,
    passEnd,
    passes,
    newlyGreen,
  });

  const round = {
    batchId,
    passRange: [passStart, passEnd],
    improvement,
    newlyGreen,
    tried: newlyTried.length,
    remainingFresh: selection.remainingAfter,
    byTier: selection.byTier,
    at: new Date().toISOString(),
  };

  const nextState = saveAutoState({
    ...state,
    status: consecutiveNoImprovement >= STOP_AFTER_NO_IMPROVEMENT ? "exhausted" : "running",
    stopAfterNoImprovement: STOP_AFTER_NO_IMPROVEMENT,
    consecutiveNoImprovement,
    exactPathsProbed,
    patternsProbed: [...patternsProbed],
    skipPatternsAttempted: [...skipPatternsAttempted],
    rounds: [...(state.rounds || []), round].slice(-80),
    lastRound: round,
  });

  return {
    ok: report.ok !== false,
    batchId,
    passStart,
    passEnd,
    improvement,
    newlyGreen,
    consecutiveNoImprovement: nextState.consecutiveNoImprovement,
    remainingFresh: selection.remainingAfter,
    totalFreshBefore: selection.totalFresh,
    byTier: selection.byTier,
    reportPath: report.reportPath,
    stop: nextState.consecutiveNoImprovement >= STOP_AFTER_NO_IMPROVEMENT,
    exhaustedQueue: false,
  };
}

/**
 * Loop until 3 consecutive no-improvement rounds (only stop rule).
 * @param {object} [opts]
 */
export async function runUntilExhausted(opts = {}) {
  const maxRounds = opts.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const startedAt = new Date().toISOString();
  /** @type {object[]} */
  const rounds = [];
  let stopReason = "max-rounds";

  let st = loadAutoState();
  if (opts.resetStreak) {
    st = saveAutoState({
      ...st,
      consecutiveNoImprovement: 0,
      status: "running",
    });
  }
  const seeded = seedExactPathsFromHistory(st);
  st = saveAutoState({
    ...st,
    exactPathsProbed: seeded.exactPathsProbed,
    patternsProbed: seeded.patternsProbed,
    status: st.status === "exhausted" && opts.resetStreak ? "running" : st.status || "running",
  });

  for (let i = 0; i < maxRounds; i++) {
    const result = await runAutoRound(opts);
    rounds.push(result);
    console.log(
      JSON.stringify(
        {
          round: i + 1,
          batchId: result.batchId,
          improvement: result.improvement,
          consecutiveNoImprovement: result.consecutiveNoImprovement,
          remainingFresh: result.remainingFresh,
          byTier: result.byTier,
          stop: result.stop,
          reason: result.reason,
        },
        null,
        2,
      ),
    );

    if (result.stop) {
      stopReason =
        result.exhaustedQueue && result.consecutiveNoImprovement >= STOP_AFTER_NO_IMPROVEMENT
          ? `no-fresh-routes-x${STOP_AFTER_NO_IMPROVEMENT}`
          : `no-improvement-x${STOP_AFTER_NO_IMPROVEMENT}`;
      break;
    }
  }

  const finishedAt = new Date().toISOString();
  const summary = {
    kind: AUTO_KIND,
    schemaVersion: AUTO_SCHEMA,
    ok: true,
    startedAt,
    finishedAt,
    stopReason,
    stopAfterNoImprovement: STOP_AFTER_NO_IMPROVEMENT,
    roundsRun: rounds.length,
    totalImprovement: rounds.reduce((n, r) => n + (r.improvement || 0), 0),
    rounds: rounds.map((r) => ({
      batchId: r.batchId,
      improvement: r.improvement,
      consecutiveNoImprovement: r.consecutiveNoImprovement,
      remainingFresh: r.remainingFresh,
      byTier: r.byTier,
      reason: r.reason,
    })),
    statePath: autoStatePath,
    catalogPath,
  };

  const summaryPath = join(scriptRoot, "reports/wisp/fidelity-deepen-auto-exhaust.json");
  mkdirSync(dirname(summaryPath), { recursive: true });
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
  summary.summaryPath = summaryPath;
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  const resetStreak = args.includes("--reset-streak");
  const maxRounds = (() => {
    const i = args.indexOf("--max-rounds");
    return i >= 0 ? Number(args[i + 1]) || DEFAULT_MAX_ROUNDS : DEFAULT_MAX_ROUNDS;
  })();
  await runUntilExhausted({ resetStreak, maxRounds });
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-auto")) main();
