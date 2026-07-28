import type { HubNativeRoute } from "./schema.js";

// Gin / Echo: uppercase .GET|POST|…
const GO_GIN_VERB_RE = /\b([a-zA-Z_][\w]*)\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]+)"/g;
// Chi / Fiber (G10017) / Iris (G10038) / Beego (G10045): PascalCase .Get|Post|… — dialect via detectGoWebDialect
const GO_CHI_VERB_RE = /\b([a-zA-Z_][\w]*)\.(Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*"([^"]+)"/g;
const GO_HANDLE_FUNC_RE = /\bhttp\.HandleFunc\s*\(\s*"([^"]+)"/g;
// Gorilla mux (G10018): r.HandleFunc("/path", h).Methods("GET") or Methods(http.MethodGet)
const GO_MUX_HANDLE_FUNC_RE =
  /\b([a-zA-Z_][\w]*)\.HandleFunc\s*\(\s*"([^"]+)"\s*,\s*[A-Za-z_][\w]*\s*\)(?:\s*\.\s*Methods\s*\(\s*([^)]*)\s*\))?/g;
// Go 1.22+ net/http ServeMux (G10030): mux.HandleFunc("GET /path", h) or http.HandleFunc("GET /path", h)
const GO_SERVEMUX_HANDLE_FUNC_RE =
  /\b(?:http|[a-zA-Z_][\w]*)\.HandleFunc\s*\(\s*"(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[^"]*)"\s*,\s*[A-Za-z_][\w]*\s*\)/g;

const GO_HTTP_METHOD_CONST: Record<string, string> = {
  MethodGet: "GET",
  MethodPost: "POST",
  MethodPut: "PUT",
  MethodPatch: "PATCH",
  MethodDelete: "DELETE",
  MethodHead: "HEAD",
  MethodOptions: "OPTIONS",
};

const GO_SERVEMUX_METHOD_PATH =
  /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/.+)$/i;

/** True when source imports gofiber (secondary dialect; Gin remains Go ST). */
export function isGoFiberSource(source: string): boolean {
  return /github\.com\/gofiber\/fiber/.test(source);
}

/** True when source imports kataras/iris or calls iris.New (secondary dialect; Gin remains Go ST). */
export function isGoIrisSource(source: string): boolean {
  return /github\.com\/kataras\/iris/.test(source) || /\biris\.New\s*\(/.test(source);
}

/** True when source imports beego (v2 functional secondary dialect; Gin remains Go ST). */
export function isGoBeegoSource(source: string): boolean {
  return /github\.com\/beego\/beego/.test(source) || /github\.com\/astaxie\/beego/.test(source);
}

/** True when source imports gorilla/mux (secondary dialect; Gin remains Go ST). */
export function isGoGorillaSource(source: string): boolean {
  return /github\.com\/gorilla\/mux/.test(source);
}

/**
 * True when source uses Go 1.22+ `http.NewServeMux` (secondary dialect; Gin remains Go ST).
 */
export function isGoServeMuxSource(source: string): boolean {
  return /\bhttp\.NewServeMux\s*\(/.test(source);
}

/**
 * Peel `"METHOD /path"` ServeMux Go 1.22+ pattern strings.
 * @returns `[method, path]` or null
 */
export function parseGoServeMuxPattern(raw: string): [string, string] | null {
  const m = raw.match(GO_SERVEMUX_METHOD_PATH);
  if (!m) return null;
  return [m[1]!.toUpperCase(), m[2]!];
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

  // ServeMux Go 1.22+ method-in-pattern before Gorilla HandleFunc+Methods (G10030).
  GO_SERVEMUX_HANDLE_FUNC_RE.lastIndex = 0;
  while ((m = GO_SERVEMUX_HANDLE_FUNC_RE.exec(source)) !== null) {
    push(m[1] ?? "GET", m[2] ?? "/", m.index);
  }

  GO_MUX_HANDLE_FUNC_RE.lastIndex = 0;
  while ((m = GO_MUX_HANDLE_FUNC_RE.exec(source)) !== null) {
    const path = m[2] ?? "/";
    // Skip Go 1.22+ ServeMux patterns already peeled above.
    if (parseGoServeMuxPattern(path)) continue;
    const methods = parseGoMuxMethods(m[3]);
    for (const method of methods) {
      push(method, path, m.index);
    }
  }

  GO_HANDLE_FUNC_RE.lastIndex = 0;
  while ((m = GO_HANDLE_FUNC_RE.exec(source)) !== null) {
    const raw = m[1] ?? "/";
    const peeled = parseGoServeMuxPattern(raw);
    if (peeled) {
      push(peeled[0], peeled[1], m.index);
      continue;
    }
    push("GET", raw, m.index);
  }

  return routes;
}
