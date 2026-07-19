import type { Module, NodeId } from "@chrysalis/webir";

export interface CompiledCwlRoute {
  readonly routeNodeId: NodeId;
  readonly method: string;
  readonly pattern: string;
  readonly paramNames: readonly string[];
  readonly regex: RegExp;
}

export interface RouteMatch {
  readonly route: CompiledCwlRoute;
  readonly pathParams: Record<string, string>;
}

function compilePattern(pathPattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const parts = pathPattern.split("/").filter(Boolean);
  let regex = "^";
  if (!pathPattern.startsWith("/")) regex = "^/";
  else regex = "^/";
  for (const part of parts) {
    if (part.startsWith(":")) {
      paramNames.push(part.slice(1));
      regex += "([^/]+)/";
    } else {
      regex += `${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/`;
    }
  }
  regex = regex.replace(/\/$/, "") + "/?$";
  return { regex: new RegExp(regex), paramNames };
}

/** Per-segment specificity: static segment (0) beats `:param` (1). */
function segmentSpecificity(pattern: string): number[] {
  return pattern
    .split("/")
    .filter(Boolean)
    .map((part) => (part.startsWith(":") ? 1 : 0));
}

export function compileCwlRoutes(module: Module): CompiledCwlRoute[] {
  const routes: CompiledCwlRoute[] = [];
  for (const rootId of module.roots) {
    const node = module.nodes.get(rootId);
    if (!node || node.dialect !== "web.request" || node.op !== "route") continue;
    const attrs = node.attrs as { method?: string; path?: string };
    const method = String(attrs.method ?? "GET").toUpperCase();
    const pattern = String(attrs.path ?? "/");
    const { regex, paramNames } = compilePattern(pattern);
    routes.push({ routeNodeId: rootId, method, pattern, paramNames, regex });
  }
  // Static segments win over `:param` at the same position regardless of the
  // order routes appear in the source (/modules/inventory/bundles must not be
  // swallowed by /modules/inventory/:id). Stable sort preserves source order
  // for equally-specific patterns.
  routes.sort((a, b) => {
    const sa = segmentSpecificity(a.pattern);
    const sb = segmentSpecificity(b.pattern);
    const len = Math.max(sa.length, sb.length);
    for (let i = 0; i < len; i++) {
      const da = sa[i] ?? -1;
      const db = sb[i] ?? -1;
      if (da !== db) return da - db;
    }
    return 0;
  });
  return routes;
}

export function matchCwlRoute(
  routes: readonly CompiledCwlRoute[],
  method: string,
  pathname: string,
): RouteMatch | null {
  const m = method.toUpperCase();
  for (const route of routes) {
    if (route.method !== m && !(route.method === "GET" && m === "HEAD")) continue;
    const hit = route.regex.exec(pathname);
    if (!hit) continue;
    const pathParams: Record<string, string> = {};
    route.paramNames.forEach((name, i) => {
      pathParams[name] = decodeURIComponent(hit[i + 1] ?? "");
    });
    return { route, pathParams };
  }
  return null;
}
