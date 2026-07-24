/**
 * Go hub ingest — route parse via @chrysalis/hub-native-bridge; lift in-process.
 * Handler bodies are brace-bounded so later gin.H / JSON calls cannot bleed
 * into earlier routes (hub-flagship-go / D6448-ST cwl-api). Named Gin handlers
 * (`r.GET("/path", health)` → `func health(c *gin.Context)`) resolve beyond
 * anonymous lambdas (hub-go-routes). Chi (`chi.URLParam` + `json.NewEncoder`)
 * Echo (`c.Param` + `c.QueryParam` + `c.JSON`), Fiber (G10017:
 * `c.Params` + `c.Query` + `c.JSON` / `c.Status(n).JSON` / `c.SendString`),
 * Gorilla mux (G10018: `HandleFunc`+`Methods` + `mux.Vars` + `json.NewEncoder`),
 * and Go 1.22+ net/http ServeMux (G10030: `HandleFunc("METHOD /path")` + `r.PathValue`
 * + `json.NewEncoder`) secondary peels share the same route scan via `detectGoWebDialect`.
 */
import { parseGoRoutes } from "../../packages/hub-native-bridge/dist/go.js";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  lowerHubLiteral,
  lowerHubStatusOnly,
  hubOrigin,
  HUB_T,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { lowerHubDbQuery } from "./hub-native-sql-effects.mjs";

export { parseGoRoutes };

const LITERAL_RETURN_RE = /return\s+("([^"]*)"|'([^']*)'|true|false|-?\d+)\b/;
const GIN_STRING_RE = /c\.String\s*\(\s*(\d+)\s*,\s*"([^"]*)"\s*\)/;
const GIN_STATUS_RE = /c\.Status\s*\(\s*(\d+)\s*\)/;
const GIN_JSON_H_RE = /c\.JSON\s*\(\s*(\d+)\s*,\s*gin\.H\s*\{([\s\S]*?)\}\s*\)/;
const GIN_JSON_SCALAR_RE =
  /c\.JSON\s*\(\s*(\d+)\s*,\s*(?!gin\.H)(?:(true|false)|(-?\d+)|"([^"]*)"|(\w+))\s*\)/;
const GO_SQL_CALL_RE = /\w+\.(?:Query|QueryRow|Exec)\(\s*"([^"]+)"(?:\s*,\s*([^)]*))?\s*\)/g;
const GIN_H_PAIR_RE = /"([^"]+)"\s*:\s*(?:"([^"]*)"|(true|false|-?\d+)|(\w+))/g;
const GO_CHI_MAP_PAIR_RE = /"([^"]+)"\s*:\s*(?:"([^"]*)"|(true|false|-?\d+)|(\w+))/g;
const GO_CHI_JSON_MAP_RE =
  /json\.NewEncoder\s*\(\s*w\s*\)\.Encode\s*\(\s*map\[string\](?:interface\{\}|any)\s*\{([\s\S]*?)\}\s*\)/;
const GO_CHI_JSON_SCALAR_RE =
  /json\.NewEncoder\s*\(\s*w\s*\)\.Encode\s*\(\s*(?!map\[)(?:(true|false)|(-?\d+)|"([^"]*)"|(\w+))\s*\)/;
const GO_CHI_WRITE_STRING_RE = /io\.WriteString\s*\(\s*w\s*,\s*"([^"]*)"\s*\)/;
const ECHO_JSON_MAP_RE =
  /(?:return\s+)?c\.JSON\s*\(\s*(\d+)\s*,\s*map\[string\](?:interface\{\}|any)\s*\{([\s\S]*?)\}\s*\)/;
const ECHO_JSON_SCALAR_RE =
  /(?:return\s+)?c\.JSON\s*\(\s*(\d+)\s*,\s*(?!map\[)(?:(true|false)|(-?\d+)|"([^"]*)"|(\w+))\s*\)/;
const ECHO_STRING_RE = /(?:return\s+)?c\.String\s*\(\s*(\d+)\s*,\s*"([^"]*)"\s*\)/;
// Fiber (G10017): c.JSON(data) or chained c.Status(n).JSON(...) / c.SendString — not Gin/Echo two-arg form.
const FIBER_STATUS_JSON_PREFIX = String.raw`(?:return\s+)?c\.(?:Status\s*\(\s*(\d+)\s*\)\s*\.\s*)?`;
const FIBER_JSON_MAP_RE = new RegExp(
  FIBER_STATUS_JSON_PREFIX +
    String.raw`JSON\s*\(\s*(?:fiber\.Map|map\[string\](?:interface\{\}|any))\s*\{([\s\S]*?)\}\s*(?:,\s*"[^"]*")?\s*\)`,
);
const FIBER_JSON_SCALAR_RE = new RegExp(
  FIBER_STATUS_JSON_PREFIX +
    String.raw`JSON\s*\(\s*(?!fiber\.Map|map\[)(?:(true|false)|(-?\d+)|"([^"]*)"|(\w+))\s*(?:,\s*"[^"]*")?\s*\)`,
);
const FIBER_SEND_STRING_RE = new RegExp(
  FIBER_STATUS_JSON_PREFIX + String.raw`SendString\s*\(\s*"([^"]*)"\s*\)`,
);
const GO_HTTP_STATUS_CONST = {
  StatusOK: 200,
  StatusCreated: 201,
  StatusAccepted: 202,
  StatusNoContent: 204,
  StatusBadRequest: 400,
  StatusNotFound: 404,
};

/**
 * @param {string} language
 * @param {string} ext
 */
export function canGoAstIngest(language, ext) {
  return language === "go" && ext.toLowerCase() === ".go";
}

/**
 * @param {string} raw
 */
function parseGoLiteral(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  return raw;
}

/**
 * Extract the inner text of a balanced `{ ... }` starting at openIdx.
 * Skips quoted Go strings so braces inside literals do not confuse depth.
 * @param {string} source
 * @param {number} openIdx
 */
export function extractBalancedBraceInner(source, openIdx) {
  if (source[openIdx] !== "{") return null;
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === quote) break;
        i += 1;
      }
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return { inner: source.slice(openIdx + 1, i), end: i };
      }
    }
  }
  return null;
}

