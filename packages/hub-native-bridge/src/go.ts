import type { HubNativeRoute } from "./schema.js";

// Gin / Echo / Buffalo (G10055): uppercase .GET|POST|…
const GO_GIN_VERB_RE = /\b([a-zA-Z_][\w]*)\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]*)"/g;
// Chi / Fiber (G10017) / Iris (G10038) / Beego (G10045) / Martini (G10056): PascalCase .Get|Post|… — dialect via detectGoWebDialect
const GO_CHI_VERB_RE = /\b([a-zA-Z_][\w]*)\.(Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*"([^"]*)"/g;
const GO_HANDLE_FUNC_RE = /\bhttp\.HandleFunc\s*\(\s*"([^"]+)"/g;
// Gorilla mux (G10018): r.HandleFunc("/path", h).Methods("GET") or Methods(http.MethodGet)
const GO_MUX_HANDLE_FUNC_RE =
  /\b([a-zA-Z_][\w]*)\.HandleFunc\s*\(\s*"([^"]+)"\s*,\s*[A-Za-z_][\w]*\s*\)(?:\s*\.\s*Methods\s*\(\s*([^)]*)\s*\))?/g;
// Go 1.22+ net/http ServeMux (G10030): mux.HandleFunc("GET /path", h) or http.HandleFunc("GET /path", h)
const GO_SERVEMUX_HANDLE_FUNC_RE =
  /\b(?:http|[a-zA-Z_][\w]*)\.HandleFunc\s*\(\s*"(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[^"]*)"\s*,\s*[A-Za-z_][\w]*\s*\)/g;

/**
 * Gin literal Group assign (G10066 / D6528): `g := r.Group("/prefix")` or nested `g2 := g.Group("/sub")`.
 * Captures middleware/extra args after the path so those bindings stay opaque (no invent).
 * Non-literal first arg (`Group(p)`) also marks the lhs opaque.
 */
const GO_GIN_GROUP_ASSIGN_RE =
  /\b([a-zA-Z_][\w]*)\s*:?=\s*([a-zA-Z_][\w]*)\.Group\s*\(\s*(?:"([^"]*)"|([^),\s"]+))\s*(?:,([\s\S]*?))?\)/g;

