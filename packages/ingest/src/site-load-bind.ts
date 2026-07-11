/**
 * Bind traced API responses into CWL `load { }` blocks and hydrate demo HTML
 * (DESIGN D6366 extension, G9430).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  readCorpus,
  type HttpRequestEvent,
  type HttpResponseEvent,
  type TraceCorpus,
} from "@chrysalis/oracle";
import {
  extractCwlRouteBlock,
  listCwlPageGetPaths,
  patchCwlRouteBlockHtml,
} from "@chrysalis/emit-shared";
import { inferUiPageApiPath } from "./infer-ui-page-api-path.js";
import { DEFAULT_SHOWCASE_LOAD_BOOLS } from "./ui-markup-svelte-structural.js";

export const SITE_LOAD_BIND_REPORT_KIND = "chrysalis.site-load-bind.v1";
export const SITE_LOAD_BIND_REPORT_SCHEMA_VERSION = 1;

export interface TraceApiBinding {
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly body: unknown;
}

export interface SiteLoadBindRouteResult {
  readonly httpPath: string;
  readonly apiPath: string | null;
  readonly skip: string | null;
  readonly loadFieldsAdded: number;
  readonly htmlHydrated: boolean;
}

export interface BindSiteProjectLoadResult {
  readonly kind: typeof SITE_LOAD_BIND_REPORT_KIND;
  readonly schemaVersion: typeof SITE_LOAD_BIND_REPORT_SCHEMA_VERSION;
  readonly ok: boolean;
  readonly routes: readonly SiteLoadBindRouteResult[];
  readonly tracesIndexed: number;
}

/** Index first successful API response per `METHOD path` from a trace corpus. */
export function indexTracedApiResponses(corpus: TraceCorpus): Map<string, TraceApiBinding> {
  const index = new Map<string, TraceApiBinding>();
  for (const trace of corpus.traces) {
    let req: HttpRequestEvent | null = null;
    for (const ev of trace.events) {
      if (ev.type === "http.request") {
        req = ev;
      } else if (ev.type === "http.response" && req !== null) {
        const key = `${req.method.toUpperCase()} ${req.path}`;
        if (!index.has(key) && ev.status >= 200 && ev.status < 300) {
          index.set(key, {
            method: req.method.toUpperCase(),
            path: req.path,
            status: ev.status,
            body: parseTraceResponseBody(ev),
          });
        }
        req = null;
      }
    }
  }
  return index;
}

function parseTraceResponseBody(ev: HttpResponseEvent): unknown {
  const trimmed = ev.body.trim();
  if (trimmed.length === 0) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

/** Resolve the API path a page route loads from its CWL block. */
export function resolveRouteApiPath(routeBlock: string): string | null {
  const loadApi = /load\s*\{[^}]*\bapiPath:\s*"([^"]+)"/s.exec(routeBlock);
  if (loadApi?.[1] !== undefined) return loadApi[1];
  const htmlApi = /data-wisp-api="([^"]+)"/.exec(routeBlock);
  if (htmlApi?.[1] !== undefined) return htmlApi[1];
  return null;
}

function formatCwlLoadScalar(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value === "boolean") return value ? "true" : "false";
  return null;
}

/** Scalar fields from a traced API JSON body suitable for `load { }`. */
export function tracedApiLoadFields(body: unknown): Record<string, string> {
  const fields: Record<string, string> = {};
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return fields;
  }
  const obj = body as Record<string, unknown>;
  if (obj.stats !== null && typeof obj.stats === "object" && !Array.isArray(obj.stats)) {
    for (const [key, val] of Object.entries(obj.stats as Record<string, unknown>)) {
      const fmt = formatCwlLoadScalar(val);
      if (fmt !== null) fields[key] = fmt;
    }
  }
  for (const [key, val] of Object.entries(obj)) {
    if (key === "stats" || key === "items") continue;
    const fmt = formatCwlLoadScalar(val);
    if (fmt !== null) fields[`api_${key}`] = fmt;
  }
  const itemCount = Array.isArray(obj.items) ? obj.items.length : null;
  if (itemCount !== null) {
    fields.itemCount = String(itemCount);
  }
  return fields;
}

function mergeLoadBlock(routeBlock: string, fields: Record<string, string>): string | null {
  const loadRe = /load\s*\{([^}]*)\};/s;
  const m = loadRe.exec(routeBlock);
  if (!m) return null;
  const inner = m[1] ?? "";
  const additions: string[] = [];
  for (const [key, val] of Object.entries(fields)) {
    if (new RegExp(`\\b${key}\\s*:`).test(inner)) continue;
    additions.push(`${key}: ${val}`);
  }
  if (additions.length === 0) return null;
  const mergedInner = inner.trim().length > 0 ? `${inner.trim()}, ${additions.join(", ")}` : additions.join(", ");
  return routeBlock.replace(loadRe, `load { ${mergedInner} };`);
}

const STAT_LABELS = ["Active records", "Open alerts", "Pending tasks"] as const;

const INTERP_HOLE_RE =
  /<(?:span|div)\s+data-cwl-hole="legacy:markup-lift-svelte-interp"\s+data-cwl-hole-detail="([^"]*)"(?:\s[^>]*)?><\/(?:span|div)>/g;