/**
 * Resolve a named Gin handler `func name(c *gin.Context) { ... }` (optionally
 * with a receiver) referenced from `r.GET("/path", name)`.
 * @param {string} source
 * @param {string} handlerName
 */
export function extractGoNamedGinHandlerBody(source, handlerName) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(handlerName)) return null;
  const defRe = new RegExp(
    String.raw`func\s+(?:\([^)]*\)\s+)?${handlerName}\s*\(\s*c\s*\*gin\.Context\s*\)\s*\{`,
  );
  const defM = source.match(defRe);
  if (!defM || defM.index === undefined) return null;
  const absOpen = defM.index + defM[0].lastIndexOf("{");
  const bal = extractBalancedBraceInner(source, absOpen);
  if (!bal) return null;
  const line = source.slice(0, absOpen).split("\n").length;
  return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end, named: handlerName };
}

/**
 * @param {string} source
 * @param {number} fromIndex — start of route registration line
 */
export function extractGoGinHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);
  // Prefer inline anonymous Gin lambdas (hub-flagship-go).
  const fnM = slice.match(/func\s*\(\s*c\s*\*gin\.Context\s*\)\s*\{/);
  if (fnM) {
    const openInSlice = (fnM.index ?? 0) + fnM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    const line = source.slice(0, absOpen).split("\n").length;
    return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end };
  }
  // Named handler refs: r.GET("/path", health) — resolve func health(...) { ... }.
  const namedM = slice.match(
    /\.(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"[^"]*"\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/,
  );
  if (!namedM) return null;
  return extractGoNamedGinHandlerBody(source, namedM[1]);
}

/**
 * @param {string} source
 */
export function isGoChiSource(source) {
  return /github\.com\/go-chi\/chi/.test(source);
}

/**
 * @param {string} source
 */
export function isGoEchoSource(source) {
  return /github\.com\/labstack\/echo/.test(source);
}

/**
 * Fiber secondary dialect (G10017 / D6479).
 * @param {string} source
 */
export function isGoFiberSource(source) {
  return /github\.com\/gofiber\/fiber/.test(source);
}

/**
 * Gorilla mux secondary dialect (G10018 / D6480).
 * @param {string} source
 */
export function isGoGorillaSource(source) {
  return /github\.com\/gorilla\/mux/.test(source);
}

/**
 * Go 1.22+ net/http ServeMux secondary dialect (G10030 / D6492).
 * @param {string} source
 */
export function isGoServeMuxSource(source) {
  return /\bhttp\.NewServeMux\s*\(/.test(source);
}

/**
 * @param {string} source
 * @returns {"chi" | "echo" | "fiber" | "gorilla" | "servemux" | "gin"}
 */
export function detectGoWebDialect(source) {
  if (isGoChiSource(source)) return "chi";
  if (isGoEchoSource(source)) return "echo";
  if (isGoFiberSource(source)) return "fiber";
  if (isGoGorillaSource(source)) return "gorilla";
  if (isGoServeMuxSource(source)) return "servemux";
  return "gin";
}

/**
 * Resolve a named Chi handler `func name(w http.ResponseWriter, r *http.Request) { ... }`.
 * @param {string} source
 * @param {string} handlerName
 */
export function extractGoNamedChiHandlerBody(source, handlerName) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(handlerName)) return null;
  const defRe = new RegExp(
    String.raw`func\s+(?:\([^)]*\)\s+)?${handlerName}\s*\(\s*w\s+http\.ResponseWriter\s*,\s*r\s*\*http\.Request\s*\)\s*\{`,
  );
  const defM = source.match(defRe);
  if (!defM || defM.index === undefined) return null;
  const absOpen = defM.index + defM[0].lastIndexOf("{");
  const bal = extractBalancedBraceInner(source, absOpen);
  if (!bal) return null;
  const line = source.slice(0, absOpen).split("\n").length;
  return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end, named: handlerName };
}

