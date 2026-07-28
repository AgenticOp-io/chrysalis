/**
 * Java hub ingest — route parse via @chrysalis/hub-native-bridge; lift in-process.
 * Deepened for D6448-ST cwl-api flagship: brace-bounded method bodies, ResponseEntity
 * status+body, Map.of JSON, string/scalar/path-ref returns (hub-flagship-java).
 * Secondary: JAX-RS (G10012) + Micronaut @Controller/@Get|Post|… (G10020) peels —
 * HttpResponse.ok/status/created/accepted + @PathVariable/@QueryValue (no DI/filter invent).
 * Quarkus (G10034) reuses JAX-RS peels (jakarta.ws.rs.*); no CDI/RESTEasy/Panache invent.
 * Javalin (G10035): Javalin.create + app.get|post|…("/path", ctx -> …) + pathParam/queryParam
 * + status(n).json / json / result (no plugin/DI invent).
 * Spark Java (G10036 / D6498): spark.Spark.get|post|…("/path", (req, res) -> …) + :id paths +
 * req.params / req.queryParams + res.status / res.type + string/JSON returns (no filter invent).
 * Jooby (G10046 / D6508): new Jooby() {{ get("/path", ctx -> …); }} / app.get("/path", …) +
 * {id} + ctx.path / ctx.query + ctx.setResponseCode + Map/string returns (no module/mvc invent).
 * Vert.x Web (G10052 / D6514): Router.router(vertx) + router.get|post|…("/path").handler(ctx -> …)
 * + :id + pathParam/queryParam(+optional .get(0)) + ctx.json / setStatusCode / end — no EventBus invent.
 * Spring WebFlux RouterFunctions (G10061 / D6523): route(GET("/path"), req -> …) / .andRoute +
 * {id} + pathVariable / queryParam(+orElse) + ServerResponse.ok|status|accepted().bodyValue — no WebClient invent.
 */
import { parseJavaRoutes } from "../../packages/hub-native-bridge/dist/java.js";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { lowerHubDbQuery } from "./hub-native-sql-effects.mjs";
import { extractBalancedBraceInner } from "./go-ast-ingest.mjs";

export { parseJavaRoutes };

const JAVA_MAP_OF_RE = /Map\.of\s*\(([\s\S]*?)\)/;
const JAVA_SQL_CALL_RE = /\w+\.(?:query\w*|execute\w*)\(\s*"([^"]+)"(?:\s*,\s*([^)]*))?\s*\)/g;
const JAVA_HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
};

/**
 * @param {string} language
 * @param {string} ext
 */
export function canJavaAstIngest(language, ext) {
  return language === "java" && ext.toLowerCase() === ".java";
}

/**
 * @param {string} raw
 */
function parseLiteralToken(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return Number.parseFloat(raw);
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return null;
}

/**
 * @param {string} paramSource
 */