/** Resolve a dotted path against a JSON-like value (G9490). */
export function resolveJsonPath(root: unknown, path: string): unknown {
  const trimmed = path.trim();
  if (!trimmed || trimmed.includes("(") || trimmed.includes("?") || trimmed.includes("|")) {
    return undefined;
  }
  const parts = trimmed.split(".");
  let cur: unknown = root;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(part);
      if (!Number.isInteger(idx)) return undefined;
      cur = cur[idx];
      continue;
    }
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function isTruthyHydrationValue(val: unknown): boolean {
  return val !== undefined && val !== null && val !== false && val !== 0 && val !== "";
}

/**
 * Resolve interp detail against a body — plain paths plus simple showcase formatters (G9730 / G9740 / G9750 / G9780).
 * Leaves complex expressions unresolved (§3 item 6).
 */
export function resolveInterpDetail(root: unknown, detail: string): unknown {
  let d = detail.trim();
  if (!d) return undefined;
  // Reject Svelte pipe filters (`|`) but allow `||` coalesce (G9780).
  if (/(^|[^|])\|([^|]|$)/.test(d) || d.includes("&&")) return undefined;

  // Coalesce: a || 'literal' || b (leftmost truthy)
  if (d.includes("||")) {
    const parts = d.split("||").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return undefined;
    let last: unknown;
    for (const part of parts) {
      if (/^'.*'$/.test(part) || /^".*"$/.test(part)) {
        const lit = part.slice(1, -1);
        if (lit) return lit;
        last = lit;
        continue;
      }
      const v = resolveInterpDetail(root, part);
      last = v;
      if (isTruthyHydrationValue(v)) return v;
    }
    return last;
  }

  // Simple ternary: cond ? 'a' : 'b' (G9750)
  const tern = /^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/.exec(d);
  if (tern && !tern[1]!.includes("?")) {
    const cond = evaluateIfDetail(tern[1]!.trim(), root);
    if (cond === null) return undefined;
    const pick = cond ? tern[2]!.trim() : tern[3]!.trim();
    if (/^'.*'$/.test(pick) || /^".*"$/.test(pick)) return pick.slice(1, -1);
    return resolveInterpDetail(root, pick);
  }

  // Percent: ((num / den) * 100).toFixed(n) (G9780)
  const pct = /^\(\((.+?)\s*\/\s*(.+?)\)\s*\*\s*100\)\.toFixed\((\d+)\)$/.exec(d);
  if (pct) {
    const num = Number(resolveInterpDetail(root, pct[1]!.trim()));
    const den = Number(resolveInterpDetail(root, pct[2]!.trim()));
    const digits = Number(pct[3]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return undefined;
    return ((num / den) * 100).toFixed(digits);
  }

  const call = /^(formatCurrency|formatDate|formatDateTime|formatNumber|String)\((.+)\)$/.exec(d);
  if (call) {
    const inner = call[2]!.trim();
    const val = resolveInterpDetail(root, inner);
    if (val === undefined || val === null) return undefined;
    if (call[1] === "formatCurrency") {
      const n = typeof val === "number" ? val : Number(val);
      return Number.isFinite(n) ? `$${n.toFixed(2)}` : String(val);
    }
    if (call[1] === "formatNumber") {
      const n = typeof val === "number" ? val : Number(val);
      return Number.isFinite(n) ? String(n) : String(val);
    }
    if (call[1] === "formatDate" || call[1] === "formatDateTime") {
      const raw = String(val);
      const t = Date.parse(raw);
      if (!Number.isFinite(t)) return raw;
      const dt = new Date(t);
      return call[1] === "formatDate"
        ? dt.toISOString().slice(0, 10)
        : dt.toISOString().replace("T", " ").slice(0, 19);
    }
    return String(val);
  }
  if (d.includes("(")) return undefined;
  // Svelte store prefix `$foo` → `foo` (G9750)
  if (d.startsWith("$")) d = d.slice(1);
  // Drop simple optional chaining for lookup: foo?.bar → foo.bar
  d = d.replace(/\?/g, "");
  // `arr.length` / `obj.field.length`
  if (d.endsWith(".length")) {
    const base = d.slice(0, -".length".length);
    const val = resolveJsonPath(root, base);
    if (Array.isArray(val)) return val.length;
    if (typeof val === "string") return val.length;
    return undefined;
  }
  return resolveJsonPath(root, d);
}

/** Showcase constants merged into every hydrate body (G9740) — static menus / tabs, not live truth. */
export const DEFAULT_SHOWCASE_HYDRATE_CONSTANTS: Readonly<Record<string, unknown>> = {
  activeTab: "customers",
  mapView: "geographic",
  step: 1,
  role: "platform_admin",
  brandName: "WISP Management",
  tenantName: "Demo Tenant",
  statuses: ["available", "online", "offline", "degraded", "pending"],
  categories: ["network", "billing", "support", "inventory"],
  categoryList: ["network", "billing", "support", "inventory"],
  availableTypes: ["cpe", "sector", "backhaul", "server"],
  modules: [
    {
      id: "customers",
      name: "Customers",
      status: "active",
      features: ["portal", "tickets"],
    },
    {
      id: "inventory",
      name: "Inventory",
      status: "active",
      features: ["assets", "bundles"],
    },
    {
      id: "monitoring",
      name: "Monitoring",
      status: "active",
      features: ["alerts", "graphs"],
    },
  ],
  MODULES: [
    {
      id: "customers",
      name: "Customers",
      status: "active",
      features: ["portal", "tickets"],
    },
    {
      id: "inventory",
      name: "Inventory",
      status: "active",
      features: ["assets", "bundles"],
    },
  ],
  FCAPS_CATEGORIES: ["fault", "config", "accounting", "performance", "security"],
  FCAPS_OPERATIONS: ["create", "read", "update", "delete"],
  adminFeatures: ["tenants", "billing", "users", "system"],
  networkDevices: [{ id: "nd-1", name: "Core Switch", status: "online" }],
  epcDevices: [{ id: "epc-1", name: "MME-1", status: "online" }],
  remoteAgents: [{ id: "agent-1", name: "Field Agent", status: "online", epc_id: "epc-1" }],
  currentTenant: {
    id: "t1",
    name: "Demo Tenant",
    displayName: "Demo Tenant",
    subdomain: "demo",
  },
  cpeDevices: [
    { id: "cpe-1", name: "Tower A CPE", status: "online" },
    { id: "cpe-2", name: "Tower B CPE", status: "degraded" },
  ],
  plans: [
    {
      id: "p1",
      name: "Residential 100",
      status: "active",
      price: 49.99,
      isPopular: true,
      features: ["100 Mbps", "Unlimited data"],
    },
    {
      id: "p2",
      name: "Business 500",
      status: "active",
      price: 149.99,
      isPopular: false,
      features: ["500 Mbps", "SLA"],
    },
  ],
  roles: [
    { id: "r1", name: "admin", status: "active" },
    { id: "r2", name: "operator", status: "active" },
  ],
  alerts: [
    { id: "a1", name: "High latency", status: "open", severity: "warning" },
    { id: "a2", name: "CPE offline", status: "open", severity: "critical" },
  ],
  featureFlags: {
    tickets: true,
    billing: true,
    knowledge: true,
    faq: true,
    serviceStatus: true,
  },
  pagination: { page: 1, pages: 2, total: 24, limit: 12 },
  customer: { firstName: "Alex", lastName: "Demo", email: "alex@example.com" },
  serviceInfo: { serviceStatus: "active", servicePlan: "Residential 100" },
  report: {
    summary: {
      totalTickets: 10,
      totalItems: 10,
      byStatus: { open: 4, closed: 5, pending: 1 },
      byCategory: { network: 3, billing: 2, support: 5 },
      slaCompliance: { onTime: 8, breached: 2 },
    },
  },
};

function formatHydrationText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return escapeHtml(String(value));
  }
  return null;
}

