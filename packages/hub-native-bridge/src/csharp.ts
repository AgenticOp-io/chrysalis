import type { HubNativeRoute } from "./schema.js";

const CSHARP_MAP_RE = /\bapp\.Map(Get|Post|Put|Delete|Patch)\s*\(\s*"([^"]+)"/gi;
const CSHARP_HTTP_ATTR_RE =
  /\[(Http(Get|Post|Put|Patch|Delete|Head|Options))(?:\(\s*"([^"]*)"\s*\))?\]/gi;
const CSHARP_CLASS_RE = /(\[(?:[^\[\]]|\[[^\]]*\])*\]\s*)*public\s+(?:partial\s+)?class\s+\w+[^{]*\{/g;
const CSHARP_ROUTE_PREFIX_RE = /\[Route\s*\(\s*"([^"]*)"\s*\)\]/i;

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

/** Join controller [Route] prefix + [HttpGet] path (Nest-style). */
export function joinCsharpControllerPath(prefix: string, methodPath: string): string {
  const p = String(prefix ?? "")
    .trim()
    .replace(/\/+$/, "");
  const m = String(methodPath ?? "")
    .trim()
    .replace(/^\/+/, "");
  if (m.startsWith("/")) return m;
  if (!p && !m) return "/";
  if (!p) return `/${m}`;
  const base = p.startsWith("/") ? p : `/${p}`;
  if (!m) return base || "/";
  return `${base}/${m}`.replace(/\/{2,}/g, "/");
}

function routePrefixFromHeader(header: string): string {
  const m = header.match(CSHARP_ROUTE_PREFIX_RE);
  return m ? (m[1] ?? "") : "";
}

function classBodyEnd(source: string, openBraceIndex: number): number {
  let depth = 0;
  for (let i = openBraceIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return source.length;
}

function parseCsharpControllerRoutes(
  source: string,
): Array<HubNativeRoute & { index: number }> {
  /** @type {Array<HubNativeRoute & { index: number }>} */
  const routes = [];
  CSHARP_CLASS_RE.lastIndex = 0;
  let cls: RegExpExecArray | null;
  while ((cls = CSHARP_CLASS_RE.exec(source)) !== null) {
    const prefix = routePrefixFromHeader(cls[0] ?? "");
    const openBrace = cls.index + cls[0].length - 1;
    const bodyEnd = classBodyEnd(source, openBrace);
    const classBody = source.slice(openBrace + 1, bodyEnd);
    CSHARP_HTTP_ATTR_RE.lastIndex = 0;
    let http: RegExpExecArray | null;
    while ((http = CSHARP_HTTP_ATTR_RE.exec(classBody)) !== null) {
      const method = http[2] ?? "Get";
      const path = joinCsharpControllerPath(prefix, http[3] ?? "");
      const index = openBrace + 1 + http.index;
      routes.push({
        method: method.toUpperCase(),
        path,
        line: lineAt(source, index),
        name: `r_${routes.length}`,
        index,
      });
    }
  }
  return routes;
}

export function parseCsharpRoutes(source: string): HubNativeRoute[] {
  const routes: HubNativeRoute[] = [];
  const seen = new Set<string>();

  function push(method: string, path: string, index: number) {
    const key = `${method.toUpperCase()}:${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({
      method: method.toUpperCase(),
      path,
      line: lineAt(source, index),
      name: `r_${routes.length}`,
    });
  }

  for (const r of parseCsharpControllerRoutes(source)) {
    push(r.method, r.path, r.index ?? 0);
  }

  CSHARP_MAP_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CSHARP_MAP_RE.exec(source)) !== null) {
    push(m[1] ?? "Get", m[2] ?? "/", m.index);
  }

  return routes;
}
