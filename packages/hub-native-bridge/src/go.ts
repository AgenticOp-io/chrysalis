import type { HubNativeRoute } from "./schema.js";

const GO_GIN_VERB_RE = /\b([a-zA-Z_][\w]*)\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/g;
const GO_CHI_VERB_RE = /\b([a-zA-Z_][\w]*)\.(Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*"([^"]+)"/g;
const GO_HANDLE_FUNC_RE = /\bhttp\.HandleFunc\s*\(\s*"([^"]+)"/g;

export function parseGoRoutes(source: string): HubNativeRoute[] {
  const routes: HubNativeRoute[] = [];
  const seen = new Set<string>();

  function push(method: string, path: string, index: number) {
    const key = `${method.toUpperCase()}:${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({
      method: method.toUpperCase(),
      path,
      line: source.slice(0, index).split("\n").length,
      name: `go_${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
    });
  }

  GO_GIN_VERB_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = GO_GIN_VERB_RE.exec(source)) !== null) {
    push(m[2] ?? "GET", m[3] ?? "/", m.index);
  }

  GO_CHI_VERB_RE.lastIndex = 0;
  while ((m = GO_CHI_VERB_RE.exec(source)) !== null) {
    push(m[2] ?? "Get", m[3] ?? "/", m.index);
  }

  GO_HANDLE_FUNC_RE.lastIndex = 0;
  while ((m = GO_HANDLE_FUNC_RE.exec(source)) !== null) {
    push("GET", m[1] ?? "/", m.index);
  }

  return routes;
}