function collectHydrationLookup(body: unknown): Record<string, unknown> {
  const lookup: Record<string, unknown> = {};
  if (body === null || typeof body !== "object" || Array.isArray(body)) return lookup;
  const obj = body as Record<string, unknown>;
  Object.assign(lookup, obj);
  if (obj.stats !== null && typeof obj.stats === "object" && !Array.isArray(obj.stats)) {
    Object.assign(lookup, obj.stats as Record<string, unknown>);
  }
  if (Array.isArray(obj.items)) {
    lookup.itemCount = obj.items.length;
    lookup["items.length"] = obj.items.length;
  }
  // Alias common WISP collection names onto items when only one array is present.
  for (const key of [
    "customers",
    "devices",
    "cpeDevices",
    "plans",
    "tenants",
    "modules",
    "groups",
    "workOrders",
    "grants",
  ]) {
    if (Array.isArray(obj[key]) && !Array.isArray(obj.items)) {
      lookup.items = obj[key];
      lookup.itemCount = (obj[key] as unknown[]).length;
    }
  }
  return lookup;
}

/** Parse `{#each}` hole headers including keyed / Object.entries forms (G9730 / G9750). */
export function parseEachHeader(
  detail: string,
): {
  collection: string;
  itemName: string;
  objectEntries?: boolean;
  entryKeys?: readonly [string, string];
} | null {
  const trimmed = detail.trim();
  // Object.entries(report.summary.byStatus) as [status, count]
  const entries = /^Object\.entries\(([^)]+)\)\s+as\s+\[([a-zA-Z_][\w]*),\s*([a-zA-Z_][\w]*)\]/.exec(
    trimmed,
  );
  if (entries) {
    return {
      collection: entries[1]!.trim(),
      itemName: entries[2]!,
      objectEntries: true,
      entryKeys: [entries[2]!, entries[3]!],
    };
  }
  // "items as item (item.id)" or "customers as customer (customer._id || customer.customerId)"
  const keyed = /^([a-zA-Z_][\w.]*)\s+as\s+([a-zA-Z_][\w]*)\s*\(/.exec(trimmed);
  if (keyed) return { collection: keyed[1]!, itemName: keyed[2]! };
  // "labels as label, i"
  const withIndex = /^([a-zA-Z_][\w.]*)\s+as\s+([a-zA-Z_][\w]*)\s*,\s*[a-zA-Z_][\w]*$/.exec(trimmed);
  if (withIndex) return { collection: withIndex[1]!, itemName: withIndex[2]! };
  const plain = /^([a-zA-Z_][\w.]*)\s+as\s+([a-zA-Z_][\w]*)$/.exec(trimmed);
  if (!plain) return null;
  return { collection: plain[1]!, itemName: plain[2]! };
}

function resolveEachCollection(
  body: unknown,
  lookup: Record<string, unknown>,
  parsed: NonNullable<ReturnType<typeof parseEachHeader>>,
): unknown[] | null {
  const raw = resolveJsonPath(body, parsed.collection) ?? lookup[parsed.collection];
  if (parsed.objectEntries) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
    const [kName, vName] = parsed.entryKeys ?? ["key", "value"];
    return Object.entries(raw as Record<string, unknown>).map(([k, v]) => ({
      [kName]: k,
      [vName]: v,
    }));
  }
  return Array.isArray(raw) ? raw : null;
}