/**
 * @param {string} source
 * @param {number} fromIndex — start of route registration line
 */
export function extractGoChiHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);
  const fnM = slice.match(/func\s*\(\s*w\s+http\.ResponseWriter\s*,\s*r\s*\*http\.Request\s*\)\s*\{/);
  if (fnM) {
    const openInSlice = (fnM.index ?? 0) + fnM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    const line = source.slice(0, absOpen).split("\n").length;
    return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end };
  }
  const namedM = slice.match(
    /\.(?:Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*"[^"]*"\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/,
  );
  if (!namedM) return null;
  return extractGoNamedChiHandlerBody(source, namedM[1]);
}

/**
 * Resolve a named Echo handler `func name(c echo.Context) error { ... }`.
 * @param {string} source
 * @param {string} handlerName
 */
export function extractGoNamedEchoHandlerBody(source, handlerName) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(handlerName)) return null;
  const defRe = new RegExp(
    String.raw`func\s+(?:\([^)]*\)\s+)?${handlerName}\s*\(\s*c\s+echo\.Context\s*\)\s*error\s*\{`,
  );
  const defM = source.match(defRe);
  if (!defM || defM.index === undefined) return null;
  const absOpen = defM.index + defM[0].lastIndexOf("{");
  const bal = extractBalancedBraceInner(source, absOpen);
  if (!bal) return null;
  const line = source.slice(0, absOpen).split("\n").length;
  return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end, named: handlerName };
}

/**
 * @param {string} source
 * @param {number} fromIndex — start of route registration line
 */
export function extractGoEchoHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);
  const fnM = slice.match(/func\s*\(\s*c\s+echo\.Context\s*\)\s*error\s*\{/);
  if (fnM) {
    const openInSlice = (fnM.index ?? 0) + fnM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    const line = source.slice(0, absOpen).split("\n").length;
    return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end };
  }
  const namedM = slice.match(
    /\.(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*"[^"]*"\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/,
  );
  if (!namedM) return null;
  return extractGoNamedEchoHandlerBody(source, namedM[1]);
}

/**
 * Resolve a named Fiber handler `func name(c *fiber.Ctx) error { ... }` (G10017).
 * @param {string} source
 * @param {string} handlerName
 */
export function extractGoNamedFiberHandlerBody(source, handlerName) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(handlerName)) return null;
  const defRe = new RegExp(
    String.raw`func\s+(?:\([^)]*\)\s+)?${handlerName}\s*\(\s*c\s+\*fiber\.Ctx\s*\)\s*error\s*\{`,
  );
  const defM = source.match(defRe);
  if (!defM || defM.index === undefined) return null;
  const absOpen = defM.index + defM[0].lastIndexOf("{");
  const bal = extractBalancedBraceInner(source, absOpen);
  if (!bal) return null;
  const line = source.slice(0, absOpen).split("\n").length;
  return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end, named: handlerName };
}

/**
 * @param {string} source
 * @param {number} fromIndex — start of route registration line
 */
export function extractGoFiberHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);
  const fnM = slice.match(/func\s*\(\s*c\s+\*fiber\.Ctx\s*\)\s*error\s*\{/);
  if (fnM) {
    const openInSlice = (fnM.index ?? 0) + fnM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    const line = source.slice(0, absOpen).split("\n").length;
    return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end };
  }
  // Fiber uses Chi-style Get|Post verbs.
  const namedM = slice.match(
    /\.(?:Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*"[^"]*"\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/,
  );
  if (!namedM) return null;
  return extractGoNamedFiberHandlerBody(source, namedM[1]);
}

/**
 * Gorilla mux handlers share stdlib signature with Chi (G10018).
 * Resolve named `func name(w http.ResponseWriter, r *http.Request)` from
 * `r.HandleFunc("/path", name).Methods(...)`.
 * @param {string} source
 * @param {number} fromIndex — start of route registration line
 */
export function extractGoGorillaHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);
  const fnM = slice.match(/func\s*\(\s*w\s+http\.ResponseWriter\s*,\s*r\s*\*http\.Request\s*\)\s*\{/);
  if (fnM) {
    const openInSlice = (fnM.index ?? 0) + fnM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    const line = source.slice(0, absOpen).split("\n").length;
    return { bodySlice: bal.inner, line, absOpen, absEnd: bal.end };
  }
  const namedM = slice.match(
    /\.HandleFunc\s*\(\s*"[^"]*"\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/,
  );
  if (!namedM) return null;
  return extractGoNamedChiHandlerBody(source, namedM[1]);
}

/**
 * ServeMux Go 1.22+ handlers share stdlib signature with Chi/Gorilla (G10030).
 * Resolve named handlers from `mux.HandleFunc("GET /path", name)`.
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractGoServeMuxHandlerBody(source, fromIndex) {
  return extractGoGorillaHandlerBody(source, fromIndex);
}

/**
 * @param {string} bodySlice
 */
