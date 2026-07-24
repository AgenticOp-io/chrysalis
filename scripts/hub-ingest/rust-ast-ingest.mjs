/**
 * Rust hub ingest — Actix Web macros (+ Axum `.route`) deepened for D6448-ST
 * cwl-api flagship: brace-bounded handler bodies, serde_json::json! (+ path/query
 * refs), HttpResponse status+json, scalar returns (hub-flagship-rust). Prefer
 * this over thin pattern-route-lift for flagship depth.
 */
import { parseRustRoutes } from "./pattern-route-parsers.mjs";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { extractBalancedBraceInner } from "./go-ast-ingest.mjs";

export { parseRustRoutes };

const RUST_HTTP_STATUS = {
  Ok: 200,
  OK: 200,
  Created: 201,
  CREATED: 201,
  Accepted: 202,
  ACCEPTED: 202,
  NoContent: 204,
  NO_CONTENT: 204,
  BadRequest: 400,
  NotFound: 404,
  NOT_FOUND: 404,
};

/**
 * @param {string} language
 * @param {string} ext
 */
export function canRustAstIngest(language, ext) {
  return language === "rust" && ext.toLowerCase() === ".rs";
}

/**
 * Normalize Actix/Axum path templates to CWL `{name}` form.
 * @param {string} path
 */
export function normalizeRustRoutePath(path) {
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
}

/**
 * @param {string} path
 */
function pathParamRefsFromPath(path) {
  /** @type {Record<string, { source: string, name: string }>} */
  const refs = {};
  for (const m of path.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) {
    refs[m[1]] = { source: "path", name: m[1] };
  }
  return refs;
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
 * @param {string} source
 * @param {number} openIdx
 */
function extractBalancedParenInner(source, openIdx) {
  if (source[openIdx] !== "(") return null;
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
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
 * Resolve a named Axum handler `async fn name(...) { … }` referenced from
 * `.route("/path", get(name))` (Go Gin named-func parallel).
 * @param {string} source
 * @param {string} handlerName
 */
export function extractRustNamedHandlerBody(source, handlerName) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(handlerName)) return null;
  const headRe = new RegExp(String.raw`(?:pub\s+)?(?:async\s+)?fn\s+${handlerName}\s*\(`);
  const headM = headRe.exec(source);
  if (!headM || headM.index === undefined) return null;
  const parenOpen = headM.index + headM[0].length - 1;
  const params = extractBalancedParenInner(source, parenOpen);
  if (!params) return null;
  let i = params.end + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (source.startsWith("->", i)) {
    i += 2;
    let depth = 0;
    while (i < source.length) {
      const ch = source[i];
      if (ch === "(" || ch === "<") depth += 1;
      else if (ch === ")" || ch === ">") depth = Math.max(0, depth - 1);
      else if (ch === "{" && depth === 0) break;
      i += 1;
    }
  }
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (source[i] !== "{") return null;
  const bal = extractBalancedBraceInner(source, i);
  if (!bal) return null;
  const line = source.slice(0, i).split("\n").length;
  return {
    paramSource: params.inner,
    bodySlice: bal.inner,
    line,
    absOpen: i,
    absEnd: bal.end,
    kind: "axum-named",
    named: handlerName,
  };
}