function buildItemScope(
  item: unknown,
  itemName: string,
  parent: unknown,
): Record<string, unknown> {
  const scope: Record<string, unknown> = {};
  if (parent !== null && typeof parent === "object" && !Array.isArray(parent)) {
    Object.assign(scope, parent as Record<string, unknown>);
  }
  scope[itemName] = item;
  if (item !== null && typeof item === "object" && !Array.isArray(item)) {
    Object.assign(scope, item as Record<string, unknown>);
  }
  return scope;
}

function hydrateEachHoleInner(
  template: string,
  item: unknown,
  itemName: string,
  parent: unknown,
  nestedDepth: number,
): string {
  let out = template;
  out = out.replace(INTERP_HOLE_RE, (_m, detail: string) => {
    const d = String(detail).trim();
    if (d === itemName) {
      // Prefer own-key on entry objects (Object.entries rows) over stringifying the row.
      if (item !== null && typeof item === "object" && !Array.isArray(item) && d in item) {
        const t = formatHydrationText((item as Record<string, unknown>)[d]);
        if (t !== null) return t;
      }
      const t = formatHydrationText(item);
      if (t !== null) return t;
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        const obj = item as Record<string, unknown>;
        for (const key of ["name", "title", "label", "id", "value"]) {
          const prefer = formatHydrationText(obj[key]);
          if (prefer !== null) return prefer;
        }
      }
      return _m;
    }
    if (d.startsWith(`${itemName}.`)) {
      const t = formatHydrationText(resolveInterpDetail(item, d.slice(itemName.length + 1)));
      return t ?? _m;
    }
    // Object.entries rows expose both destructured names as own keys (G9750).
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      const t = formatHydrationText(resolveInterpDetail(item, d));
      if (t !== null) return t;
    }
    // Parent-scoped paths (e.g. report.summary.totalTickets in percent rows).
    const fromParent = formatHydrationText(resolveInterpDetail(parent, d));
    if (fromParent !== null) return fromParent;
    return _m;
  });
  const scoped = buildItemScope(item, itemName, parent);
  out = hydrateSimpleIfHoles(out, scoped);
  if (nestedDepth > 0) {
    out = expandEachHoles(out, scoped, nestedDepth - 1);
  }
  return out;
}

/** Expand `{#each}` holes when collection resolves and inners fully settle (G9740 / G9780). */
function expandEachHoles(html: string, body: unknown, nestedDepth: number): string {
  const lookup = collectHydrationLookup(body);
  const eachOpenGlobal =
    /<div\s+data-cwl-hole="legacy:markup-lift-svelte-each"\s+data-cwl-hole-detail="([^"]*)"(?:\s[^>]*)?>/g;
  let rebuilt = "";
  let cursor = 0;
  let em: RegExpExecArray | null;
  while ((em = eachOpenGlobal.exec(html)) !== null) {
    const detail = em[1] ?? "";
    const parsed = parseEachHeader(detail);
    const start = em.index;
    const afterOpen = start + em[0].length;
    let depth = 1;
    let i = afterOpen;
    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf("<div", i);
      const nextClose = html.indexOf("</div>", i);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 4;
      } else {
        depth -= 1;
        if (depth === 0) {
          const inner = html.slice(afterOpen, nextClose);
          const end = nextClose + "</div>".length;
          rebuilt += html.slice(cursor, start);
          if (parsed !== null) {
            const collection = resolveEachCollection(body, lookup, parsed);
            if (collection !== null && collection.length > 0) {
              const expanded = collection
                .slice(0, 50)
                .map((item) => hydrateEachHoleInner(inner, item, parsed.itemName, body, nestedDepth));
              // Only replace the each-hole when inners fully resolve — otherwise
              // N copies of residual interp holes inflate the census (G9740).
              const clean = expanded.every((chunk) => !chunk.includes("data-cwl-hole="));
              if (clean) {
                rebuilt += expanded.join("");
              } else {
                rebuilt += html.slice(start, end);
              }
            } else {
              rebuilt += html.slice(start, end);
            }
          } else {
            rebuilt += html.slice(start, end);
          }
          cursor = end;
          eachOpenGlobal.lastIndex = end;
          i = end;
          break;
        }
        i = nextClose + 6;
      }
    }
    if (depth !== 0) break;
  }
  rebuilt += html.slice(cursor);
  return rebuilt;
}

/** Widget shell → preferred JSON collection keys for showcase hydrate (G9730). */
export const WIDGET_SHELL_COLLECTION_KEYS: Readonly<Record<string, readonly string[]>> = {
  DeviceList: ["devices", "cpeDevices", "items"],
  CPEDeviceRow: ["devices", "cpeDevices", "items"],
  BandwidthPlans: ["plans", "bandwidthPlans", "items"],
  GroupManagement: ["groups", "items"],
  GrantStatus: ["grants", "items"],
  WorkOrderCard: ["workOrders", "items"],
  SNMPDevicesPanel: ["devices", "items"],
  DeviceManagementPanel: ["devices", "items"],
  LTEKPICards: ["stats", "kpis"],
  HSSStats: ["stats"],
  NetworkManager: ["sites", "towers", "items"],
  TowerManager: ["towers", "items"],
};