function parseJavaParamRefs(paramSource) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of paramSource.matchAll(/@PathVariable(?:\(([^)]*)\))?\s+\w+\s+(\w+)/g)) {
    const ann = (m[1] ?? "").trim();
    const varName = m[2];
    let name = varName;
    const positional = ann.match(/^"([^"]+)"/);
    if (positional) name = positional[1];
    else {
      const valueM = ann.match(/\bvalue\s*=\s*"([^"]+)"/);
      const nameM = ann.match(/\bname\s*=\s*"([^"]+)"/);
      if (valueM) name = valueM[1];
      else if (nameM) name = nameM[1];
    }
    byVar[varName] = { source: "path", name };
  }
  for (const m of paramSource.matchAll(/@PathParam(?:\(\s*"([^"]+)"\s*\))?\s+\w+\s+(\w+)/g)) {
    byVar[m[2]] = { source: "path", name: m[1] ?? m[2] };
  }
  for (const m of paramSource.matchAll(
    /@QueryParam(?:\(\s*"([^"]+)"\s*\))?\s+(?:@DefaultValue(?:\(\s*"([^"]*)"\s*\))\s+)?\w+\s+(\w+)/g,
  )) {
    byVar[m[3]] = {
      source: "query",
      name: m[1] ?? m[3],
      ...(m[2] !== undefined ? { default: m[2] } : {}),
    };
  }
  for (const m of paramSource.matchAll(/@RequestParam(?:\(([^)]*)\))?\s+\w+\s+(\w+)/g)) {
    const ann = m[1] ?? "";
    const varName = m[2];
    const nameM = ann.match(/name\s*=\s*"([^"]+)"/);
    const defM = ann.match(/defaultValue\s*=\s*"([^"]*)"/);
    byVar[varName] = {
      source: "query",
      name: nameM ? nameM[1] : varName,
      ...(defM ? { default: defM[1] } : {}),
    };
  }
  /** Micronaut @QueryValue (value / defaultValue) — parallel to Spring @RequestParam. */
  for (const m of paramSource.matchAll(/@QueryValue(?:\(([^)]*)\))?\s+\w+\s+(\w+)/g)) {
    const ann = (m[1] ?? "").trim();
    const varName = m[2];
    let name = varName;
    const positional = ann.match(/^"([^"]+)"/);
    if (positional) name = positional[1];
    else {
      const valueM = ann.match(/\bvalue\s*=\s*"([^"]+)"/);
      const nameM = ann.match(/\bname\s*=\s*"([^"]+)"/);
      if (valueM) name = valueM[1];
      else if (nameM) name = nameM[1];
    }
    const defM = ann.match(/\bdefaultValue\s*=\s*"([^"]*)"/);
    byVar[varName] = {
      source: "query",
      name,
      ...(defM ? { default: defM[1] } : {}),
    };
  }
  for (const m of paramSource.matchAll(/@RequestHeader(?:\(\s*"([^"]+)"\s*\))?\s+\w+\s+(\w+)/g)) {
    byVar[m[2]] = { source: "header", name: m[1] ?? m[2] };
  }
  for (const m of paramSource.matchAll(/@CookieValue(?:\(\s*"([^"]+)"\s*\))?\s+\w+\s+(\w+)/g)) {
    byVar[m[2]] = { source: "cookie", name: m[1] ?? m[2] };
  }
  return byVar;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseJavaSqlEffects(bodySlice, paramRefs) {
  /** @type {{ sql: string, params: object[] }[]} */
  const effects = [];
  for (const m of bodySlice.matchAll(JAVA_SQL_CALL_RE)) {
    const sql = m[1];
    const rawParams = m[2]?.trim();
    /** @type {object[]} */
    const params = [];
    if (rawParams) {
      for (const part of rawParams.split(",")) {
        const p = part.trim();
        if (paramRefs[p]) {
          params.push({ t: "ref", ...paramRefs[p] });
        } else {
          const lit = parseLiteralToken(p);
          if (lit !== null) params.push({ t: "lit", v: lit });
        }
      }
    }
    effects.push({ sql, params });
  }
  return effects;
}

/**
 * @param {string} mapInner
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseJavaMapOfReturnTree(mapInner, paramRefs) {
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of mapInner.matchAll(/"([^"]+)"\s*,\s*([^,\)]+)/g)) {
    const key = pair[1];
    const rawVal = pair[2].trim();
    if (rawVal === "true" || rawVal === "false") {
      entries.push({ key, value: { t: "lit", v: rawVal === "true" } });
    } else if (/^-?\d+$/.test(rawVal)) {
      entries.push({ key, value: { t: "lit", v: Number.parseInt(rawVal, 10) } });
    } else if (
      (rawVal.startsWith('"') && rawVal.endsWith('"')) ||
      (rawVal.startsWith("'") && rawVal.endsWith("'"))
    ) {
      entries.push({ key, value: { t: "lit", v: rawVal.slice(1, -1) } });
    } else if (paramRefs[rawVal]) {
      entries.push({ key, value: { t: "ref", ...paramRefs[rawVal] } });
    } else {
      const sparkPath = rawVal.match(/^\w+\.params\s*\(\s*"([^"]+)"\s*\)$/);
      if (sparkPath) {
        entries.push({ key, value: { t: "ref", source: "path", name: sparkPath[1] } });
        continue;
      }
      const sparkQuery = rawVal.match(/^\w+\.queryParams\s*\(\s*"([^"]+)"\s*\)$/);
      if (sparkQuery) {
        entries.push({ key, value: { t: "ref", source: "query", name: sparkQuery[1], default: "" } });
        continue;
      }
      const javalinPath = rawVal.match(/^\w+\.pathParam\s*\(\s*"([^"]+)"\s*\)$/);
      if (javalinPath) {
        entries.push({ key, value: { t: "ref", source: "path", name: javalinPath[1] } });
        continue;
      }
      const javalinQuery = rawVal.match(
        /^\w+\.queryParam\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*get\s*\(\s*0\s*\))?$/,
      );
      if (javalinQuery) {
        entries.push({ key, value: { t: "ref", source: "query", name: javalinQuery[1], default: "" } });
        continue;
      }
      const joobyPath = rawVal.match(
        /^\w+\.path\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*value\s*\(\s*\))?$/,
      );
      if (joobyPath) {
        entries.push({ key, value: { t: "ref", source: "path", name: joobyPath[1] } });
        continue;
      }
      const joobyQuery = rawVal.match(
        /^\w+\.query\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*value\s*\(\s*\))?$/,
      );
      if (joobyQuery) {
        entries.push({ key, value: { t: "ref", source: "query", name: joobyQuery[1], default: "" } });
        continue;
      }
      const webfluxPath = rawVal.match(/^\w+\.pathVariable\s*\(\s*"([^"]+)"\s*\)$/);
      if (webfluxPath) {
        entries.push({ key, value: { t: "ref", source: "path", name: webfluxPath[1] } });
        continue;
      }
      const webfluxQuery = rawVal.match(
        /^\w+\.queryParam\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*orElse\s*\(\s*(?:"([^"]*)"|null)\s*\))?$/,
      );
      if (webfluxQuery) {
        entries.push({
          key,
          value: {
            t: "ref",
            source: "query",
            name: webfluxQuery[1],
            default: webfluxQuery[2] ?? "",
          },
        });
        continue;
      }
      return null;
    }
  }
  if (entries.length === 0) return null;
  return { t: "obj", entries };
}

/**
 * @param {string} statusRaw
 */
function parseJavaHttpStatus(statusRaw) {
  const n = statusRaw.trim();
  if (/^\d+$/.test(n)) return Number.parseInt(n, 10);
  const named = n.match(/HttpStatus\.([A-Z_]+)/);
  if (named && JAVA_HTTP_STATUS[named[1]] !== undefined) return JAVA_HTTP_STATUS[named[1]];
  if (JAVA_HTTP_STATUS[n] !== undefined) return JAVA_HTTP_STATUS[n];
  return undefined;
}

/**
 * Bound method body so later Map.of / ResponseEntity cannot bleed into earlier routes.
 * @param {string} source
 * @param {number} fromIndex — start of @*Mapping line
 */
export function extractJavaMethodBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);
  const methodM = slice.match(
    /(?:@\w+(?:\([^)]*\))?\s*)*public\s+[\w<>,.\s?]+\s+\w+\s*\(([\s\S]*?)\)\s*\{/,
  );
  if (!methodM) return null;
  const openInSlice = (methodM.index ?? 0) + methodM[0].lastIndexOf("{");
  const absOpen = fromIndex + openInSlice;
  const bal = extractBalancedBraceInner(source, absOpen);
  if (!bal) return null;
  return {
    paramSource: methodM[1],
    bodySlice: bal.inner,
    line: source.slice(0, absOpen).split("\n").length,
  };
}

