import type { HubNativeRoute } from "./schema.js";

/** Sinatra: `get "/path"` — first string only. */
const RUBY_SINATRA_VERB_RE =
  /\b(get|post|put|patch|delete|head|options)\s+['"]([^'"]+)['"]/gi;

/**
 * Sinatra-contrib / Padrino-compatible: `namespace '/api' do` / `namespace :api do`
 * (G10073 / D6535). Optional parens. Conditions / helpers stay unwired.
 */
const RUBY_NAMESPACE_OPEN_RE =
  /\bnamespace\s*\(?\s*(?:['"]([^'"]+)['"]|:([A-Za-z_]\w*))\s*\)?\s+do\b/gi;

/**
 * Roda shallow: `r.get "path" do`, `r.get "items", String do |id|`,
 * `r.get "items", :id do |id|` (G10022). Nested `r.on` stays unwired.
 */
const RUBY_RODA_VERB_RE =
  /\b(?:[a-zA-Z_]\w*\.)?(get|post|put|patch|delete|head|options)\s+((?:['"][^'"]+['"]|String|Integer|Hash|:[A-Za-z_]\w*)(?:\s*,\s*(?:['"][^'"]+['"]|String|Integer|Hash|:[A-Za-z_]\w*))*)\s+do(?:\s*\|([^|]+)\|)?/gi;

/**
 * Rails route table (G10115 / D6540): `get "/path" => "ctrl#action"` or
 * `get "/path", to: "ctrl#action"`. No `resources` / `namespace` / `scope` macros.
 */