function isSurfaceStubBody(body: unknown): boolean {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return true;
  const obj = body as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return true;
  const onlyMeta = keys.every((k) =>
    ["ok", "surface", "resource", "op", "api_ok", "api_surface", "api_resource", "api_op"].includes(k),
  );
  return onlyMeta;
}

/**
 * Merge showcase hydrate sample JSON when the oracle trace is a surface stub (G9730).
 * Samples live under `hydrateSamplesDir/<api-path-slug>.json` (e.g. `api-customers.json`).
 */
export function mergeShowcaseHydrateBody(
  apiPath: string,
  body: unknown,
  hydrateSamplesDir: string | undefined,
): unknown {
  if (!hydrateSamplesDir || !existsSync(hydrateSamplesDir)) return body;
  if (!isSurfaceStubBody(body)) return body;
  const slug = apiPath.replace(/^\//, "").replace(/\//g, "-");
  const samplePath = join(hydrateSamplesDir, `${slug}.json`);
  if (!existsSync(samplePath)) return body;
  try {
    const sample = JSON.parse(readFileSync(samplePath, "utf8")) as unknown;
    if (sample === null || typeof sample !== "object") return body;
    if (body !== null && typeof body === "object" && !Array.isArray(body)) {
      return { ...(body as Record<string, unknown>), ...(sample as Record<string, unknown>) };
    }
    return sample;
  } catch {
    return body;
  }
}

function pickWidgetCollection(body: unknown, widgetName: string): unknown[] | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return null;
  const obj = body as Record<string, unknown>;
  const keys = WIDGET_SHELL_COLLECTION_KEYS[widgetName] ?? ["items"];
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val) && val.length > 0) return val;
    if (key === "stats" && val !== null && typeof val === "object" && !Array.isArray(val)) {
      return Object.entries(val as Record<string, unknown>).map(([k, v]) => ({ name: k, value: v }));
    }
  }
  return null;
}

function renderWidgetSummaryTable(widgetName: string, rows: unknown[]): string {
  const safe = widgetName.replace(/"/g, "'");
  const limited = rows.slice(0, 20);
  const trs = limited
    .map((row) => {
      if (row === null || typeof row !== "object") {
        return `<tr><td>${escapeHtml(String(row))}</td></tr>`;
      }
      const obj = row as Record<string, unknown>;
      const id = obj.id ?? obj._id ?? obj.name ?? obj.title ?? obj.label ?? "";
      const status = obj.status ?? obj.value ?? obj.email ?? "";
      return `<tr><td>${escapeHtml(String(id))}</td><td>${escapeHtml(String(status))}</td></tr>`;
    })
    .join("");
  return `<div class="cwl-widget-shell" data-cwl-widget-shell="${safe}" data-cwl-hydrated="1"><table class="cwl-widget-summary"><tbody>${trs}</tbody></table></div>`;
}

function hydrateWidgetShells(html: string, body: unknown): string {
  return html.replace(
    /<div\s+class="cwl-widget-shell"\s+data-cwl-widget-shell="([^"]+)"[^>]*><\/div>/g,
    (m, name: string) => {
      const rows = pickWidgetCollection(body, name);
      if (rows === null) return m;
      return renderWidgetSummaryTable(name, rows);
    },
  );
}

const IF_HOLE_OPEN_RE =
  /<div\s+data-cwl-hole="legacy:markup-lift-svelte-if"\s+data-cwl-hole-detail="([^"]*)"(?:\s[^>]*)?>/g;

/**
 * Evaluate a simple if-hole detail against hydrate body (G9740 / G9780).
 * Supports path/ident, !, === / !== string|number, `.length` cmp, numeric cmp, and && / || of those.
 */
