import type { HubNativeRoute } from "./schema.js";

const RUBY_VERB_RE = /\b(get|post|put|patch|delete|head|options)\s+['"]([^'"]+)['"]/gi;

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

export function parseRubyRoutes(source: string): HubNativeRoute[] {
  const routes: HubNativeRoute[] = [];
  const seen = new Set<string>();
  RUBY_VERB_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RUBY_VERB_RE.exec(source)) !== null) {
    const method = (m[1] ?? "get").toUpperCase();
    const path = m[2] ?? "/";
    const key = `${method}:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({
      method,
      path,
      line: lineAt(source, m.index),
      name: `r_${routes.length}`,
    });
  }
  return routes;
}
