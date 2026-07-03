import type { HubNativeRoute } from "./schema.js";

const CSHARP_HTTP_ATTR_RE = /\[(Http(Get|Post|Put|Patch|Delete|Head|Options))\s*\(\s*"([^"]+)"\s*\)\]/gi;
const CSHARP_MAP_RE = /\bapp\.Map(Get|Post|Put|Delete|Patch)\s*\(\s*"([^"]+)"/gi;

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
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

  CSHARP_HTTP_ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CSHARP_HTTP_ATTR_RE.exec(source)) !== null) {
    push(m[2] ?? "Get", m[3] ?? "/", m.index);
  }

  CSHARP_MAP_RE.lastIndex = 0;
  while ((m = CSHARP_MAP_RE.exec(source)) !== null) {
    push(m[1] ?? "Get", m[2] ?? "/", m.index);
  }

  return routes;
}