/**
 * Bound Actix `async fn … { … }` after a `#[get("/…")]` macro, or Axum
 * `.route("/…", get(|| async { … }))` / `get(|Path(id): Path<_>| async move { … })`
 * / named `get(handler)` (resolve `async fn handler`).
 * Prefer Axum closure when the match starts at `.route` so a later `fn main` is not stolen.
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractRustHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);
  const looksLikeAxumRoute = /^\s*\.route\s*\(/i.test(slice);

  /** Actix: #[get("/x")] async fn name(...) -> … { … } */
  const tryFn = () => {
    const fnM = slice.match(
      /(?:pub\s+)?(?:async\s+)?fn\s+\w+\s*\(([\s\S]*?)\)\s*(?:->\s*[\w:<>,\s()]+)?\s*\{/,
    );
    if (!fnM || fnM.index === undefined) return null;
    const openInSlice = fnM.index + fnM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    return {
      paramSource: fnM[1],
      bodySlice: bal.inner,
      line: source.slice(0, absOpen).split("\n").length,
      kind: "fn",
    };
  };

  /**
   * Axum: `.route("/x", get(|| async { … }))` /
   * `get(|Path(id): Path<String>| async move { … })`.
   */
  const tryAxumClosure = () => {
    const axumM = slice.match(
      /(?:,|\()\s*(?:get|post|put|patch|delete|head|options)\s*\(\s*(?:\|\|\s*(?:async\s+)?(?:move\s+)?|\|\s*[^|]*\|\s*(?:async\s+)?(?:move\s+)?)\{/i,
    );
    if (!axumM || axumM.index === undefined) return null;
    const openInSlice = axumM.index + axumM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    return {
      paramSource: "",
      bodySlice: bal.inner,
      line: source.slice(0, absOpen).split("\n").length,
      kind: "axum",
    };
  };

  /** Axum named: `.route("/x", get(handler))` → resolve `fn handler`. */
  const tryAxumNamed = () => {
    const namedM = slice.match(
      /(?:,|\()\s*(?:get|post|put|patch|delete|head|options)\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/i,
    );
    if (!namedM) return null;
    return extractRustNamedHandlerBody(source, namedM[1]);
  };

  if (looksLikeAxumRoute) return tryAxumClosure() ?? tryAxumNamed();
  return tryFn() ?? tryAxumClosure() ?? tryAxumNamed();
}

/**
 * @param {string} jsonInner
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseRustJsonReturnTree(jsonInner, paramRefs) {
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of jsonInner.matchAll(/"([^"]+)"\s*:\s*([^,\}\n]+)/g)) {
    const key = pair[1];
    let rawVal = pair[2].trim();
    // Strip trailing `.to_string()` / clones for refs
    rawVal = rawVal.replace(/\.clone\(\)\s*$/, "").replace(/\.to_string\(\)\s*$/, "").trim();
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
 * @param {string} bodySlice
 * @param {string} marker
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
function collectRustParamLets(bodySlice, paramRefs) {
  // let id = path.into_inner();
  for (const m of bodySlice.matchAll(
    /(?:let|mut)\s+(\w+)\s*=\s*(?:path|id|user_id|userId)\s*\.into_inner\s*\(\s*\)/g,
  )) {
    if (!paramRefs[m[1]]) {
      // Prefer path template name when present
      const fromPath = Object.values(paramRefs).find((r) => r.source === "path" && r.name === m[1]);
      paramRefs[m[1]] = fromPath ?? { source: "path", name: m[1] };
    }
  }
  // let id = path.into_inner() when path segment is {id}
  for (const m of bodySlice.matchAll(/(?:let|mut)\s+(\w+)\s*=\s*\w+\s*\.into_inner\s*\(\s*\)/g)) {
    if (!paramRefs[m[1]]) {
      const hit = Object.values(paramRefs).find((r) => r.source === "path" && r.name === m[1]);
      paramRefs[m[1]] = hit ?? { source: "path", name: m[1] };
    }
  }
  // let q = query.get("q").cloned().unwrap_or_else(|| "".to_string());
  // let q = query.get("q").cloned().unwrap_or_default();
  // let q = query.get("q").map(...).unwrap_or("");
  for (const m of bodySlice.matchAll(
    /(?:let|mut)\s+(\w+)\s*=\s*\w+\.get\s*\(\s*"([^"]+)"\s*\)[\s\S]{0,120}?unwrap_or(?:_else|_default)?\s*(?:\(\s*(?:\|\|?\s*)?(?:""\.to_string\(\)|""|"([^"]*)")\s*\))?/g,
  )) {
    paramRefs[m[1]] = {
      source: "query",
      name: m[2],
      default: m[3] !== undefined ? m[3] : "",
    };
  }
  // let q = req.query_string() … too opaque — skip
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseRustBodyReturn(bodySlice, paramRefs) {
  collectRustParamLets(bodySlice, paramRefs);

  /** @type {number | undefined} */
  let status;
  /** @type {object | null} */
  let returnTree = null;
  /** @type {"json" | "scalar-lit" | "scalar-ref" | null} */
  let kind = null;

  /** @param {string} expr */
  function jsonFromExpr(expr) {
    const m = /serde_json::json!\s*\(/.exec(expr);
    if (!m || m.index === undefined) return null;
    // json!({ ... }) — brace object
    const after = expr.slice(m.index + m[0].length);
    const braceOpen = after.search(/\{/);
    if (braceOpen < 0) return null;
    const absBrace = m.index + m[0].length + braceOpen;
    const bal = extractBalancedBraceInner(expr, absBrace);
    if (!bal) return null;
    return parseRustJsonReturnTree(bal.inner, paramRefs);
  }

  const createdJson = /HttpResponse::Created\s*\(\s*\)\s*\.\s*json\s*\(/.exec(bodySlice);
  const acceptedJson = /HttpResponse::Accepted\s*\(\s*\)\s*\.\s*json\s*\(/.exec(bodySlice);
  const okJson = /HttpResponse::Ok\s*\(\s*\)\s*\.\s*json\s*\(/.exec(bodySlice);
  const statusJson = /HttpResponse::([A-Za-z_]+)\s*\(\s*\)\s*\.\s*json\s*\(/.exec(bodySlice);
  const bareJson = /serde_json::json!\s*\(/.exec(bodySlice);
  const litExpr = /(?:^|\n)\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*")\s*;?\s*$/m.exec(bodySlice);
  const refExpr = /(?:^|\n)\s*([A-Za-z_][A-Za-z0-9_]*)\s*;?\s*$/m.exec(bodySlice);
  const bodyStr = /HttpResponse::Ok\s*\(\s*\)\s*\.\s*body\s*\(\s*"([^"]*)"\s*\)/.exec(bodySlice);

  /** @param {string | null | undefined} argInner */
  function treeFromJsonArg(argInner) {
    if (!argInner) return null;
    const trimmed = argInner.trim();
    if (/serde_json::json!\s*\(/.test(trimmed)) return jsonFromExpr(trimmed);
    if (trimmed.startsWith("{")) {
      const bal = extractBalancedBraceInner(trimmed, 0);
      return bal ? parseRustJsonReturnTree(bal.inner, paramRefs) : null;
    }
    return null;
  }

  if (createdJson) {
    status = 201;
    const arg = argAfterMarker(bodySlice, ".json(", createdJson.index ?? 0);
    returnTree = treeFromJsonArg(arg?.inner);
    kind = returnTree ? "json" : null;
  } else if (acceptedJson) {
    status = 202;
    const arg = argAfterMarker(bodySlice, ".json(", acceptedJson.index ?? 0);
    returnTree = treeFromJsonArg(arg?.inner);
    kind = returnTree ? "json" : null;
  } else if (okJson) {
    status = 200;
    const arg = argAfterMarker(bodySlice, ".json(", okJson.index ?? 0);
    returnTree = treeFromJsonArg(arg?.inner);
    if (!returnTree && arg) {
      const lit = parseLiteralToken(arg.inner.trim());
      if (lit !== null) {
        returnTree = { t: "lit", v: lit };
        kind = "scalar-lit";
      }
    } else {
      kind = returnTree ? "json" : null;
    }
  } else if (statusJson && RUST_HTTP_STATUS[statusJson[1]] !== undefined) {
    status = RUST_HTTP_STATUS[statusJson[1]];
    const arg = argAfterMarker(bodySlice, ".json(", statusJson.index ?? 0);
    returnTree = treeFromJsonArg(arg?.inner);
    kind = returnTree ? "json" : null;
  } else if (bareJson) {
    returnTree = jsonFromExpr(bodySlice.slice(bareJson.index ?? 0));
    kind = returnTree ? "json" : null;
    // Axum: (StatusCode::CREATED, Json(serde_json::json!(…)))
    if (kind === "json") {
      const axumSt = /StatusCode::([A-Za-z_]+)/.exec(bodySlice);
      if (axumSt && RUST_HTTP_STATUS[axumSt[1]] !== undefined) {
        status = RUST_HTTP_STATUS[axumSt[1]];
      }
    }
  } else if (bodyStr) {
    returnTree = { t: "lit", v: bodyStr[1] };
    kind = "scalar-lit";
  } else if (litExpr) {
    const v = parseLiteralToken(litExpr[1]);
    if (v !== null) {
      returnTree = { t: "lit", v };
      kind = "scalar-lit";
    }
  } else if (refExpr && paramRefs[refExpr[1]]) {
    returnTree = { t: "ref", ...paramRefs[refExpr[1]] };
    kind = "scalar-ref";
  }

  return { status, returnTree, kind };
}

/**
 * @param {object} ctx
 * @param {{ returnTree: object | null, status?: number, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerRustHandlerBodyFull(ctx, parsed, loc) {
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
        provenance: [webir.provenance("hub-ingest", "rust-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "rust-handler-body")],
  });
}

/**
 * @param {object} opts
 */
export function liftRustFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseRustRoutes(source, file).map((r) => ({
    ...r,
    path: normalizeRustRoutePath(r.path),
  }));
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const extracted = extractRustHandlerBody(source, idx);
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-rust:handler-body", { file, line: r.line });
    } else {
      const { bodySlice, line } = extracted;
      const loc = { file, line };
      /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
      const paramRefs = { ...pathParamRefsFromPath(r.path) };
      const { status, returnTree, kind } = parseRustBodyReturn(bodySlice, paramRefs);

      if (kind === "scalar-lit" && returnTree?.t === "lit") {
        bodyId = lowerHubLiteral(ctx, returnTree.v, loc);
      } else if (returnTree || (typeof status === "number" && status !== 200)) {
        bodyId =
          lowerRustHandlerBodyFull(ctx, { returnTree, status, line }, loc) ??
          hubHandlerBodyHole(ctx, "hub-rust:handler-body", loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-rust:handler-body", loc);
      }
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