function parseGoChiWriteHeaderStatus(bodySlice) {
  const m = bodySlice.match(/w\.WriteHeader\s*\(\s*(?:(\d+)|http\.(Status\w+))\s*\)/);
  if (!m) return undefined;
  if (m[1] !== undefined) return Number.parseInt(m[1], 10);
  const name = m[2];
  if (name && GO_HTTP_STATUS_CONST[name] !== undefined) return GO_HTTP_STATUS_CONST[name];
  return undefined;
}

/**
 * @param {string} bodySlice
 */
function parseGoChiRefs(bodySlice) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*chi\.URLParam\s*\(\s*r\s*,\s*"([^"]+)"\s*\)/g)) {
    byVar[m[1]] = { source: "path", name: m[2] };
  }
  // Gorilla mux (G10018): id := mux.Vars(r)["id"]
  for (const m of bodySlice.matchAll(
    /(\w+)\s*:=\s*mux\.Vars\s*\(\s*r\s*\)\s*\[\s*"([^"]+)"\s*\]/g,
  )) {
    byVar[m[1]] = { source: "path", name: m[2] };
  }
  // vars := mux.Vars(r); id := vars["id"]
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*mux\.Vars\s*\(\s*r\s*\)/g)) {
    const varsName = m[1];
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(varsName)) continue;
    const idxRe = new RegExp(
      String.raw`(\w+)\s*:=\s*${varsName}\s*\[\s*"([^"]+)"\s*\]`,
      "g",
    );
    for (const m2 of bodySlice.matchAll(idxRe)) {
      byVar[m2[1]] = { source: "path", name: m2[2] };
    }
  }
  // ServeMux Go 1.22+ (G10030): id := r.PathValue("id")
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*r\.PathValue\s*\(\s*"([^"]+)"\s*\)/g)) {
    byVar[m[1]] = { source: "path", name: m[2] };
  }
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*r\.URL\.Query\(\)\.Get\s*\(\s*"([^"]+)"\s*\)/g)) {
    byVar[m[1]] = { source: "query", name: m[2], default: "" };
  }
  return byVar;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoChiMapEncode(bodySlice, byVar) {
  const m = bodySlice.match(GO_CHI_JSON_MAP_RE);
  if (!m) return null;
  const status = parseGoChiWriteHeaderStatus(bodySlice) ?? 200;
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  GO_CHI_MAP_PAIR_RE.lastIndex = 0;
  for (const pair of m[1].matchAll(GO_CHI_MAP_PAIR_RE)) {
    const key = pair[1];
    if (pair[2] !== undefined) {
      entries.push({ key, value: { t: "lit", v: pair[2] } });
      continue;
    }
    const word = pair[3] ?? pair[4];
    if (word === "true" || word === "false") {
      entries.push({ key, value: { t: "lit", v: word === "true" } });
    } else if (word && /^-?\d+$/.test(word)) {
      entries.push({ key, value: { t: "lit", v: Number.parseInt(word, 10) } });
    } else if (word && byVar[word]) {
      entries.push({ key, value: { t: "ref", ...byVar[word] } });
    } else {
      return null;
    }
  }
  if (entries.length === 0) return null;
  return { status, returnTree: { t: "obj", entries } };
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoChiJsonScalar(bodySlice, byVar) {
  const m = bodySlice.match(GO_CHI_JSON_SCALAR_RE);
  if (!m) return null;
  const status = parseGoChiWriteHeaderStatus(bodySlice) ?? 200;
  if (m[1] !== undefined) {
    return { status, kind: "lit", value: m[1] === "true" };
  }
  if (m[2] !== undefined) {
    return { status, kind: "lit", value: Number.parseInt(m[2], 10) };
  }
  if (m[3] !== undefined) {
    return { status, kind: "lit", value: m[3] };
  }
  const varName = m[4];
  if (varName && byVar[varName]) {
    return { status, kind: "ref", returnTree: { t: "ref", ...byVar[varName] } };
  }
  return null;
}

/**
 * @param {string} bodySlice
 */
function parseGoChiHandlerBody(bodySlice) {
  const byVar = parseGoChiRefs(bodySlice);
  const sqlEffects = parseGoSqlEffects(bodySlice, byVar);
  const mapEnc = parseGoChiMapEncode(bodySlice, byVar);
  const jsonScalar = mapEnc ? null : parseGoChiJsonScalar(bodySlice, byVar);
  const writeStr = !mapEnc && !jsonScalar ? bodySlice.match(GO_CHI_WRITE_STRING_RE) : null;
  const litRet = !mapEnc && !jsonScalar && !writeStr ? bodySlice.match(LITERAL_RETURN_RE) : null;
  const writeHeaderOnly =
    !mapEnc && !jsonScalar && !writeStr && !litRet && parseGoChiWriteHeaderStatus(bodySlice);

  if (mapEnc || sqlEffects.length > 0) {
    return {
      kind: "handler",
      sqlEffects,
      returnTree: mapEnc?.returnTree ?? null,
      status: mapEnc?.status,
    };
  }
  if (jsonScalar?.kind === "ref") {
    return {
      kind: "handler",
      sqlEffects: [],
      returnTree: jsonScalar.returnTree,
      status: jsonScalar.status,
    };
  }
  if (jsonScalar?.kind === "lit") {
    return { kind: "scalar", status: jsonScalar.status, value: jsonScalar.value };
  }
  if (writeStr) {
    return { kind: "scalar", status: 200, value: writeStr[1] };
  }
  if (writeHeaderOnly) {
    return { kind: "status", status: writeHeaderOnly };
  }
  if (litRet) {
    return { kind: "scalar", status: 200, value: parseGoLiteral(litRet[1]) };
  }
  return null;
}

/**
 * @param {string} bodySlice
 */
function parseGoEchoRefs(bodySlice) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*c\.Param\s*\(\s*"([^"]+)"\s*\)/g)) {
    byVar[m[1]] = { source: "path", name: m[2] };
  }
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*c\.QueryParam\s*\(\s*"([^"]+)"\s*\)/g)) {
    byVar[m[1]] = { source: "query", name: m[2], default: "" };
  }
  return byVar;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoEchoMapReturn(bodySlice, byVar) {
  const m = bodySlice.match(ECHO_JSON_MAP_RE);
  if (!m) return null;
  const status = Number.parseInt(m[1], 10);
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  GIN_H_PAIR_RE.lastIndex = 0;
  for (const pair of m[2].matchAll(GIN_H_PAIR_RE)) {
    const key = pair[1];
    if (pair[2] !== undefined) {
      entries.push({ key, value: { t: "lit", v: pair[2] } });
      continue;
    }
    const word = pair[3] ?? pair[4];
    if (word === "true" || word === "false") {
      entries.push({ key, value: { t: "lit", v: word === "true" } });
    } else if (word && /^-?\d+$/.test(word)) {
      entries.push({ key, value: { t: "lit", v: Number.parseInt(word, 10) } });
    } else if (word && byVar[word]) {
      entries.push({ key, value: { t: "ref", ...byVar[word] } });
    } else {
      return null;
    }
  }
  if (entries.length === 0) return null;
  return { status, returnTree: { t: "obj", entries } };
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoEchoJsonScalar(bodySlice, byVar) {
  const m = bodySlice.match(ECHO_JSON_SCALAR_RE);
  if (!m) return null;
  const status = Number.parseInt(m[1], 10);
  if (m[2] !== undefined) {
    return { status, kind: "lit", value: m[2] === "true" };
  }
  if (m[3] !== undefined) {
    return { status, kind: "lit", value: Number.parseInt(m[3], 10) };
  }
  if (m[4] !== undefined) {
    return { status, kind: "lit", value: m[4] };
  }
  const varName = m[5];
  if (varName && byVar[varName]) {
    return { status, kind: "ref", returnTree: { t: "ref", ...byVar[varName] } };
  }
  return null;
}

/**
 * @param {string} bodySlice
 */
function parseGoEchoHandlerBody(bodySlice) {
  const byVar = parseGoEchoRefs(bodySlice);
  const sqlEffects = parseGoSqlEffects(bodySlice, byVar);
  const jsonMap = parseGoEchoMapReturn(bodySlice, byVar);
  const jsonScalar = jsonMap ? null : parseGoEchoJsonScalar(bodySlice, byVar);
  const echoStr = !jsonMap && !jsonScalar ? bodySlice.match(ECHO_STRING_RE) : null;
  const litRet = !jsonMap && !jsonScalar && !echoStr ? bodySlice.match(LITERAL_RETURN_RE) : null;

  if (jsonMap || sqlEffects.length > 0) {
    return {
      kind: "handler",
      sqlEffects,
      returnTree: jsonMap?.returnTree ?? null,
      status: jsonMap?.status,
    };
  }
  if (jsonScalar?.kind === "ref") {
    return {
      kind: "handler",
      sqlEffects: [],
      returnTree: jsonScalar.returnTree,
      status: jsonScalar.status,
    };
  }
  if (jsonScalar?.kind === "lit") {
    return { kind: "scalar", status: jsonScalar.status, value: jsonScalar.value };
  }
  if (echoStr) {
    return { kind: "scalar", status: Number.parseInt(echoStr[1], 10), value: echoStr[2] };
  }
  if (litRet) {
    return { kind: "scalar", status: 200, value: parseGoLiteral(litRet[1]) };
  }
  return null;
}

/**
 * Fiber refs: c.Params("id"), c.Query("q"[, "default"]) — G10017.
 * @param {string} bodySlice
 */
function parseGoFiberRefs(bodySlice) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*c\.Params\s*\(\s*"([^"]+)"\s*\)/g)) {
    byVar[m[1]] = { source: "path", name: m[2] };
  }
  for (const m of bodySlice.matchAll(
    /(\w+)\s*:=\s*c\.Query\s*\(\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?\s*\)/g,
  )) {
    byVar[m[1]] = {
      source: "query",
      name: m[2],
      default: m[3] !== undefined ? m[3] : "",
    };
  }
  return byVar;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoFiberMapReturn(bodySlice, byVar) {
  const m = bodySlice.match(FIBER_JSON_MAP_RE);
  if (!m) return null;
  const status = m[1] !== undefined ? Number.parseInt(m[1], 10) : 200;
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  GIN_H_PAIR_RE.lastIndex = 0;
  for (const pair of m[2].matchAll(GIN_H_PAIR_RE)) {
    const key = pair[1];
    if (pair[2] !== undefined) {
      entries.push({ key, value: { t: "lit", v: pair[2] } });
      continue;
    }
    const word = pair[3] ?? pair[4];
    if (word === "true" || word === "false") {
      entries.push({ key, value: { t: "lit", v: word === "true" } });
    } else if (word && /^-?\d+$/.test(word)) {
      entries.push({ key, value: { t: "lit", v: Number.parseInt(word, 10) } });
    } else if (word && byVar[word]) {
      entries.push({ key, value: { t: "ref", ...byVar[word] } });
    } else {
      return null;
    }
  }
  if (entries.length === 0) return null;
  return { status, returnTree: { t: "obj", entries } };
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoFiberJsonScalar(bodySlice, byVar) {
  const m = bodySlice.match(FIBER_JSON_SCALAR_RE);
  if (!m) return null;
  const status = m[1] !== undefined ? Number.parseInt(m[1], 10) : 200;
  if (m[2] !== undefined) {
    return { status, kind: "lit", value: m[2] === "true" };
  }
  if (m[3] !== undefined) {
    return { status, kind: "lit", value: Number.parseInt(m[3], 10) };
  }
  if (m[4] !== undefined) {
    return { status, kind: "lit", value: m[4] };
  }
  const varName = m[5];
  if (varName && byVar[varName]) {
    return { status, kind: "ref", returnTree: { t: "ref", ...byVar[varName] } };
  }
  return null;
}

/**
 * @param {string} bodySlice
 */
function parseGoFiberHandlerBody(bodySlice) {
  const byVar = parseGoFiberRefs(bodySlice);
  const sqlEffects = parseGoSqlEffects(bodySlice, byVar);
  const jsonMap = parseGoFiberMapReturn(bodySlice, byVar);
  const jsonScalar = jsonMap ? null : parseGoFiberJsonScalar(bodySlice, byVar);
  const sendStr = !jsonMap && !jsonScalar ? bodySlice.match(FIBER_SEND_STRING_RE) : null;
  const litRet = !jsonMap && !jsonScalar && !sendStr ? bodySlice.match(LITERAL_RETURN_RE) : null;

  if (jsonMap || sqlEffects.length > 0) {
    return {
      kind: "handler",
      sqlEffects,
      returnTree: jsonMap?.returnTree ?? null,
      status: jsonMap?.status,
    };
  }
  if (jsonScalar?.kind === "ref") {
    return {
      kind: "handler",
      sqlEffects: [],
      returnTree: jsonScalar.returnTree,
      status: jsonScalar.status,
    };
  }
  if (jsonScalar?.kind === "lit") {
    return { kind: "scalar", status: jsonScalar.status, value: jsonScalar.value };
  }
  if (sendStr) {
    const status = sendStr[1] !== undefined ? Number.parseInt(sendStr[1], 10) : 200;
    return { kind: "scalar", status, value: sendStr[2] };
  }
  if (litRet) {
    return { kind: "scalar", status: 200, value: parseGoLiteral(litRet[1]) };
  }
  return null;
}

/**
 * @param {string} bodySlice
 */
function parseGoGinRefs(bodySlice) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*c\.Param\("([^"]+)"\)/g)) {
    byVar[m[1]] = { source: "path", name: m[2] };
  }
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*c\.(?:DefaultQuery|Query)\("([^"]+)"(?:,\s*"([^"]*)")?\)/g)) {
    byVar[m[1]] = {
      source: "query",
      name: m[2],
      ...(m[3] !== undefined ? { default: m[3] } : {}),
    };
  }
  for (const m of bodySlice.matchAll(/(\w+)\s*:=\s*c\.GetHeader\("([^"]+)"\)/g)) {
    byVar[m[1]] = { source: "header", name: m[2] };
  }
  for (const m of bodySlice.matchAll(/(\w+)(?:\s*,\s*_\s*)?\s*:=\s*c\.Cookie\("([^"]+)"\)/g)) {
    byVar[m[1]] = { source: "cookie", name: m[2] };
  }
  return byVar;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoGinHReturn(bodySlice, byVar) {
  const m = bodySlice.match(GIN_JSON_H_RE);
  if (!m) return null;
  const status = Number.parseInt(m[1], 10);
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  GIN_H_PAIR_RE.lastIndex = 0;
  for (const pair of m[2].matchAll(GIN_H_PAIR_RE)) {
    const key = pair[1];
    if (pair[2] !== undefined) {
      entries.push({ key, value: { t: "lit", v: pair[2] } });
      continue;
    }
    const word = pair[3] ?? pair[4];
    if (word === "true" || word === "false") {
      entries.push({ key, value: { t: "lit", v: word === "true" } });
    } else if (word && /^-?\d+$/.test(word)) {
      entries.push({ key, value: { t: "lit", v: Number.parseInt(word, 10) } });
    } else if (word && byVar[word]) {
      entries.push({ key, value: { t: "ref", ...byVar[word] } });
    } else {
      return null;
    }
  }
  if (entries.length === 0) return null;
  return { status, returnTree: { t: "obj", entries } };
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoJsonScalar(bodySlice, byVar) {
  const m = bodySlice.match(GIN_JSON_SCALAR_RE);
  if (!m) return null;
  const status = Number.parseInt(m[1], 10);
  if (m[2] !== undefined) {
    return { status, kind: "lit", value: m[2] === "true" };
  }
  if (m[3] !== undefined) {
    return { status, kind: "lit", value: Number.parseInt(m[3], 10) };
  }
  if (m[4] !== undefined) {
    return { status, kind: "lit", value: m[4] };
  }
  const varName = m[5];
  if (varName && byVar[varName]) {
    return { status, kind: "ref", returnTree: { t: "ref", ...byVar[varName] } };
  }
  return null;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} byVar
 */
function parseGoSqlEffects(bodySlice, byVar) {
  /** @type {{ sql: string, params: object[] }[]} */
  const effects = [];
  for (const m of bodySlice.matchAll(GO_SQL_CALL_RE)) {
    const sql = m[1];
    const rawParams = m[2]?.trim();
    /** @type {object[]} */
    const params = [];
    if (rawParams) {
      for (const part of rawParams.split(",")) {
        const p = part.trim();
        if (byVar[p]) {
          params.push({ t: "ref", ...byVar[p] });
        } else if (p === "true" || p === "false") {
          params.push({ t: "lit", v: p === "true" });
        } else if (/^-?\d+$/.test(p)) {
          params.push({ t: "lit", v: Number.parseInt(p, 10) });
        }
      }
    }
    effects.push({ sql, params });
  }
  return effects;
}

/**
 * @param {object} ctx
 * @param {{ sqlEffects: object[], returnTree: object | null, status?: number, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerGoHandlerBody(ctx, parsed, loc) {
  const { data, effect, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  /** @type {import('@chrysalis/webir').NodeId[]} */
  const statements = [];
  const status = parsed.status;
  if (typeof status === "number" && Number.isFinite(status) && status !== 200) {
    statements.push(
      effect.httpError({
        status,
        message: null,
        origin,
        provenance: [webir.provenance("hub-ingest", "go-ast:json-status")],
      }),
    );
  }
  for (const eff of parsed.sqlEffects) {
    statements.push(lowerHubDbQuery(ctx, eff, loc));
  }
  if (parsed.returnTree) {
    const valId = lowerHubReturnTree(ctx, parsed.returnTree, loc);
    if (valId !== null) {
      statements.push(
        data.call({
          callee: "__return_json",
          args: [valId],
          type: HUB_T.unknown,
          origin,
          provenance: [webir.provenance("hub-ingest", "return-tree:json")],
        }),
      );
    }
  }
  if (statements.length === 0) return null;
  return data.block({
    statements,
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "go-handler-body")],
  });
}

