/**
 * Route matching for the chimera proxy.
 *
 * A route rule binds a method/path pattern to a target stack (`legacy` or
 * `modern`) and an operating mode. The pattern language is deliberately
 * tiny:
 *   - exact:    "/login"       matches only `/login`
 *   - prefix:   "/api/*"       matches `/api/...`
 *   - method:   "POST /posts"  binds to a specific HTTP method
 *
 * Globs stop at "*" — no variable segments or regex. If you need anything
 * fancier, write another rule.
 *
 * Rules are evaluated in order; the first match wins. This lets a migration
 * start with narrow `modern` overrides followed by a catch-all `legacy`
 * default.
 */

export type Target = "legacy" | "modern";

export type Mode = "legacy" | "cutover" | "shadow";

export interface RouteRule {
  /** Pattern. Either `"/path"` or `"METHOD /path"`. Supports trailing `*`. */
  readonly match: string;
  /** Stack this rule targets when in cutover mode. Ignored in legacy/shadow. */
  readonly target: Target;
}

export interface ChimeraConfig {
  readonly mode: Mode;
  readonly legacy: string; // e.g. http://127.0.0.1:18080
  readonly modern: string; // e.g. http://127.0.0.1:3000
  readonly rules: ReadonlyArray<RouteRule>;
  /**
   * Listen address. Defaults to 127.0.0.1. Use "0.0.0.0" to expose to the
   * network.
   */
  readonly host?: string;
  /**
   * Listen port. Defaults to `0` (kernel-assigned). `startChimera` reports
   * the actual port back via the returned handle.
   */
  readonly port?: number;
  /** Where to write shadow-mode diff reports (NDJSON). */
  readonly shadowLogDir?: string;
}

export interface CompiledRule {
  readonly methodFilter: string | null;
  readonly pathPrefix: string | null; // if ends with *
  readonly pathExact: string | null;
  readonly target: Target;
  readonly raw: RouteRule;
}

export function compileRules(rules: ReadonlyArray<RouteRule>): CompiledRule[] {
  const out: CompiledRule[] = [];
  for (const rule of rules) {
    const spaceIdx = rule.match.indexOf(" ");
    const methodFilter = spaceIdx > 0 ? rule.match.slice(0, spaceIdx).toUpperCase() : null;
    const path = spaceIdx > 0 ? rule.match.slice(spaceIdx + 1) : rule.match;
    if (path.endsWith("*")) {
      out.push({
        methodFilter,
        pathPrefix: path.slice(0, -1),
        pathExact: null,
        target: rule.target,
        raw: rule,
      });
    } else {
      out.push({
        methodFilter,
        pathPrefix: null,
        pathExact: path,
        target: rule.target,
        raw: rule,
      });
    }
  }
  return out;
}

export function routeFor(
  compiled: ReadonlyArray<CompiledRule>,
  method: string,
  path: string,
): CompiledRule | null {
  const m = method.toUpperCase();
  for (const r of compiled) {
    if (r.methodFilter && r.methodFilter !== m) continue;
    if (r.pathExact !== null && r.pathExact === path) return r;
    if (r.pathPrefix !== null && path.startsWith(r.pathPrefix)) return r;
  }
  return null;
}