export function evaluateIfDetail(detail: string, body: unknown): boolean | null {
  const d = detail.trim();
  if (!d) return null;

  if (d.includes("&&")) {
    const parts = d.split("&&").map((p) => p.trim());
    const vals = parts.map((p) => evaluateIfDetail(p, body));
    if (vals.some((v) => v === null)) return null;
    return vals.every(Boolean);
  }
  if (d.includes("||")) {
    const parts = d.split("||").map((p) => p.trim());
    const vals = parts.map((p) => evaluateIfDetail(p, body));
    if (vals.some((v) => v === null)) return null;
    return vals.some(Boolean);
  }

  if (d.startsWith("!")) {
    const inner = evaluateIfDetail(d.slice(1).trim(), body);
    return inner === null ? null : !inner;
  }

  const lenCmp = /^([a-zA-Z_$][\w.$]*)\.length\s*(===|!==|==|!=|>=|<=|>|<)\s*(\d+)$/.exec(d);
  if (lenCmp) {
    const arr = resolveInterpDetail(body, lenCmp[1]!);
    if (!Array.isArray(arr) && typeof arr !== "string") return null;
    const left = Array.isArray(arr) ? arr.length : (arr as string).length;
    const right = Number(lenCmp[3]);
    const op = lenCmp[2]!;
    if (op === "===" || op === "==") return left === right;
    if (op === "!==" || op === "!=") return left !== right;
    if (op === ">") return left > right;
    if (op === ">=") return left >= right;
    if (op === "<") return left < right;
    if (op === "<=") return left <= right;
    return null;
  }

  const numCmp = /^([a-zA-Z_$][\w.$]*)\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)$/.exec(d);
  if (numCmp) {
    const leftRaw = resolveInterpDetail(body, numCmp[1]!);
    const left = typeof leftRaw === "number" ? leftRaw : Number(leftRaw);
    if (!Number.isFinite(left)) return null;
    const right = Number(numCmp[3]);
    const op = numCmp[2]!;
    if (op === ">") return left > right;
    if (op === ">=") return left >= right;
    if (op === "<") return left < right;
    if (op === "<=") return left <= right;
    return null;
  }

  const cmp = /^([a-zA-Z_$][\w.$]*)\s*(===|!==|==|!=)\s*(.+)$/.exec(d);
  if (cmp) {
    const left = resolveInterpDetail(body, cmp[1]!);
    if (left === undefined) return null;
    let rightRaw = cmp[3]!.trim();
    let right: unknown = rightRaw;
    if (/^'.*'$/.test(rightRaw) || /^".*"$/.test(rightRaw)) right = rightRaw.slice(1, -1);
    else if (rightRaw === "true") right = true;
    else if (rightRaw === "false") right = false;
    else if (/^-?\d+(\.\d+)?$/.test(rightRaw)) right = Number(rightRaw);
    else {
      const via = resolveInterpDetail(body, rightRaw);
      if (via === undefined) return null;
      right = via;
    }
    const op = cmp[2]!;
    if (op === "===" || op === "==") return left === right;
    return left !== right;
  }

  if (d.includes("(")) return null;
  // Allow $store / optional chaining via resolveInterpDetail (G9750)
  const val = resolveInterpDetail(body, d);
  // Missing simple idents are falsy for showcase settle; dotted paths stay unknown.
  if (val === undefined) {
    const pathLike = d.replace(/^\$/, "").replace(/\?/g, "");
    return pathLike.includes(".") ? null : false;
  }
  return isTruthyHydrationValue(val);
}

/** Settle simple if-holes when the condition evaluates (G9730 / G9740). */
function hydrateSimpleIfHoles(html: string, body: unknown): string {
  let rebuilt = "";
  let cursor = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(IF_HOLE_OPEN_RE.source, "g");
  while ((m = re.exec(html)) !== null) {
    const detail = (m[1] ?? "").trim();
    const start = m.index;
    const afterOpen = start + m[0].length;
    let depth = 1;
    let i = afterOpen;
    let end = -1;
    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf("<div", i);
      const nextClose = html.indexOf("</div>", i);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 4;
      } else {
        depth -= 1;
        if (depth === 0) {
          end = nextClose + "</div>".length;
          break;
        }
        i = nextClose + 6;
      }
    }
    if (end < 0) break;
    const inner = html.slice(afterOpen, end - "</div>".length);
    rebuilt += html.slice(cursor, start);
    const keep = evaluateIfDetail(detail, body);
    if (keep === null) {
      rebuilt += html.slice(start, end);
    } else if (keep) {
      rebuilt += inner;
    }
    cursor = end;
    re.lastIndex = end;
  }
  rebuilt += html.slice(cursor);
  return rebuilt;
}

/**
 * Fill structural-shell markup holes from a traced API JSON body (G9490 / D6370 / G9730).
 * Replaces simple interp holes and expands `{collection as item}` each-holes when
 * the collection is a JSON array. Leaves complex expressions as holes (§3 item 6).
 */
export function hydrateStructuralHtmlFromApiBody(html: string, body: unknown): string {
  let out = html;
  const lookup = collectHydrationLookup(body);

  out = out.replace(INTERP_HOLE_RE, (m, detail: string) => {
    const d = String(detail).trim();
    if (Object.prototype.hasOwnProperty.call(lookup, d)) {
      const t = formatHydrationText(lookup[d]);
      return t ?? m;
    }
    const viaPath = formatHydrationText(resolveInterpDetail(body, d));
    return viaPath ?? m;
  });

  // Expand each-holes (nested depth 1) when inners fully settle (G9780).
  // Settle ifs before and after each so wrappers unwrap and residual ifs clear.
  out = hydrateSimpleIfHoles(out, body);
  out = expandEachHoles(out, body, 1);
  out = hydrateSimpleIfHoles(out, body);
  out = hydrateWidgetShells(out, body);
  return out;
}