/**
 * Scalar lit + optional non-200 status (rare); 200 → text/plain literal like express/python.
 * @param {object} ctx
 * @param {number} status
 * @param {unknown} value
 * @param {{ file: string, line?: number }} loc
 */
function lowerGoScalarLit(ctx, status, value, loc) {
  if (typeof status !== "number" || !Number.isFinite(status) || status === 200) {
    return lowerHubLiteral(ctx, value, loc);
  }
  const { data, effect, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const type =
    typeof value === "string"
      ? HUB_T.string
      : typeof value === "boolean"
        ? HUB_T.bool
        : typeof value === "number"
          ? HUB_T.int
          : HUB_T.unknown;
  const statusId = effect.httpError({
    status,
    message: null,
    origin,
    provenance: [webir.provenance("hub-ingest", "go-ast:json-status")],
  });
  const litId = data.literal({
    value,
    type,
    origin,
    provenance: [webir.provenance("hub-ingest", "literal-return")],
  });
  return data.block({
    statements: [statusId, litId],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "go-scalar-lit-status")],
  });
}

/**
 * @param {object} opts
 */
export function liftGoFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseGoRoutes(source);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  const dialect = detectGoWebDialect(source);

  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const extracted =
      dialect === "chi" || dialect === "gorilla" || dialect === "servemux"
        ? dialect === "gorilla" || dialect === "servemux"
          ? dialect === "servemux"
            ? extractGoServeMuxHandlerBody(source, idx)
            : extractGoGorillaHandlerBody(source, idx)
          : extractGoChiHandlerBody(source, idx)
        : dialect === "echo"
          ? extractGoEchoHandlerBody(source, idx)
          : dialect === "fiber"
            ? extractGoFiberHandlerBody(source, idx)
            : extractGoGinHandlerBody(source, idx);
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(
        ctx,
        dialect === "chi"
          ? "hub-chi:handler-body"
          : dialect === "echo"
            ? "hub-echo:handler-body"
            : dialect === "fiber"
              ? "hub-fiber:handler-body"
              : dialect === "gorilla"
                ? "hub-gorilla:handler-body"
                : dialect === "servemux"
                  ? "hub-servemux:handler-body"
                  : "hub-go:handler-body",
        {
          file,
          line: r.line,
        },
      );
    } else if (dialect === "chi" || dialect === "gorilla" || dialect === "servemux") {
      // Gorilla/ServeMux reuse Chi stdlib JSON/WriteHeader peels;
      // mux.Vars / r.PathValue peels live in parseGoChiRefs.
      const holeTag =
        dialect === "gorilla"
          ? "hub-gorilla:handler-body"
          : dialect === "servemux"
            ? "hub-servemux:handler-body"
            : "hub-chi:handler-body";
      const { bodySlice, line } = extracted;
      const loc = { file, line };
      const parsed = parseGoChiHandlerBody(bodySlice);
      if (parsed?.kind === "handler") {
        bodyId =
          lowerGoHandlerBody(
            ctx,
            {
              sqlEffects: parsed.sqlEffects,
              returnTree: parsed.returnTree,
              status: parsed.status,
              line,
            },
            loc,
          ) ?? hubHandlerBodyHole(ctx, holeTag, loc);
      } else if (parsed?.kind === "scalar") {
        bodyId = lowerGoScalarLit(ctx, parsed.status ?? 200, parsed.value, loc);
      } else if (parsed?.kind === "status") {
        bodyId = lowerHubStatusOnly(ctx, parsed.status, loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, holeTag, loc);
      }
    } else if (dialect === "echo") {
      const { bodySlice, line } = extracted;
      const loc = { file, line };
      const parsed = parseGoEchoHandlerBody(bodySlice);
      if (parsed?.kind === "handler") {
        bodyId =
          lowerGoHandlerBody(
            ctx,
            {
              sqlEffects: parsed.sqlEffects,
              returnTree: parsed.returnTree,
              status: parsed.status,
              line,
            },
            loc,
          ) ?? hubHandlerBodyHole(ctx, "hub-echo:handler-body", loc);
      } else if (parsed?.kind === "scalar") {
        bodyId = lowerGoScalarLit(ctx, parsed.status ?? 200, parsed.value, loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-echo:handler-body", loc);
      }
    } else if (dialect === "fiber") {
      const { bodySlice, line } = extracted;
      const loc = { file, line };
      const parsed = parseGoFiberHandlerBody(bodySlice);
      if (parsed?.kind === "handler") {
        bodyId =
          lowerGoHandlerBody(
            ctx,
            {
              sqlEffects: parsed.sqlEffects,
              returnTree: parsed.returnTree,
              status: parsed.status,
              line,
            },
            loc,
          ) ?? hubHandlerBodyHole(ctx, "hub-fiber:handler-body", loc);
      } else if (parsed?.kind === "scalar") {
        bodyId = lowerGoScalarLit(ctx, parsed.status ?? 200, parsed.value, loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-fiber:handler-body", loc);
      }
    } else {
      const { bodySlice, line } = extracted;
      const loc = { file, line };
      const byVar = parseGoGinRefs(bodySlice);
      const sqlEffects = parseGoSqlEffects(bodySlice, byVar);
      const jsonH = parseGoGinHReturn(bodySlice, byVar);
      const jsonScalar = jsonH ? null : parseGoJsonScalar(bodySlice, byVar);
      const ginStr = !jsonH && !jsonScalar ? bodySlice.match(GIN_STRING_RE) : null;
      const ginStat = !jsonH && !jsonScalar && !ginStr ? bodySlice.match(GIN_STATUS_RE) : null;
      const litRet =
        !jsonH && !jsonScalar && !ginStr && !ginStat ? bodySlice.match(LITERAL_RETURN_RE) : null;

      if (jsonH || sqlEffects.length > 0) {
        bodyId =
          lowerGoHandlerBody(
            ctx,
            {
              sqlEffects,
              returnTree: jsonH?.returnTree ?? null,
              status: jsonH?.status,
              line,
            },
            loc,
          ) ?? hubHandlerBodyHole(ctx, "hub-go:handler-body", loc);
      } else if (jsonScalar?.kind === "ref") {
        bodyId =
          lowerGoHandlerBody(
            ctx,
            {
              sqlEffects: [],
              returnTree: jsonScalar.returnTree,
              status: jsonScalar.status,
              line,
            },
            loc,
          ) ?? hubHandlerBodyHole(ctx, "hub-go:handler-body", loc);
      } else if (jsonScalar?.kind === "lit") {
        bodyId = lowerGoScalarLit(ctx, jsonScalar.status, jsonScalar.value, loc);
      } else if (ginStr) {
        const status = Number.parseInt(ginStr[1], 10);
        const value = ginStr[2];
        bodyId = lowerGoScalarLit(ctx, status, value, loc);
      } else if (ginStat) {
        bodyId = lowerHubStatusOnly(ctx, Number.parseInt(ginStat[1], 10), loc);
      } else if (litRet) {
        bodyId = lowerHubLiteral(ctx, parseGoLiteral(litRet[1]), loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-go:handler-body", loc);
      }
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