/** Chained `r.Group("/prefix").GET("/path", …)` — literal path only, no middleware args. */
const GO_GIN_GROUP_CHAIN_VERB_RE =
  /\b([a-zA-Z_][\w]*)\.Group\s*\(\s*"([^"]*)"\s*\)\s*\.\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"([^"]*)"/g;

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

/** True when source imports gobuffalo/buffalo (secondary dialect; Gin remains Go ST). */
export function isGoBuffaloSource(source: string): boolean {
  return /github\.com\/gobuffalo\/buffalo/.test(source) || /\bbuffalo\.New\s*\(/.test(source);
}

/** True when source imports go-martini/martini or calls martini.Classic (secondary dialect; Gin remains Go ST). */
export function isGoMartiniSource(source: string): boolean {
  return (
    /github\.com\/go-martini\/martini/.test(source) ||
    /github\.com\/codegangsta\/martini/.test(source) ||
    /\bmartini\.Classic\s*\(/.test(source)
  );
}

/**
 * True when source is a Revel controller (secondary dialect; Gin remains Go ST).
 * Route table lives in `conf/routes` — use {@link parseRevelConfRoutes}; do not invent router.GET.
 */
export function isGoRevelSource(source: string): boolean {
  return /github\.com\/revel\/revel/.test(source) || /\*revel\.Controller/.test(source);
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
 * Join Gin `Group` prefix + verb path (G10066). Empty relative keeps the prefix.
 */
export function joinGoGroupPath(prefix: string, methodPath: string): string {
  const p = String(prefix ?? "")
    .trim()
    .replace(/\/+$/, "");
  const m = String(methodPath ?? "").trim();
  if (!m || m === "/") {
    if (!p) return "/";
    return p.startsWith("/") ? p : `/${p}`;
  }
  const rel = m.replace(/^\/+/, "");
  if (!p) return m.startsWith("/") ? m : `/${rel}`;
  const base = p.startsWith("/") ? p : `/${p}`;
  return `${base}/${rel}`.replace(/\/{2,}/g, "/");
}

/**
 * Collect literal Gin `Group("/prefix")` bindings → receiver prefix map.
 * Non-literal Group / Group with middleware args → opaque (skip verb peels on that var).
 */
export function collectGoGinGroupPrefixes(source: string): {
  prefixes: Map<string, string>;
  opaque: Set<string>;
} {
  const prefixes = new Map<string, string>();
  const opaque = new Set<string>();
  // Source order so nested `inner := outer.Group(...)` sees outer's prefix.
  const matches: Array<{
    index: number;
    lhs: string;
    recv: string;
    litPath: string | undefined;
    nonLit: string | undefined;
    extra: string | undefined;
  }> = [];
  GO_GIN_GROUP_ASSIGN_RE.lastIndex = 0;
  let gm: RegExpExecArray | null;
  while ((gm = GO_GIN_GROUP_ASSIGN_RE.exec(source)) !== null) {
    matches.push({
      index: gm.index,
      lhs: gm[1] ?? "",
      recv: gm[2] ?? "",
      litPath: gm[3],
      nonLit: gm[4],
      extra: gm[5],
    });
  }
  matches.sort((a, b) => a.index - b.index);
  for (const m of matches) {
    if (!m.lhs) continue;
    if (m.nonLit !== undefined || (m.extra !== undefined && m.extra.trim() !== "")) {
      opaque.add(m.lhs);
      prefixes.delete(m.lhs);
      continue;
    }
    if (opaque.has(m.recv)) {
      opaque.add(m.lhs);
      prefixes.delete(m.lhs);
      continue;
    }
    const parent = prefixes.get(m.recv) ?? "";
    const joined = joinGoGroupPath(parent, m.litPath ?? "");
    prefixes.set(m.lhs, joined);
    opaque.delete(m.lhs);
  }
  return { prefixes, opaque };
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
  const { prefixes, opaque } = collectGoGinGroupPrefixes(source);

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

  function resolvePath(recv: string, rawPath: string): string | null {
    if (opaque.has(recv)) return null;
    const prefix = prefixes.get(recv);
    if (prefix !== undefined) return joinGoGroupPath(prefix, rawPath);
    return rawPath === "" ? "/" : rawPath;
  }

  // Chained Group("/p").GET("/q") before plain verbs (G10066).
  GO_GIN_GROUP_CHAIN_VERB_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = GO_GIN_GROUP_CHAIN_VERB_RE.exec(source)) !== null) {
    const recv = m[1] ?? "";
    if (opaque.has(recv)) continue;
    const parent = prefixes.get(recv) ?? "";
    const groupPath = joinGoGroupPath(parent, m[2] ?? "");
    const path = joinGoGroupPath(groupPath, m[4] ?? "");
    push(m[3] ?? "GET", path, m.index);
  }

  GO_GIN_VERB_RE.lastIndex = 0;
  while ((m = GO_GIN_VERB_RE.exec(source)) !== null) {
    const recv = m[1] ?? "";
    const path = resolvePath(recv, m[3] ?? "/");
    if (path === null) continue;
    push(m[2] ?? "GET", path, m.index);
  }

  GO_CHI_VERB_RE.lastIndex = 0;
  while ((m = GO_CHI_VERB_RE.exec(source)) !== null) {
    const recv = m[1] ?? "";
    const path = resolvePath(recv, m[3] ?? "/");
    if (path === null) continue;
    push(m[2] ?? "Get", path, m.index);
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

/**
 * Parse Revel `conf/routes` lines: `METHOD PATH Controller.Action` (ignore `#` comments).
 * Does not invent router.GET — path comes from the routes table only (G10114 / D6540).
 */
export function parseRevelConfRoutes(source: string): HubNativeRoute[] {
  const routes: HubNativeRoute[] = [];
  const seen = new Set<string>();
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i] ?? "";
    const hash = line.indexOf("#");
    if (hash >= 0) line = line.slice(0, hash);
    line = line.trim();
    if (!line) continue;
    const m = line.match(
      /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)\s+([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)\s*$/i,
    );
    if (!m) continue;
    const method = (m[1] ?? "GET").toUpperCase();
    const path = m[2] ?? "/";
    const controller = m[3] ?? "App";
    const action = m[4] ?? "Index";
    const key = `${method}:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({
      method,
      path,
      line: i + 1,
      name: `${controller}.${action}`,
    });
  }
  return routes;
}
