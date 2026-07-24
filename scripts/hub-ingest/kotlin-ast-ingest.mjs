/**
 * Kotlin hub ingest — Spring `@*Mapping` + Ktor + http4k (G10024) route parse; lift in-process.
 * Deepened for D6448-ST cwl-api flagship: brace/expression `fun` bodies, mapOf
 * JSON (+ path/query refs), ResponseEntity status+body, scalar returns
 * (hub-flagship-kotlin). Prefer this over thin pattern-route-lift for Spring KT.
 * http4k secondary: `"path" bind Method.VERB to {…}`, req.path/query, Response(Status).body.
 */
import { parseKotlinRoutes } from "./pattern-route-parsers.mjs";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { extractBalancedBraceInner } from "./go-ast-ingest.mjs";

export { parseKotlinRoutes };

const KOTLIN_HTTP_STATUS = {
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
export function canKotlinAstIngest(language, ext) {
  return language === "kotlin" && (ext.toLowerCase() === ".kt" || ext.toLowerCase() === ".kts");
}

/**
 * @param {string} raw
 */
function parseLiteralToken(raw) {
  const t = raw.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+$/.test(t)) return Number.parseInt(t, 10);
  if (/^-?\d+\.\d+$/.test(t)) return Number.parseFloat(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return null;
}

/**
 * @param {string} paramSource
 */
function parseKotlinParamRefs(paramSource) {
  /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
  const byVar = {};
  for (const m of paramSource.matchAll(/@PathVariable(?:\(([^)]*)\))?\s+(\w+)\s*:/g)) {
    const ann = m[1] ?? "";
    const varName = m[2];
    const nameM = ann.match(/(?:value|name)\s*=\s*"([^"]+)"/) || ann.match(/^"([^"]+)"$/);
    byVar[varName] = { source: "path", name: nameM ? nameM[1] : varName };
  }
  for (const m of paramSource.matchAll(/@RequestParam(?:\(([^)]*)\))?\s+(\w+)\s*:/g)) {
    const ann = m[1] ?? "";
    const varName = m[2];
    const nameM = ann.match(/(?:value|name)\s*=\s*"([^"]+)"/) || ann.match(/^"([^"]+)"$/);
    const defM = ann.match(/defaultValue\s*=\s*"([^"]*)"/);
    byVar[varName] = {
      source: "query",
      name: nameM ? nameM[1] : varName,
      ...(defM ? { default: defM[1] } : {}),
    };
  }
  for (const m of paramSource.matchAll(/@RequestHeader(?:\(\s*"([^"]+)"\s*\))?\s+(\w+)\s*:/g)) {
    byVar[m[2]] = { source: "header", name: m[1] ?? m[2] };
  }
  for (const m of paramSource.matchAll(/@CookieValue(?:\(\s*"([^"]+)"\s*\))?\s+(\w+)\s*:/g)) {
    byVar[m[2]] = { source: "cookie", name: m[1] ?? m[2] };
  }
  return byVar;
}

/**
 * @param {string} mapInner
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseKotlinMapOfReturnTree(mapInner, paramRefs) {
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of mapInner.matchAll(/"([^"]+)"\s+to\s+([^,\)]+)/g)) {
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
function parseKotlinHttpStatus(statusRaw) {
  const n = statusRaw.trim();
  if (/^\d+$/.test(n)) return Number.parseInt(n, 10);
  const named = n.match(/(?:HttpStatus|HttpStatusCode)\.([A-Z_]+)/i);
  if (named) {
    const key = named[1].toUpperCase();
    if (KOTLIN_HTTP_STATUS[key] !== undefined) return KOTLIN_HTTP_STATUS[key];
  }
  if (KOTLIN_HTTP_STATUS[n.toUpperCase()] !== undefined) return KOTLIN_HTTP_STATUS[n.toUpperCase()];
  return undefined;
}

/**
 * Capture an expression after `=` with balanced () / [] until top-level newline or `;`.
 * @param {string} source
 * @param {number} startIdx — index of first char of expression
 */
function extractKotlinExpression(source, startIdx) {
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let i = startIdx;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  const exprStart = i;
  for (; i < source.length; i++) {
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
    if (ch === "(") depthParen += 1;
    else if (ch === ")") {
      if (depthParen === 0 && depthBracket === 0 && depthBrace === 0) break;
      depthParen -= 1;
    } else if (ch === "[") depthBracket += 1;
    else if (ch === "]") depthBracket -= 1;
    else if (ch === "{") depthBrace += 1;
    else if (ch === "}") {
      if (depthParen === 0 && depthBracket === 0 && depthBrace === 0) break;
      depthBrace -= 1;
    } else if (
      (ch === "\n" || ch === ";") &&
      depthParen === 0 &&
      depthBracket === 0 &&
      depthBrace === 0
    ) {
      break;
    }
  }
  return { expr: source.slice(exprStart, i).trim(), end: i };
}

/**
 * Bound Spring Kotlin `fun` body (brace or `= expr`) so later mapOf cannot bleed.
 * @param {string} source
 * @param {number} fromIndex — start of @*Mapping line
 */
export function extractKotlinMethodBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);
  const braceM = slice.match(/fun\s+\w+\s*\(([\s\S]*?)\)\s*(?::\s*[\w<>,.\s?]+)?\s*\{/);
  if (braceM && braceM.index !== undefined) {
    const openInSlice = braceM.index + braceM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    return {
      paramSource: braceM[1],
      bodySlice: bal.inner,
      line: source.slice(0, absOpen).split("\n").length,
      kind: "brace",
    };
  }
  const exprM = slice.match(/fun\s+\w+\s*\(([\s\S]*?)\)\s*(?::\s*[\w<>,.\s?]+)?\s*=\s*/);
  if (exprM && exprM.index !== undefined) {
    const absEqEnd = fromIndex + exprM.index + exprM[0].length;
    const { expr, end } = extractKotlinExpression(source, absEqEnd);
    if (!expr) return null;
    return {
      paramSource: exprM[1],
      bodySlice: `return ${expr}`,
      line: source.slice(0, absEqEnd).split("\n").length,
      kind: "expr",
      absEnd: end,
    };
  }
  // http4k (G10024): "/path" bind Method.GET to { … } / bind GET to { req -> … }
  const http4kM = slice.match(
    /"[^"]+"\s+bind(?:Method)?\s+(?:Method\.)?(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+to\s*\{/i,
  );
  if (http4kM && http4kM.index !== undefined) {
    const openInSlice = http4kM.index + http4kM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    return {
      paramSource: "",
      bodySlice: bal.inner,
      line: source.slice(0, absOpen).split("\n").length,
      kind: "http4k",
    };
  }
  // Ktor: get("/path") { ... }
  const ktorM = slice.match(/\b(?:get|post|put|patch|delete|head|options)\s*\(\s*"[^"]*"\s*\)\s*\{/i);
  if (ktorM && ktorM.index !== undefined) {
    const openInSlice = ktorM.index + ktorM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    return {
      paramSource: "",
      bodySlice: bal.inner,
      line: source.slice(0, absOpen).split("\n").length,
      kind: "ktor",
    };
  }
  return null;
}