/** Hydrate WISP demo stats + table rows from traced API body. */
export function hydrateDemoHtmlFromApiBody(html: string, body: unknown): string {
  let out = html;
  if (body !== null && typeof body === "object" && !Array.isArray(body)) {
    const obj = body as Record<string, unknown>;
    const stats = obj.stats;
    if (stats !== null && typeof stats === "object" && !Array.isArray(stats)) {
      const values = Object.values(stats as Record<string, unknown>).filter(
        (v) => typeof v === "number" || typeof v === "string",
      );
      const statBlocks = [...out.matchAll(/<article class="wisp-demo-stat"><strong>[^<]*<\/strong><span>[^<]*<\/span><\/article>/g)];
      for (let i = 0; i < Math.min(statBlocks.length, values.length); i++) {
        const block = statBlocks[i]?.[0];
        const val = values[i];
        const label = STAT_LABELS[i] ?? "Metric";
        if (block !== undefined && val !== undefined) {
          const replacement = `<article class="wisp-demo-stat"><strong>${String(val)}</strong><span>${label}</span></article>`;
          out = out.replace(block, replacement);
        }
      }
    }
    const items = obj.items;
    if (Array.isArray(items) && items.length > 0) {
      const rows = items
        .slice(0, 20)
        .map((item) => {
          if (item === null || typeof item !== "object") return "";
          const row = item as Record<string, unknown>;
          const id = row.id ?? row.ID ?? "";
          const name = row.name ?? row.title ?? "";
          const status = row.status ?? "";
          const updated = row.updated ?? row.updatedAt ?? "";
          return `<tr><td>${escapeHtml(String(id))}</td><td>${escapeHtml(String(name))}</td><td>${escapeHtml(String(status))}</td><td>${escapeHtml(String(updated))}</td></tr>`;
        })
        .join("");
      if (rows.length > 0) {
        out = out.replace(
          /<tbody><tr><td colspan="4">Loading…<\/td><\/tr><\/tbody>/,
          `<tbody>${rows}</tbody>`,
        );
      }
    }
  }
  // Always also apply structural-shell hydration (no-op when no hole markers).
  return hydrateStructuralHtmlFromApiBody(out, body);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Parse scalar entries from a CWL `load { … }` block for HTML hydration (G9500). */
export function parseCwlLoadScalars(routeBlock: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const m = /load\s*\{([^}]*)\}/s.exec(routeBlock);
  if (!m) return out;
  const inner = m[1] ?? "";
  for (const part of inner.split(",")) {
    const kv = /^\s*([a-zA-Z_][\w]*)\s*:\s*(.+?)\s*$/.exec(part.trim());
    if (!kv) continue;
    const key = kv[1]!;
    const raw = kv[2]!.trim();
    if (/^".*"$/.test(raw) || /^'.*'$/.test(raw)) {
      out[key] = raw.slice(1, -1);
    } else if (raw === "true") out[key] = true;
    else if (raw === "false") out[key] = false;
    else if (/^-?\d+(\.\d+)?$/.test(raw)) out[key] = Number(raw);
  }
  return out;
}

function patchRouteHtmlReturn(routeBlock: string, html: string): string | null {
  return patchCwlRouteBlockHtml(routeBlock, html);
}

export interface BindTracedLoadToCwlOptions {
  readonly cwlSource: string;
  readonly apiIndex: ReadonlyMap<string, TraceApiBinding>;
  /** Optional dir of showcase JSON samples merged when traces are surface stubs (G9730). */
  readonly hydrateSamplesDir?: string;
}

export interface BindTracedLoadToCwlResult {
  readonly text: string;
  readonly routes: readonly SiteLoadBindRouteResult[];
}

/** Patch `@page GET` routes with traced API data in `load { }` and optional HTML hydration. */
export function bindTracedLoadToCwlSource(opts: BindTracedLoadToCwlOptions): BindTracedLoadToCwlResult {
  let text = opts.cwlSource;
  const routes: SiteLoadBindRouteResult[] = [];

  for (const httpPath of listCwlPageGetPaths(text)) {
    const block = extractCwlRouteBlock(text, httpPath);
    if (block === null) {
      routes.push({ httpPath, apiPath: null, skip: "no-route-block", loadFieldsAdded: 0, htmlHydrated: false });
      continue;
    }
    const apiPath = resolveRouteApiPath(block);
    if (apiPath === null) {
      routes.push({ httpPath, apiPath: null, skip: "no-api-path", loadFieldsAdded: 0, htmlHydrated: false });
      continue;
    }
    const binding = opts.apiIndex.get(`GET ${apiPath}`);
    if (binding === undefined) {
      routes.push({ httpPath, apiPath, skip: "no-trace", loadFieldsAdded: 0, htmlHydrated: false });
      continue;
    }

    const fields = tracedApiLoadFields(binding.body);
    fields.tracedApiStatus = String(binding.status);
    const mergedLoad = mergeLoadBlock(block, fields);
    let patchedBlock = mergedLoad ?? block;
    const loadFieldsAdded = mergedLoad !== null ? Object.keys(fields).length : 0;
    let htmlHydrated = false;

    if (/\breturn\s+html\s+"/.test(patchedBlock)) {
      const htmlMatch = /return\s+html\s+"((?:\\.|[^"\\])*)"/s.exec(patchedBlock);
      if (htmlMatch?.[1] !== undefined) {
        const rawHtml = htmlMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
        // Merge load-block scalars into hydration lookup (G9500).
        const loadScalars = parseCwlLoadScalars(patchedBlock);
        const hydrateBody: Record<string, unknown> = {
          ...DEFAULT_SHOWCASE_HYDRATE_CONSTANTS,
          ...DEFAULT_SHOWCASE_LOAD_BOOLS,
          ...loadScalars,
        };
        const mergedBody = mergeShowcaseHydrateBody(apiPath, binding.body, opts.hydrateSamplesDir);
        if (mergedBody !== null && typeof mergedBody === "object" && !Array.isArray(mergedBody)) {
          Object.assign(hydrateBody, mergedBody as Record<string, unknown>);
        }
        const hydrated = hydrateDemoHtmlFromApiBody(rawHtml, hydrateBody);
        if (hydrated !== rawHtml) {
          const htmlPatched = patchRouteHtmlReturn(patchedBlock, hydrated);
          if (htmlPatched !== null) {
            patchedBlock = htmlPatched;
            htmlHydrated = true;
          }
        }
      }
    }

    if (patchedBlock === block && mergedLoad === null && !htmlHydrated) {
      // Idempotent: fields already present from a prior bind count as success.
      const alreadyBound =
        /\btracedApiStatus\s*:/.test(block) ||
        /\bactiveRecords\s*:/.test(block) ||
        /\bapi_ok\s*:/.test(block) ||
        /\bitemCount\s*:/.test(block);
      routes.push({
        httpPath,
        apiPath,
        skip: alreadyBound ? null : "load-merge-unchanged",
        loadFieldsAdded: alreadyBound ? Object.keys(fields).length : 0,
        htmlHydrated: false,
      });
      continue;
    }

    text = text.slice(0, text.indexOf(block)) + patchedBlock + text.slice(text.indexOf(block) + block.length);
    routes.push({ httpPath, apiPath, skip: null, loadFieldsAdded, htmlHydrated });
  }

  return { text, routes };
}

