import type { HubNativeRoute } from "./schema.js";

// Gin / Echo: uppercase .GET|POST|…
const GO_GIN_VERB_RE = /\b([a-zA-Z_][\w]*)\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/g;
// Chi / Fiber (G10017): PascalCase .Get|Post|… — Fiber detected via isGoFiberSource in go-ast-ingest
const GO_CHI_VERB_RE = /\b([a-zA-Z_][\w]*)\.(Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*"([^"]+)"/g;
const GO_HANDLE_FUNC_RE = /\bhttp\.HandleFunc\s*\(\s*"([^"]+)"/g;
// Gorilla mux (G10018): r.HandleFunc("/path", h).Methods("GET") or Methods(http.MethodGet)
const GO_MUX_HANDLE_FUNC_RE =
  /\b([a-zA-Z_][\w]*)\.HandleFunc\s*\(\s*"([^"]+)"\s*,\s*[A-Za-z_][\w]*\s*\)(?:\s*\.\s*Methods\s*\(\s*([^)]*)\s*\))?/g;

const GO_HTTP_METHOD_CONST: Record<string, string> = {
  MethodGet: "GET",
  MethodPost: "POST",
  MethodPut: "PUT",
  MethodPatch: "PATCH",
  MethodDelete: "DELETE",
  MethodHead: "HEAD",
  MethodOptions: "OPTIONS",
};

/** True when source imports gofiber (secondary dialect; Gin remains Go ST). */
export function isGoFiberSource(source: string): boolean {
  return /github\.com\/gofiber\/fiber/.test(source);
}

/** True when source imports gorilla/mux (secondary dialect; Gin remains Go ST). */
export function isGoGorillaSource(source: string): boolean {
  return /github\.com\/gorilla\/mux/.test(source);
}

/**
 * Peel Methods("GET") / Methods(http.MethodGet) args; default GET when Methods omitted.
 */
export function parseGoMuxMethods(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) return ["GET"];
  const methods: string[] = [];
  const tokenRe = /"([^"]+)"|http\.(Method\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(raw)) !== null) {
    if (m[1] !== undefined) {
      methods.push(m[1].toUpperCase());
      continue;
    }
    const constName = m[2];
    if (constName && GO_HTTP_METHOD_CONST[constName]) {
      methods.push(GO_HTTP_METHOD_CONST[constName]);
    }
  }
  return methods.length > 0 ? methods : ["GET"];
}

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

  GO_MUX_HANDLE_FUNC_RE.lastIndex = 0;
  while ((m = GO_MUX_HANDLE_FUNC_RE.exec(source)) !== null) {
    const path = m[2] ?? "/";
    const methods = parseGoMuxMethods(m[3]);
    for (const method of methods) {
      push(method, path, m.index);
    }
  }

  GO_HANDLE_FUNC_RE.lastIndex = 0;
  while ((m = GO_HANDLE_FUNC_RE.exec(source)) !== null) {
    push("GET", m[1] ?? "/", m.index);
  }

  return routes;
}