/**
 * Extract balanced `(...)` argument starting at the `(` after a callee.
 * @param {string} source
 * @param {number} openIdx — index of `(`
 */
function extractBalancedParenInner(source, openIdx) {
  if (source[openIdx] !== "(") return null;
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
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return { inner: source.slice(openIdx + 1, i), end: i };
    }
  }
  return null;
}

/**
 * @param {string} bodySlice
 * @param {string} marker — substring ending with `(` e.g. ".body(" or "mapOf("
 * @param {number} [fromIndex]
 */
function argAfterMarker(bodySlice, marker, fromIndex = 0) {
  const idx = bodySlice.indexOf(marker, fromIndex);
  if (idx < 0) return null;
  return extractBalancedParenInner(bodySlice, idx + marker.length - 1);
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseKotlinBodyReturn(bodySlice, paramRefs) {
  /** @type {number | undefined} */
  let status;
  /** @type {object | null} */
  let returnTree = null;
  /** @type {"json" | "scalar-lit" | "scalar-ref" | null} */
  let kind = null;

  const reLit = bodySlice.match(/(?:return\s+)?(true|false|-?\d+(?:\.\d+)?|"[^"]*"|'[^']*')\s*$/m);
  const reRef = bodySlice.match(/(?:return\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*$/m);
  const ktorRespondLit = bodySlice.match(
    /call\.respond(?:Text)?\s*\(\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*")\s*\)/,
  );
  const ktorRespondRef = bodySlice.match(
    /call\.respond(?:Text)?\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/,
  );
  // http4k (G10024): Response(OK|CREATED|…).body(lit|ref) — not ResponseEntity.
  const http4kResp = /(?<!Entity)Response\s*\(\s*(?:Status\.)?(\w+)\s*\)\s*\.\s*body\s*\(/.exec(
    bodySlice,
  );

  /** @param {string} expr */
  function mapFromExpr(expr) {
    const m = /mapOf\s*\(/.exec(expr);
    if (!m || m.index === undefined) return null;
    const bal = extractBalancedParenInner(expr, m.index + m[0].length - 1);
    if (!bal) return null;
    return parseKotlinMapOfReturnTree(bal.inner, paramRefs);
  }

  const statusM = /ResponseEntity\.status\s*\(\s*([^)]+)\s*\)\s*\.\s*body\s*\(/.exec(bodySlice);
  const createdM = /ResponseEntity\.created\s*\([^)]*\)\s*\.\s*body\s*\(/i.exec(bodySlice);
  const acceptedM = /ResponseEntity\.accepted\s*\(\s*\)\s*\.\s*body\s*\(/i.exec(bodySlice);
  const okM = /ResponseEntity\.ok\s*\(/.exec(bodySlice);
  const ktorStatusMap = /call\.respond\s*\(\s*(?:HttpStatusCode\.)?(\w+)\s*,\s*mapOf\s*\(/.exec(
    bodySlice,
  );
  const ktorMapOnly = /call\.respond\s*\(\s*mapOf\s*\(/.exec(bodySlice);
  const plainMapArg = argAfterMarker(bodySlice, "mapOf(");

  if (statusM) {
    status = parseKotlinHttpStatus(statusM[1]);
    const bodyArg = argAfterMarker(bodySlice, ".body(", statusM.index ?? 0);
    returnTree = bodyArg ? mapFromExpr(bodyArg.inner) : null;
    kind = returnTree ? "json" : null;
  } else if (createdM) {
    status = 201;
    const bodyArg = argAfterMarker(bodySlice, ".body(", createdM.index ?? 0);
    returnTree = bodyArg ? mapFromExpr(bodyArg.inner) : null;
    kind = returnTree ? "json" : null;
  } else if (acceptedM) {
    status = 202;
    const bodyArg = argAfterMarker(bodySlice, ".body(", acceptedM.index ?? 0);
    returnTree = bodyArg ? mapFromExpr(bodyArg.inner) : null;
    kind = returnTree ? "json" : null;
  } else if (okM) {
    status = 200;
    const bodyArg = extractBalancedParenInner(bodySlice, (okM.index ?? 0) + okM[0].length - 1);
    returnTree = bodyArg ? mapFromExpr(bodyArg.inner) : null;
    kind = returnTree ? "json" : null;
  } else if (http4kResp) {
    status = parseKotlinHttpStatus(http4kResp[1]) ?? undefined;
    const bodyArg = argAfterMarker(bodySlice, ".body(", http4kResp.index ?? 0);
    if (bodyArg) {
      const raw = bodyArg.inner.trim();
      const lit = parseLiteralToken(raw);
      if (lit !== null) {
        returnTree = { t: "lit", v: lit };
        kind = "scalar-lit";
      } else if (paramRefs[raw]) {
        returnTree = { t: "ref", ...paramRefs[raw] };
        kind = "scalar-ref";
      }
    }
  } else if (ktorStatusMap) {
    const code = ktorStatusMap[1];
    status =
      /^\d+$/.test(code) ? Number.parseInt(code, 10) : parseKotlinHttpStatus(code) ?? undefined;
    const mapArg = argAfterMarker(bodySlice, "mapOf(", ktorStatusMap.index ?? 0);
    returnTree = mapArg ? parseKotlinMapOfReturnTree(mapArg.inner, paramRefs) : null;
    kind = returnTree ? "json" : null;
  } else if (ktorMapOnly) {
    const mapArg = argAfterMarker(bodySlice, "mapOf(", ktorMapOnly.index ?? 0);
    returnTree = mapArg ? parseKotlinMapOfReturnTree(mapArg.inner, paramRefs) : null;
    kind = returnTree ? "json" : null;
  } else if (ktorRespondLit) {
    const v = parseLiteralToken(ktorRespondLit[1]);
    if (v !== null) {
      returnTree = { t: "lit", v };
      kind = "scalar-lit";
    }
  } else if (ktorRespondRef && paramRefs[ktorRespondRef[1]]) {
    returnTree = { t: "ref", ...paramRefs[ktorRespondRef[1]] };
    kind = "scalar-ref";
  } else if (plainMapArg && /(?:return\s+)?mapOf\s*\(/.test(bodySlice)) {
    returnTree = parseKotlinMapOfReturnTree(plainMapArg.inner, paramRefs);
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
 * @param {{ returnTree: object | null, status?: number, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerKotlinHandlerBodyFull(ctx, parsed, loc) {
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
        provenance: [webir.provenance("hub-ingest", "kotlin-ast:json-status")],
      }),
    );
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
    provenance: [webir.provenance("hub-ingest", "kotlin-handler-body")],
  });
}

/**
 * @param {object} ctx
 * @param {number | undefined} status
 * @param {unknown} value
 * @param {{ file: string, line?: number }} loc
 */
function lowerKotlinScalarLit(ctx, status, value, loc) {
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
    provenance: [webir.provenance("hub-ingest", "kotlin-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "kotlin-scalar-lit-status")],
  });
}

/**
 * @param {object} opts
 */
export function liftKotlinFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseKotlinRoutes(source, file);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const extracted = extractKotlinMethodBody(source, idx);
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-kotlin:handler-body", { file, line: r.line });
    } else {
      const { paramSource, bodySlice, line } = extracted;
      const loc = { file, line };
      const paramRefs = parseKotlinParamRefs(paramSource);
      // Merge Ktor call.parameters / queryParameters into refs for mapOf
      for (const m of bodySlice.matchAll(/(?:val|var)\s+(\w+)\s*=\s*call\.parameters\s*\[\s*"([^"]+)"\s*]/g)) {
        paramRefs[m[1]] = { source: "path", name: m[2] };
      }
      for (const m of bodySlice.matchAll(
        /(?:val|var)\s+(\w+)\s*=\s*call\.request\.queryParameters\s*\[\s*"([^"]+)"\s*\](?:\s*\?:\s*"([^"]*)")?/g,
      )) {
        paramRefs[m[1]] = {
          source: "query",
          name: m[2],
          ...(m[3] !== undefined ? { default: m[3] } : {}),
        };
      }
      // http4k (G10024): req.path("id") / req.query("q") ?: ""
      for (const m of bodySlice.matchAll(
        /(?:val|var)\s+(\w+)\s*=\s*[A-Za-z_][\w]*\.path\s*\(\s*"([^"]+)"\s*\)/g,
      )) {
        paramRefs[m[1]] = { source: "path", name: m[2] };
      }
      for (const m of bodySlice.matchAll(
        /(?:val|var)\s+(\w+)\s*=\s*[A-Za-z_][\w]*\.query\s*\(\s*"([^"]+)"\s*\)(?:\s*\?:\s*"([^"]*)")?/g,
      )) {
        paramRefs[m[1]] = {
          source: "query",
          name: m[2],
          ...(m[3] !== undefined ? { default: m[3] } : { default: "" }),
        };
      }
      const { status, returnTree, kind } = parseKotlinBodyReturn(bodySlice, paramRefs);

      if (kind === "scalar-lit" && returnTree?.t === "lit") {
        bodyId = lowerKotlinScalarLit(ctx, status, returnTree.v, loc);
      } else if (returnTree || (typeof status === "number" && status !== 200)) {
        bodyId =
          lowerKotlinHandlerBodyFull(ctx, { returnTree, status, line }, loc) ??
          hubHandlerBodyHole(ctx, "hub-kotlin:handler-body", loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-kotlin:handler-body", loc);
      }
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
