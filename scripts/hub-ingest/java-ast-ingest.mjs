/**
 * Java hub ingest — route parse via @chrysalis/hub-native-bridge; lift in-process.
 * Deepened for D6448-ST cwl-api flagship: brace-bounded method bodies, ResponseEntity
 * status+body, Map.of JSON, string/scalar/path-ref returns (hub-flagship-java).
 * Secondary: JAX-RS (G10012) + Micronaut @Controller/@Get|Post|… (G10020) peels —
 * HttpResponse.ok/status/created/accepted + @PathVariable/@QueryValue (no DI/filter invent).
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
  }

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
    const extracted = extractJavaMethodBody(source, idx);
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-java:handler-body", { file, line: r.line });
    } else {
      const { paramSource, bodySlice, line } = extracted;
      const loc = { file, line };
      const paramRefs = parseJavaParamRefs(paramSource);
      const sqlEffects = parseJavaSqlEffects(bodySlice, paramRefs);
      const { status, returnTree, kind } = parseJavaBodyReturn(bodySlice, paramRefs);

      if (kind === "scalar-lit" && returnTree?.t === "lit") {
        bodyId = lowerJavaScalarLit(ctx, status, returnTree.v, loc);
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