/**
 * Spark Java handler after `spark.Spark.get|post|…("/path", (req, res) ->` —
 * block `{…}` or expression until the Spark.* call `)`.
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractJavaSparkHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 12000);
  const head = slice.match(
    /spark\.Spark\.(?:get|post|put|patch|delete|head|options)\s*\(\s*["'][^"']+["']\s*,\s*\(\s*\w+\s*,\s*\w+\s*\)\s*->\s*/i,
  );
  if (!head || head.index === undefined) return null;
  const absHead = fromIndex + head.index;
  const openParen = absHead + head[0].indexOf("(");
  const bodyStart = fromIndex + head.index + head[0].length;
  const after = source.slice(bodyStart);
  const braceLead = after.match(/^\s*\{/);
  if (braceLead) {
    const absOpen = bodyStart + (braceLead[0].length - 1);
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    return {
      paramSource: "",
      bodySlice: bal.inner,
      line: source.slice(0, absOpen).split("\n").length,
      dialect: "spark",
    };
  }
  let depth = 0;
  let end = openParen;
  for (let i = openParen; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === q) break;
        i += 1;
      }
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end <= bodyStart) return null;
  return {
    paramSource: "",
    bodySlice: source.slice(bodyStart, end).trim(),
    line: source.slice(0, bodyStart).split("\n").length,
    dialect: "spark",
  };
}

/**
 * Body-local Spark req.params / req.queryParams assignments.
 * @param {string} bodySlice
 */
function parseJavaSparkRefs(bodySlice) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of bodySlice.matchAll(
    /(?:final\s+)?(?:String|var)\s+(\w+)\s*=\s*\w+\.params\s*\(\s*"([^"]+)"\s*\)/g,
  )) {
    byVar[m[1]] = { source: "path", name: m[2] };
  }
  for (const m of bodySlice.matchAll(
    /(?:final\s+)?(?:String|var)\s+(\w+)\s*=\s*\w+\.queryParams\s*\(\s*"([^"]+)"\s*\)/g,
  )) {
    byVar[m[1]] = { source: "query", name: m[2], default: "" };
  }
  return byVar;
}

/**
 * Javalin handler after `.get|post|…("/path", ctx ->` — block `{…}` or expression until call `)`.
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractJavaJavalinHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 12000);
  const head = slice.match(
    /\.(?:get|post|put|patch|delete)\s*\(\s*["'][^"']+["']\s*,\s*\w+\s*->\s*/i,
  );
  if (!head || head.index === undefined) return null;
  const absHead = fromIndex + head.index;
  const openParen = absHead + head[0].indexOf("(");
  const bodyStart = fromIndex + head.index + head[0].length;
  const after = source.slice(bodyStart);
  const braceLead = after.match(/^\s*\{/);
  if (braceLead) {
    const absOpen = bodyStart + (braceLead[0].length - 1);
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    return {
      paramSource: "",
      bodySlice: bal.inner,
      line: source.slice(0, absOpen).split("\n").length,
      dialect: "javalin",
    };
  }
  let depth = 0;
  let end = openParen;
  for (let i = openParen; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === q) break;
        i += 1;
      }
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end <= bodyStart) return null;
  return {
    paramSource: "",
    bodySlice: source.slice(bodyStart, end).trim(),
    line: source.slice(0, bodyStart).split("\n").length,
    dialect: "javalin",
  };
}

/**
 * Body-local Javalin/Vert.x ctx.pathParam / ctx.queryParam assignments.
 * Vert.x queryParam returns List — optional `.get(0)` for String bind (G10052).
 * @param {string} bodySlice
 */
function parseJavaJavalinRefs(bodySlice) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of bodySlice.matchAll(
    /(?:final\s+)?(?:String|var)\s+(\w+)\s*=\s*\w+\.pathParam\s*\(\s*"([^"]+)"\s*\)/g,
  )) {
    byVar[m[1]] = { source: "path", name: m[2] };
  }
  for (const m of bodySlice.matchAll(
    /(?:final\s+)?(?:String|var)\s+(\w+)\s*=\s*\w+\.queryParam\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*get\s*\(\s*0\s*\))?/g,
  )) {
    byVar[m[1]] = { source: "query", name: m[2], default: "" };
  }
  return byVar;
}