const RUBY_RAILS_ROUTE_RE =
  /\b(get|post|put|patch|delete|head|options)\s+['"]([^'"]+)['"]\s*(?:,\s*to:\s*['"]([^'#]+#[^'"]+)['"]|\s*=>\s*['"]([^'#]+#[^'"]+)['"])/gi;

export type RailsRouteTarget = HubNativeRoute & {
  readonly controller: string;
  readonly action: string;
};

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

/** True when source is a Roda app (secondary dialect; Sinatra remains Ruby ST). */
export function isRubyRodaSource(source: string): boolean {
  return (
    /\brequire\s+['"]roda['"]/.test(source) ||
    /\bclass\s+\w+\s*<\s*Roda\b/.test(source) ||
    /\broute\s+do\s*\|/.test(source)
  );
}

/**
 * True when source is a Rails `routes.draw` table (secondary; Sinatra remains Ruby ST).
 * G10115 / D6540 — route-table peel only (not full ActionController invent).
 */
export function isRubyRailsRoutesSource(source: string): boolean {
  return (
    /\bRails\.application\.routes\.draw\b/.test(source) ||
    (/\broutes\.draw\s+do\b/.test(source) &&
      /\b(?:get|post|put|patch|delete)\s+['"][^'"]+['"]\s*(?:,\s*to:\s*['"]|\s*=>\s*['"])\w+#/.test(
        source,
      ))
  );
}

/**
 * True when source is an ActionController class (bodies resolved from routes.rb).
 */
export function isRubyRailsControllerSource(source: string): boolean {
  return (
    /\bclass\s+\w+Controller\s*<\s*(?:ActionController::(?:Base|API)|ApplicationController)\b/.test(
      source,
    )
  );
}

/**
 * Parse Rails `get|post … "/path" => "ctrl#action"` / `to: "ctrl#action"` targets.
 */
export function parseRailsRouteTable(source: string): RailsRouteTarget[] {
  const routes: RailsRouteTarget[] = [];
  const seen = new Set<string>();
  RUBY_RAILS_ROUTE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RUBY_RAILS_ROUTE_RE.exec(source)) !== null) {
    const method = (m[1] ?? "get").toUpperCase();
    const pathRaw = m[2] ?? "/";
    const path = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;
    const target = (m[3] ?? m[4] ?? "").trim();
    const hash = target.indexOf("#");
    if (hash < 0) continue;
    const controller = target.slice(0, hash).trim();
    const action = target.slice(hash + 1).trim();
    if (!controller || !action) continue;
    const key = `${method}:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({
      method,
      path,
      line: lineAt(source, m.index),
      name: `r_${routes.length}`,
      controller,
      action,
    });
  }
  return routes;
}

/**
 * Join Sinatra `namespace '/api'` prefix + route path (same rules as JAX-RS / ASP.NET).
 * G10073 / D6535.
 */
export function joinSinatraNamespacePath(prefix: string, methodPath: string): string {
  const p = String(prefix ?? "")
    .trim()
    .replace(/\/+$/, "");
  const m = String(methodPath ?? "")
    .trim()
    .replace(/^\/+/, "");
  if (!p && !m) return "/";
  if (!p) return m.startsWith("/") ? m : `/${m}`;
  const base = p.startsWith("/") ? p : `/${p}`;
  if (!m) return base || "/";
  return `${base}/${m}`.replace(/\/{2,}/g, "/");
}

/**
 * Build a hub path from Roda matcher args + optional block captures.
 * `"health"` → `/health`; `"items", String` + `|id|` → `/items/:id`.
 */
export function buildRodaPath(matcherSrc: string, blockParams?: string): string {
  const captures = (blockParams ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let captureIdx = 0;
  const segments: string[] = [];

  const tokenRe = /['"]([^'"]+)['"]|:(?:[A-Za-z_]\w*)|String|Integer|Hash/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(matcherSrc)) !== null) {
    if (m[1] !== undefined) {
      const raw = m[1];
      for (const part of raw.split("/").filter(Boolean)) {
        segments.push(part.startsWith(":") ? part : part);
      }
    } else if (m[0].startsWith(":")) {
      segments.push(m[0]);
    } else {
      const name = captures[captureIdx] ?? "id";
      captureIdx += 1;
      segments.push(`:${name}`);
    }
  }

  if (segments.length === 0) return "/";
  return `/${segments.join("/")}`;
}

/**
 * Find the `end` that closes the `do` whose body starts at `bodyStart` (depth 1).
 * Tracks nested `do`/`end` only (gold handlers are do/end shaped).
 */
function findMatchingRubyEnd(source: string, bodyStart: number): number {
  let depth = 1;
  const tokenRe = /\bdo\b|\bend\b/gi;
  tokenRe.lastIndex = bodyStart;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(source)) !== null) {
    if (/^do$/i.test(m[0])) depth += 1;
    else {
      depth -= 1;
      if (depth === 0) return m.index;
    }
  }
  return -1;
}

/**
 * True when `at` is at do/end depth 0 relative to `from` (no open `do` in between).
 */
function isRubyDoDepthZero(source: string, from: number, at: number): boolean {
  let depth = 0;
  const tokenRe = /\bdo\b|\bend\b/gi;
  tokenRe.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(source)) !== null) {
    if (m.index >= at) break;
    if (/^do$/i.test(m[0])) depth += 1;
    else depth -= 1;
  }
  return depth === 0;
}

type NamespaceRegion = { start: number; end: number; prefix: string };

/**
 * Collect Sinatra `namespace … do … end` body ranges with joined prefixes (nested OK).
 */
function collectSinatraNamespaceRegions(source: string): NamespaceRegion[] {
  const regions: NamespaceRegion[] = [];

  function walk(from: number, to: number, outerPrefix: string) {
    RUBY_NAMESPACE_OPEN_RE.lastIndex = from;
    let m: RegExpExecArray | null;
    while ((m = RUBY_NAMESPACE_OPEN_RE.exec(source)) !== null) {
      if (m.index >= to) break;
      if (!isRubyDoDepthZero(source, from, m.index)) continue;
      const raw = (m[1] ?? m[2] ?? "").trim();
      if (!raw) continue;
      const bodyStart = m.index + m[0].length;
      if (bodyStart > to) break;
      const bodyEnd = findMatchingRubyEnd(source, bodyStart);
      if (bodyEnd < 0 || bodyEnd > to) {
        RUBY_NAMESPACE_OPEN_RE.lastIndex = bodyStart;
        continue;
      }
      const nsPath = raw.startsWith("/") ? raw : `/${raw}`;
      const prefix = joinSinatraNamespacePath(outerPrefix, nsPath);
      regions.push({ start: bodyStart, end: bodyEnd, prefix });
      walk(bodyStart, bodyEnd, prefix);
      RUBY_NAMESPACE_OPEN_RE.lastIndex = bodyEnd;
    }
  }

  walk(0, source.length, "");
  return regions;
}

function namespacePrefixAt(regions: NamespaceRegion[], index: number): string {
  let best = "";
  let bestLen = -1;
  for (const r of regions) {
    if (index >= r.start && index < r.end && r.prefix.length >= bestLen) {
      best = r.prefix;
      bestLen = r.prefix.length;
    }
  }
  return best;
}

export function parseRubyRoutes(source: string): HubNativeRoute[] {
  const routes: HubNativeRoute[] = [];
  const seen = new Set<string>();
  const roda = isRubyRodaSource(source);

  function push(method: string, path: string, index: number) {
    const key = `${method}:${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({
      method,
      path,
      line: lineAt(source, index),
      name: `r_${routes.length}`,
    });
  }

  // Rails routes.rb table — prefer controller#action targets over Sinatra do/end.
  if (isRubyRailsRoutesSource(source)) {
    for (const r of parseRailsRouteTable(source)) {
      const key = `${r.method}:${r.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      routes.push({
        method: r.method,
        path: r.path,
        line: r.line,
        name: r.name ?? `r_${routes.length}`,
      });
    }
    return routes;
  }

  if (roda) {
    RUBY_RODA_VERB_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = RUBY_RODA_VERB_RE.exec(source)) !== null) {
      const method = (m[1] ?? "get").toUpperCase();
      const path = buildRodaPath(m[2] ?? "", m[3]);
      push(method, path, m.index);
    }
    return routes;
  }

  const nsRegions = collectSinatraNamespaceRegions(source);
  RUBY_SINATRA_VERB_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RUBY_SINATRA_VERB_RE.exec(source)) !== null) {
    const prefix = namespacePrefixAt(nsRegions, m.index);
    const path = joinSinatraNamespacePath(prefix, m[2] ?? "/");
    push((m[1] ?? "get").toUpperCase(), path, m.index);
  }
  return routes;
}