export interface SeedApiPathsIntoCwlOptions {
  readonly cwlSource: string;
  /** Override path→API inference. Defaults to {@link inferUiPageApiPath}. */
  readonly inferApiPath?: (httpPath: string) => string | null;
}

export interface SeedApiPathsIntoCwlResult {
  readonly text: string;
  readonly routesSeeded: number;
  readonly routesSkipped: number;
  readonly seededPaths: readonly string[];
}

/**
 * Insert `apiPath: "…"` into existing `load { }` blocks when missing, using
 * {@link inferUiPageApiPath} (or a custom inferrer). Enables G9430 bind on
 * pages that only had `path:` / `source:` metadata.
 */
export function seedApiPathsIntoCwlSource(opts: SeedApiPathsIntoCwlOptions): SeedApiPathsIntoCwlResult {
  const infer = opts.inferApiPath ?? inferUiPageApiPath;
  let text = opts.cwlSource;
  let routesSeeded = 0;
  let routesSkipped = 0;
  const seededPaths: string[] = [];

  for (const httpPath of listCwlPageGetPaths(text)) {
    const block = extractCwlRouteBlock(text, httpPath);
    if (block === null) {
      routesSkipped += 1;
      continue;
    }
    if (/\bapiPath\s*:/.test(block) || /data-wisp-api="/.test(block)) {
      routesSkipped += 1;
      continue;
    }
    const apiPath = infer(httpPath);
    if (apiPath === null) {
      routesSkipped += 1;
      continue;
    }
    const loadRe = /load\s*\{([^}]*)\};/s;
    const m = loadRe.exec(block);
    if (!m) {
      routesSkipped += 1;
      continue;
    }
    const inner = (m[1] ?? "").trim();
    const merged = inner.length > 0 ? `${inner}, apiPath: ${JSON.stringify(apiPath)}` : `apiPath: ${JSON.stringify(apiPath)}`;
    const patched = block.replace(loadRe, `load { ${merged} };`);
    const at = text.indexOf(block);
    if (at >= 0) {
      text = text.slice(0, at) + patched + text.slice(at + block.length);
    }
    routesSeeded += 1;
    seededPaths.push(httpPath);
  }

  return { text, routesSeeded, routesSkipped, seededPaths };
}

export interface BindSiteProjectLoadOptions {
  readonly tracesDir: string;
  readonly cwlPaths: readonly string[];
  /** When true (default), seed missing `apiPath` before bind (G9480). */
  readonly seedApiPaths?: boolean;
  /** Showcase hydrate samples when oracle traces are surface stubs (G9730). */
  readonly hydrateSamplesDir?: string;
  /** Secondary trace corpus merged under primary (G9750). */
  readonly fallbackTracesDir?: string;
}

/** Read traces and patch CWL files in place. */
export function bindSiteProjectLoadFromTraces(opts: BindSiteProjectLoadOptions): BindSiteProjectLoadResult {
  const corpus = readCorpus({ root: opts.tracesDir });
  const apiIndex = indexTracedApiResponses(corpus);
  // Optional secondary corpus (e.g. legacy stubs) — primary wins on key collision.
  if (opts.fallbackTracesDir) {
    try {
      const fallback = indexTracedApiResponses(readCorpus({ root: opts.fallbackTracesDir }));
      for (const [key, binding] of fallback) {
        if (!apiIndex.has(key)) apiIndex.set(key, binding);
      }
    } catch {
      /* optional */
    }
  }
  const routes: SiteLoadBindRouteResult[] = [];
  const seed = opts.seedApiPaths !== false;

  for (const cwlPath of opts.cwlPaths) {
    const original = readFileSync(cwlPath, "utf8");
    let source = original;
    if (seed) {
      source = seedApiPathsIntoCwlSource({ cwlSource: source }).text;
    }
    const bound = bindTracedLoadToCwlSource({
      cwlSource: source,
      apiIndex,
      ...(opts.hydrateSamplesDir ? { hydrateSamplesDir: opts.hydrateSamplesDir } : {}),
    });
    if (bound.text !== original) {
      writeFileSync(cwlPath, bound.text, "utf8");
    }
    routes.push(...bound.routes);
  }

  const boundCount = routes.filter((r) => r.skip === null).length;
  const softSkips = new Set(["no-api-path", "no-route-block", "no-trace"]);
  const hardFails = routes.filter((r) => r.skip !== null && !softSkips.has(r.skip));
  return {
    kind: SITE_LOAD_BIND_REPORT_KIND,
    schemaVersion: SITE_LOAD_BIND_REPORT_SCHEMA_VERSION,
    ok: hardFails.length === 0 && (boundCount > 0 || routes.every((r) => softSkips.has(r.skip ?? ""))),
    routes,
    tracesIndexed: apiIndex.size,
  };
}