/**
 * Vert.x Web handler after `.get|post|…("/path").handler(ctx ->` — block `{…}` or expression until `)`.
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractJavaVertxHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 12000);
  const head = slice.match(
    /\.(?:get|post|put|patch|delete|head|options)\s*\(\s*["'][^"']+["']\s*\)\s*\.\s*handler\s*\(\s*\w+\s*->\s*/i,
  );
  if (!head || head.index === undefined) return null;
  const absHead = fromIndex + head.index;
  const openParen = absHead + head[0].lastIndexOf("(");
  const bodyStart = fromIndex + head.index + head[0].length;
  const after = source.slice(bodyStart);
  const braceLead = after.match(/^\s*\{/);
  if (braceLead) {
    const absOpen = bodyStart + (braceLead[0].length - 1);
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    return {
      paramSource: "",
      bodySlice: bal.inner,
      line: source.slice(0, absOpen).split("\n").length,
      dialect: "vertx",
    };
  }
  let depth = 0;
  let end = openParen;
  for (let i = openParen; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === q) break;
        i += 1;
      }
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end <= bodyStart) return null;
  return {
    paramSource: "",
    bodySlice: source.slice(bodyStart, end).trim(),
    line: source.slice(0, bodyStart).split("\n").length,
    dialect: "vertx",
  };
}

/**
 * Jooby handler after bare `get|post|…("/path", ctx ->` or `.get|post|…("/path", ctx ->`.
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractJavaJoobyHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 12000);
  const head = slice.match(
    /(?:\.(?:get|post|put|patch|delete)|(?<![\w.])(?:get|post|put|patch|delete))\s*\(\s*["'][^"']+["']\s*,\s*\w+\s*->\s*/i,
  );
  if (!head || head.index === undefined) return null;
  const absHead = fromIndex + head.index;
  const openParen = absHead + head[0].indexOf("(");
  const bodyStart = fromIndex + head.index + head[0].length;
  const after = source.slice(bodyStart);
  const braceLead = after.match(/^\s*\{/);
  if (braceLead) {
    const absOpen = bodyStart + (braceLead[0].length - 1);
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    return {
      paramSource: "",
      bodySlice: bal.inner,
      line: source.slice(0, absOpen).split("\n").length,
      dialect: "jooby",
    };
  }
  let depth = 0;
  let end = openParen;
  for (let i = openParen; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === q) break;
        i += 1;
      }
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end <= bodyStart) return null;
  return {
    paramSource: "",
    bodySlice: source.slice(bodyStart, end).trim(),
    line: source.slice(0, bodyStart).split("\n").length,
    dialect: "jooby",
  };
}

/**
 * Body-local Jooby ctx.path / ctx.query assignments (optional .value()).
 * @param {string} bodySlice
 */
function parseJavaJoobyRefs(bodySlice) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of bodySlice.matchAll(
    /(?:final\s+)?(?:String|var)\s+(\w+)\s*=\s*\w+\.path\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*value\s*\(\s*\))?/g,
  )) {
    byVar[m[1]] = { source: "path", name: m[2] };
  }
  for (const m of bodySlice.matchAll(
    /(?:final\s+)?(?:String|var)\s+(\w+)\s*=\s*\w+\.query\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*value\s*\(\s*\))?/g,
  )) {
    byVar[m[1]] = { source: "query", name: m[2], default: "" };
  }
  return byVar;
}

/**
 * Body-local WebFlux ServerRequest pathVariable / queryParam(+orElse) assignments.
 * @param {string} bodySlice
 */
function parseJavaWebFluxRefs(bodySlice) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of bodySlice.matchAll(
    /(?:final\s+)?(?:String|var)\s+(\w+)\s*=\s*\w+\.pathVariable\s*\(\s*"([^"]+)"\s*\)/g,
  )) {
    byVar[m[1]] = { source: "path", name: m[2] };
  }
  for (const m of bodySlice.matchAll(
    /(?:final\s+)?(?:String|var)\s+(\w+)\s*=\s*\w+\.queryParam\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*orElse\s*\(\s*(?:"([^"]*)"|null)\s*\))?/g,
  )) {
    byVar[m[1]] = { source: "query", name: m[2], default: m[3] ?? "" };
  }
  return byVar;
}

/**
 * WebFlux handler after `route(GET("/path"), req ->` / `.andRoute(GET("/path"), req ->`.
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractJavaWebFluxHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 12000);
  const head = slice.match(
    /\b(?:route|andRoute)\s*\(\s*(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*["'][^"']+["']\s*\)\s*,\s*\w+\s*->\s*/i,
  );
  if (!head || head.index === undefined) return null;
  const absHead = fromIndex + head.index;
  const openParen = absHead + head[0].indexOf("(");
  const bodyStart = fromIndex + head.index + head[0].length;
  const after = source.slice(bodyStart);
  const braceLead = after.match(/^\s*\{/);
  if (braceLead) {
    const absOpen = bodyStart + (braceLead[0].length - 1);
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    return {
      paramSource: "",
      bodySlice: bal.inner,
      line: source.slice(0, absOpen).split("\n").length,
      dialect: "webflux",
    };
  }
  let depth = 0;
  let end = openParen;
  for (let i = openParen; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === q) break;
        i += 1;
      }
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end <= bodyStart) return null;
  return {
    paramSource: "",
    bodySlice: source.slice(bodyStart, end).trim(),
    line: source.slice(0, bodyStart).split("\n").length,
    dialect: "webflux",
  };
}

/**
 * Extract argument text of the first `callee.method(` / `.method(` call in `slice`
 * with balanced parentheses (so Map.of(…) inside json(…) is not truncated).
 * @param {string} slice
 * @param {RegExp} headRe — must match through the opening `(` of the call (last char `(`)
 */
function extractBalancedCallArg(slice, headRe) {
  const head = slice.match(headRe);
  if (!head || head.index === undefined) return null;
  const openIdx = head.index + head[0].length - 1;
  if (slice[openIdx] !== "(") return null;
  let depth = 0;
  for (let i = openIdx; i < slice.length; i++) {
    const ch = slice[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      i += 1;
      while (i < slice.length) {
        if (slice[i] === "\\") {
          i += 2;
          continue;
        }
        if (slice[i] === q) break;
        i += 1;
      }
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        return {
          arg: slice.slice(openIdx + 1, i).trim(),
          fullMatch: slice.slice(head.index, i + 1),
          groups: head,
        };
      }
    }
  }
  return null;
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseJavaBodyReturn(bodySlice, paramRefs) {
  /** @type {number | undefined} */
  let status;
  /** @type {object | null} */
  let returnTree = null;
  /** @type {"json" | "scalar-lit" | "scalar-ref" | null} */
  let kind = null;

  /** Spark `res.status(N);` / Jooby `ctx.setResponseCode(N);` / Vert.x `setStatusCode(N)`. */
  const statusStmtM = bodySlice.match(
    /\b\w+\.(?:status|setResponseCode)\s*\(\s*(\d+)\s*\)\s*;/,
  );
  const setStatusCodeM = bodySlice.match(/\.setStatusCode\s*\(\s*(\d+)\s*\)/);
  const statusFromStmt = statusStmtM
    ? Number.parseInt(statusStmtM[1], 10)
    : setStatusCodeM
      ? Number.parseInt(setStatusCodeM[1], 10)
      : undefined;

  const reStatusBody = bodySlice.match(
    /return\s+ResponseEntity\.status\s*\(\s*([^)]+)\s*\)\s*\.\s*body\s*\(\s*([\s\S]*?)\s*\)\s*;/,
  );
  const reJaxrsStatusEntity = bodySlice.match(
    /return\s+Response\.status\s*\(\s*([^)]+)\s*\)\s*\.\s*entity\s*\(\s*([\s\S]*?)\s*\)\s*\.\s*build\s*\(\s*\)\s*;/,
  );
  /** Micronaut io.micronaut.http.HttpResponse.status(…).body(…) */
  const reMicronautStatusBody = bodySlice.match(
    /return\s+HttpResponse\.status\s*\(\s*([^)]+)\s*\)\s*\.\s*body\s*\(\s*([\s\S]*?)\s*\)\s*;/,
  );
  /** Javalin ctx.status(n).json(…) — balanced so Map.of is not truncated */
  const javalinStatusJson = extractBalancedCallArg(
    bodySlice,
    /\w+\.status\s*\(\s*(\d+)\s*\)\s*\.\s*json\s*\(/,
  );
  /** Javalin/Vert.x ctx.json(…) — skipped when status(n).json already matched */
  const javalinJson = javalinStatusJson
    ? null
    : extractBalancedCallArg(bodySlice, /\w+\.json\s*\(/);
  /** Javalin ctx.result(…) — string / path-ref scalars */
  const reJavalinResult = bodySlice.match(
    /\w+\.result\s*\(\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*'|([A-Za-z_][A-Za-z0-9_]*))\s*\)\s*;?/,
  );
  /**
   * Vert.x `ctx.response().end(…)` / `ctx.response().setStatusCode(n).end(…)` / `ctx.end(…)`.
   * Groups: [1]=optional status, [2]=lit-or-ident token, [3]=ident when not lit.
   */
  const reVertxEnd = bodySlice.match(
    /(?:\w+\.response\s*\(\s*\)\s*\.\s*(?:setStatusCode\s*\(\s*(\d+)\s*\)\s*\.\s*)?|\b\w+\.)end\s*\(\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*'|([A-Za-z_][A-Za-z0-9_]*))\s*\)\s*;?/,
  );
  /** WebFlux ServerResponse.status(n).bodyValue(…) */
  const webfluxStatusBody = extractBalancedCallArg(
    bodySlice,
    /(?:return\s+)?ServerResponse\.status\s*\(\s*(\d+)\s*\)\s*\.\s*bodyValue\s*\(/,
  );
  /** WebFlux ServerResponse.accepted().bodyValue(…) */
  const webfluxAcceptedBody = webfluxStatusBody
    ? null
    : extractBalancedCallArg(
        bodySlice,
        /(?:return\s+)?ServerResponse\.accepted\s*\(\s*\)\s*\.\s*bodyValue\s*\(/,
      );
  /** WebFlux ServerResponse.created(…).bodyValue(…) */
  const webfluxCreatedBody =
    webfluxStatusBody || webfluxAcceptedBody
      ? null
      : extractBalancedCallArg(
          bodySlice,
          /(?:return\s+)?ServerResponse\.created\s*\(\s*[^)]*\s*\)\s*\.\s*bodyValue\s*\(/,
        );
  /** WebFlux ServerResponse.ok().bodyValue(…) */
  const webfluxOkBody =
    webfluxStatusBody || webfluxAcceptedBody || webfluxCreatedBody
      ? null
      : extractBalancedCallArg(
          bodySlice,
          /(?:return\s+)?ServerResponse\.ok\s*\(\s*\)\s*\.\s*bodyValue\s*\(/,
        );
  const reOkBody = bodySlice.match(/return\s+ResponseEntity\.ok\s*\(\s*([\s\S]*?)\s*\)\s*;/);
  const reJaxrsOk = bodySlice.match(
    /return\s+Response\.ok\s*\(\s*([\s\S]*?)\s*\)\s*\.\s*build\s*\(\s*\)\s*;/,
  );
  const reMicronautOk = bodySlice.match(/return\s+HttpResponse\.ok\s*\(\s*([\s\S]*?)\s*\)\s*;/);
  const reAccepted = bodySlice.match(
    /return\s+ResponseEntity\.accepted\s*\(\s*\)\s*\.\s*body\s*\(\s*([\s\S]*?)\s*\)\s*;/i,
  );
  const reJaxrsAccepted = bodySlice.match(
    /return\s+Response\.accepted\s*\(\s*([\s\S]*?)\s*\)\s*\.\s*build\s*\(\s*\)\s*;/i,
  );
  const reMicronautAccepted = bodySlice.match(
    /return\s+HttpResponse\.accepted\s*\(\s*([\s\S]*?)\s*\)\s*;/i,
  );
  const reCreated = bodySlice.match(
    /return\s+ResponseEntity\.created\s*\([^)]*\)\s*\.\s*body\s*\(\s*([\s\S]*?)\s*\)\s*;/i,
  );
  const reMicronautCreated = bodySlice.match(
    /return\s+HttpResponse\.created\s*\(\s*([\s\S]*?)\s*\)\s*;/i,
  );
  const rePlainMap = bodySlice.match(/return\s+(?:java\.util\.)?Map\.of\s*\(([\s\S]*?)\)\s*;/);
  const reLit = bodySlice.match(/return\s+(true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')\s*;/);
  const reRef = bodySlice.match(/return\s+([A-Za-z_][A-Za-z0-9_]*)\s*;/);

  /** @param {string} expr */
  function mapFromExpr(expr) {
    const m = expr.match(JAVA_MAP_OF_RE);
    if (!m) return null;
    return parseJavaMapOfReturnTree(m[1], paramRefs);
  }

  /** @param {string} expr */
  function scalarFromExpr(expr) {
    const t = expr.trim();
    const lit = parseLiteralToken(t);
    if (lit !== null) {
      return { returnTree: { t: "lit", v: lit }, kind: /** @type {const} */ ("scalar-lit") };
    }
    if (paramRefs[t]) {
      return { returnTree: { t: "ref", ...paramRefs[t] }, kind: /** @type {const} */ ("scalar-ref") };
    }
    const sparkPath = t.match(/^\w+\.params\s*\(\s*"([^"]+)"\s*\)$/);
    if (sparkPath) {
      return {
        returnTree: { t: "ref", source: "path", name: sparkPath[1] },
        kind: /** @type {const} */ ("scalar-ref"),
      };
    }
    const sparkQuery = t.match(/^\w+\.queryParams\s*\(\s*"([^"]+)"\s*\)$/);
    if (sparkQuery) {
      return {
        returnTree: { t: "ref", source: "query", name: sparkQuery[1], default: "" },
        kind: /** @type {const} */ ("scalar-ref"),
      };
    }
    const javalinPath = t.match(/^\w+\.pathParam\s*\(\s*"([^"]+)"\s*\)$/);
    if (javalinPath) {
      return {
        returnTree: { t: "ref", source: "path", name: javalinPath[1] },
        kind: /** @type {const} */ ("scalar-ref"),
      };
    }
    const javalinQuery = t.match(
      /^\w+\.queryParam\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*get\s*\(\s*0\s*\))?$/,
    );
    if (javalinQuery) {
      return {
        returnTree: { t: "ref", source: "query", name: javalinQuery[1], default: "" },
        kind: /** @type {const} */ ("scalar-ref"),
      };
    }
    const joobyPath = t.match(
      /^\w+\.path\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*value\s*\(\s*\))?$/,
    );
    if (joobyPath) {
      return {
        returnTree: { t: "ref", source: "path", name: joobyPath[1] },
        kind: /** @type {const} */ ("scalar-ref"),
      };
    }
    const joobyQuery = t.match(
      /^\w+\.query\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*value\s*\(\s*\))?$/,
    );
    if (joobyQuery) {
      return {
        returnTree: { t: "ref", source: "query", name: joobyQuery[1], default: "" },
        kind: /** @type {const} */ ("scalar-ref"),
      };
    }
    const webfluxPath = t.match(/^\w+\.pathVariable\s*\(\s*"([^"]+)"\s*\)$/);
    if (webfluxPath) {
      return {
        returnTree: { t: "ref", source: "path", name: webfluxPath[1] },
        kind: /** @type {const} */ ("scalar-ref"),
      };
    }
    const webfluxQuery = t.match(
      /^\w+\.queryParam\s*\(\s*"([^"]+)"\s*\)(?:\s*\.\s*orElse\s*\(\s*(?:"([^"]*)"|null)\s*\))?$/,
    );
    if (webfluxQuery) {
      return {
        returnTree: {
          t: "ref",
          source: "query",
          name: webfluxQuery[1],
          default: webfluxQuery[2] ?? "",
        },
        kind: /** @type {const} */ ("scalar-ref"),
      };
    }
    return null;
  }

  if (reStatusBody) {
    status = parseJavaHttpStatus(reStatusBody[1]);
    returnTree = mapFromExpr(reStatusBody[2]);
    kind = returnTree ? "json" : null;
  } else if (reJaxrsStatusEntity) {
    status = parseJavaHttpStatus(reJaxrsStatusEntity[1]);
    returnTree = mapFromExpr(reJaxrsStatusEntity[2]);
    kind = returnTree ? "json" : null;
  } else if (reMicronautStatusBody) {
    status = parseJavaHttpStatus(reMicronautStatusBody[1]);
    returnTree = mapFromExpr(reMicronautStatusBody[2]);
    kind = returnTree ? "json" : null;
  } else if (webfluxStatusBody) {
    status = Number.parseInt(webfluxStatusBody.groups[1], 10);
    const expr = webfluxStatusBody.arg;
    returnTree = mapFromExpr(expr);
    if (returnTree) kind = "json";
    else {
      const sc = scalarFromExpr(expr);
      if (sc) {
        returnTree = sc.returnTree;
        kind = sc.kind;
      }
    }
  } else if (webfluxCreatedBody) {
    status = 201;
    const expr = webfluxCreatedBody.arg;
    returnTree = mapFromExpr(expr);
    if (returnTree) kind = "json";
    else {
      const sc = scalarFromExpr(expr);
      if (sc) {
        returnTree = sc.returnTree;
        kind = sc.kind;
      }
    }
  } else if (webfluxAcceptedBody) {
    status = 202;
    const expr = webfluxAcceptedBody.arg;
    returnTree = mapFromExpr(expr);
    if (returnTree) kind = "json";
    else {
      const sc = scalarFromExpr(expr);
      if (sc) {
        returnTree = sc.returnTree;
        kind = sc.kind;
      }
    }
  } else if (webfluxOkBody) {
    status = 200;
    const expr = webfluxOkBody.arg;
    returnTree = mapFromExpr(expr);
    if (returnTree) kind = "json";
    else {
      const sc = scalarFromExpr(expr);
      if (sc) {
        returnTree = sc.returnTree;
        kind = sc.kind;
      }
    }
  } else if (javalinStatusJson) {
    status = Number.parseInt(javalinStatusJson.groups[1], 10);
    const expr = javalinStatusJson.arg;
    returnTree = mapFromExpr(expr);
    if (returnTree) kind = "json";
    else {
      const sc = scalarFromExpr(expr);
      if (sc) {
        returnTree = sc.returnTree;
        kind = sc.kind;
      }
    }
  } else if (reCreated) {
    status = 201;
    returnTree = mapFromExpr(reCreated[1]);
    kind = returnTree ? "json" : null;
  } else if (reMicronautCreated) {
    status = 201;
    returnTree = mapFromExpr(reMicronautCreated[1]);
    kind = returnTree ? "json" : null;
  } else if (reAccepted) {
    status = 202;
    returnTree = mapFromExpr(reAccepted[1]);
    kind = returnTree ? "json" : null;
  } else if (reJaxrsAccepted) {
    status = 202;
    returnTree = mapFromExpr(reJaxrsAccepted[1]);
    kind = returnTree ? "json" : null;
  } else if (reMicronautAccepted) {
    status = 202;
    returnTree = mapFromExpr(reMicronautAccepted[1]);
    kind = returnTree ? "json" : null;
  } else if (reOkBody) {
    status = 200;
    returnTree = mapFromExpr(reOkBody[1]);
    kind = returnTree ? "json" : null;
  } else if (reJaxrsOk) {
    status = 200;
    returnTree = mapFromExpr(reJaxrsOk[1]);
    kind = returnTree ? "json" : null;
  } else if (reMicronautOk) {
    status = 200;
    returnTree = mapFromExpr(reMicronautOk[1]);
    kind = returnTree ? "json" : null;
  } else if (javalinJson) {
    const expr = javalinJson.arg;
    returnTree = mapFromExpr(expr);
    if (returnTree) kind = "json";
    else {
      const sc = scalarFromExpr(expr);
      if (sc) {
        returnTree = sc.returnTree;
        kind = sc.kind;
      }
    }
  } else if (reJavalinResult) {
    const litTok = reJavalinResult[1];
    const refTok = reJavalinResult[2];
    if (refTok && paramRefs[refTok]) {
      returnTree = { t: "ref", ...paramRefs[refTok] };
      kind = "scalar-ref";
    } else {
      const v = parseLiteralToken(litTok);
      if (v !== null) {
        returnTree = { t: "lit", v };
        kind = "scalar-lit";
      }
    }
  } else if (reVertxEnd) {
    if (reVertxEnd[1]) status = Number.parseInt(reVertxEnd[1], 10);
    const litTok = reVertxEnd[2];
    const refTok = reVertxEnd[3];
    if (refTok && paramRefs[refTok]) {
      returnTree = { t: "ref", ...paramRefs[refTok] };
      kind = "scalar-ref";
    } else {
      const v = parseLiteralToken(litTok);
      if (v !== null) {
        returnTree = { t: "lit", v };
        kind = "scalar-lit";
      }
    }
  } else if (rePlainMap) {
    returnTree = parseJavaMapOfReturnTree(rePlainMap[1], paramRefs);
    kind = returnTree ? "json" : null;
  } else if (reLit) {
    const v = parseLiteralToken(reLit[1]);
    if (v !== null) {
      returnTree = { t: "lit", v };
      kind = "scalar-lit";
    }
  } else if (reRef && paramRefs[reRef[1]]) {
    returnTree = { t: "ref", ...paramRefs[reRef[1]] };
    kind = "scalar-ref";
  } else if (
    !/\breturn\b/.test(bodySlice) &&
    !/\w+\.(?:json|result)\s*\(/.test(bodySlice) &&
    !/\.end\s*\(/.test(bodySlice) &&
    !/ServerResponse\.(?:ok|status|accepted|created)\s*\(/.test(bodySlice)
  ) {
    // Expression-lambda body (Spark/Javalin) without `return` / ctx.json|result|end.
    const expr = bodySlice.trim().replace(/;\s*$/, "");
    const mapM = expr.match(/^(?:java\.util\.)?Map\.of\s*\(([\s\S]*)\)$/);
    if (mapM) {
      returnTree = parseJavaMapOfReturnTree(mapM[1], paramRefs);
      kind = returnTree ? "json" : null;
    } else {
      const sc = scalarFromExpr(expr);
      if (sc) {
        returnTree = sc.returnTree;
        kind = sc.kind;
      }
    }
  }

  if (status === undefined && statusFromStmt !== undefined) status = statusFromStmt;

  return { status, returnTree, kind };
}

/**
 * @param {object} ctx
 * @param {{ sqlEffects: object[], returnTree: object | null, status?: number, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerJavaHandlerBodyFull(ctx, parsed, loc) {
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
        provenance: [webir.provenance("hub-ingest", "java-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "java-handler-body")],
  });
}

/**
 * @param {object} ctx
 * @param {number | undefined} status
 * @param {unknown} value
 * @param {{ file: string, line?: number }} loc
 */
function lowerJavaScalarLit(ctx, status, value, loc) {
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
    provenance: [webir.provenance("hub-ingest", "java-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "java-scalar-lit-status")],
  });
}

/**
 * @param {object} opts
 */
export function liftJavaFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseJavaRoutes(source, file);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    let extracted = extractJavaMethodBody(source, idx);
    if (!extracted) extracted = extractJavaSparkHandlerBody(source, idx);
    if (!extracted) extracted = extractJavaWebFluxHandlerBody(source, idx);
    if (!extracted) extracted = extractJavaVertxHandlerBody(source, idx);
    if (!extracted) extracted = extractJavaJoobyHandlerBody(source, idx);
    if (!extracted) extracted = extractJavaJavalinHandlerBody(source, idx);
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-java:handler-body", { file, line: r.line });
    } else {
      const { paramSource, bodySlice, line } = extracted;
      const loc = { file, line };
      const paramRefs = {
        ...parseJavaParamRefs(paramSource ?? ""),
        ...parseJavaJavalinRefs(bodySlice),
        ...parseJavaSparkRefs(bodySlice),
        ...parseJavaJoobyRefs(bodySlice),
        ...parseJavaWebFluxRefs(bodySlice),
      };
      const sqlEffects = parseJavaSqlEffects(bodySlice, paramRefs);
      const { status, returnTree, kind } = parseJavaBodyReturn(bodySlice, paramRefs);

      if (kind === "scalar-lit" && returnTree?.t === "lit") {
        bodyId = lowerJavaScalarLit(ctx, status, returnTree.v, loc);
      } else if (kind === "scalar-ref" && returnTree?.t === "ref") {
        bodyId =
          lowerJavaHandlerBodyFull(
            ctx,
            { sqlEffects, returnTree, status, line },
            loc,
          ) ?? hubHandlerBodyHole(ctx, "hub-java:handler-body", loc);
      } else if (sqlEffects.length > 0 || returnTree || (typeof status === "number" && status !== 200)) {
        bodyId =
          lowerJavaHandlerBodyFull(
            ctx,
            { sqlEffects, returnTree, status, line },
            loc,
          ) ?? hubHandlerBodyHole(ctx, "hub-java:handler-body", loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-java:handler-body", loc);
      }
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
