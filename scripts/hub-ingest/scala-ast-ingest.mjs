/**
 * Scala hub ingest — Akka HTTP / Play / Http4s / Finch path patterns deepened for
 * D6448-ST cwl-api: brace-bounded Akka bodies + Http4s `case … => Ok/Created/…` +
 * Finch `get("path") { Ok(…) }` / Tapir `endpoint.get.in("seg").serverLogicSuccess(…)`, Map/lit
 * (+ path/query refs). Flagship stays Akka (`hub-flagship-scala`); Http4s + Finch + Tapir
 * are secondary hole-free dialect paths. Prefer this over thin pattern-route-lift.
 */
import {
  findFinchEndpointAt,
  findTapirEndpointAt,
  parseScalaRoutes,
  stripScalaEndpointLambda,
} from "./pattern-route-parsers.mjs";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { extractBalancedBraceInner } from "./go-ast-ingest.mjs";

export { parseScalaRoutes };

const SCALA_HTTP_STATUS = {
  OK: 200,
  Created: 201,
  CREATED: 201,
  Accepted: 202,
  ACCEPTED: 202,
  NoContent: 204,
  NO_CONTENT: 204,
  BadRequest: 400,
  NOT_FOUND: 404,
  NotFound: 404,
};

/**
 * @param {string} language
 * @param {string} ext
 */
export function canScalaAstIngest(language, ext) {
  return language === "scala" && ext.toLowerCase() === ".scala";
}

/**
 * Normalize Play/Akka/Http4s path templates to CWL `{name}` form.
 * @param {string} path
 */
export function normalizeScalaRoutePath(path) {
  return path
    .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}")
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
}

const HTTP4S_RESPONSE_CTOR =
  "Ok|Created|Accepted|NoContent|BadRequest|NotFound|complete";

const HTTP4S_STATUS = {
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NoContent: 204,
  BadRequest: 400,
  NotFound: 404,
};

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
 * @param {string} statusRaw
 */
function parseScalaHttpStatus(statusRaw) {
  const n = statusRaw.trim();
  if (/^\d+$/.test(n)) return Number.parseInt(n, 10);
  const named = n.match(/StatusCodes\.([A-Za-z_]+)/);
  if (named && SCALA_HTTP_STATUS[named[1]] !== undefined) return SCALA_HTTP_STATUS[named[1]];
  if (SCALA_HTTP_STATUS[n] !== undefined) return SCALA_HTTP_STATUS[n];
  return undefined;
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
 * Bound Akka/Play `{ ... }` after the route matcher, or Http4s `=>` arm body.
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractScalaRouteBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);

  // Tapir: .serverLogicSuccess(…) / .serverLogic(…) — peel lambda body (G10119).
  const tapirSl = slice.match(/\.serverLogic(?:Success)?\s*\(/);
  if (tapirSl && tapirSl.index !== undefined) {
    const absOpen = fromIndex + tapirSl.index + tapirSl[0].length - 1;
    const bal = extractBalancedParenInner(source, absOpen);
    if (bal) {
      const inner = bal.inner.trim();
      const arrow = /^(?:\(([^)=>]+)\)|(_|[A-Za-z_][A-Za-z0-9_]*))(?:\s*:\s*[^=]+)?\s*=>\s*/.exec(
        inner,
      );
      if (arrow) {
        return {
          bodySlice: inner.slice(arrow[0].length).trim(),
          line: source.slice(0, absOpen).split("\n").length,
        };
      }
      if (inner.startsWith("{")) {
        const brace = extractBalancedBraceInner(inner, 0);
        if (brace) {
          return {
            bodySlice: brace.inner,
            line: source.slice(0, absOpen).split("\n").length,
          };
        }
      }
      return {
        bodySlice: inner,
        line: source.slice(0, absOpen).split("\n").length,
      };
    }
  }

  // Akka/Play: get(path("/x")) { ... }  |  ("GET", "/x") -> { ... }  |  GET(p"/x") { ... }
  const braceM = slice.match(/\)\s*(?:->\s*)?\{/);
  if (braceM && braceM.index !== undefined) {
    const openInSlice = braceM.index + braceM[0].lastIndexOf("{");
    const absOpen = fromIndex + openInSlice;
    const bal = extractBalancedBraceInner(source, absOpen);
    if (!bal) return null;
    return {
      bodySlice: bal.inner,
      line: source.slice(0, absOpen).split("\n").length,
    };
  }

  // Http4s: case GET -> Root / "x" => Ok(...)  |  => { ... }
  const arrowM = slice.match(/=>\s*/);
  if (!arrowM || arrowM.index === undefined) return null;
  let i = fromIndex + arrowM.index + arrowM[0].length;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (i >= source.length) return null;
  if (source[i] === "{") {
    const bal = extractBalancedBraceInner(source, i);
    if (!bal) return null;
    return {
      bodySlice: bal.inner,
      line: source.slice(0, i).split("\n").length,
    };
  }
  const exprSlice = source.slice(i, i + 4000);
  const endRel = exprSlice.search(/\n\s*(?:case\b|\})/);
  const bodySlice = (endRel >= 0 ? exprSlice.slice(0, endRel) : exprSlice).trim();
  if (!bodySlice) return null;
  return {
    bodySlice,
    line: source.slice(0, i).split("\n").length,
  };
}

/**
 * @param {string} mapInner
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseScalaMapReturnTree(mapInner, paramRefs) {
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of mapInner.matchAll(/"([^"]+)"\s*->\s*([^,\)]+)/g)) {
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
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseScalaBodyReturn(bodySlice, paramRefs) {
  /** @type {number | undefined} */
  let status;
  /** @type {object | null} */
  let returnTree = null;
  /** @type {"json" | "scalar-lit" | "scalar-ref" | null} */
  let kind = null;

  for (const m of bodySlice.matchAll(
    /(?:val|var)\s+(\w+)\s*=\s*parameter(?:Optional)?\s*\(\s*"([^"]+)"\s*\)(?:\.getOrElse\s*\(\s*"([^"]*)"\s*\))?/g,
  )) {
    paramRefs[m[1]] = {
      source: "query",
      name: m[2],
      ...(m[3] !== undefined ? { default: m[3] } : {}),
    };
  }
  for (const m of bodySlice.matchAll(
    /(?:val|var)\s+(\w+)\s*=\s*parameter\s*\(\s*"([^"]+)"\s*\.?\?\s*\)\.getOrElse\s*\(\s*"([^"]*)"\s*\)/g,
  )) {
    paramRefs[m[1]] = { source: "query", name: m[2], default: m[3] };
  }
  // Http4s query: req.uri.params.getOrElse("q", "") / req.params.getOrElse(...)
  for (const m of bodySlice.matchAll(
    /(?:val|var)\s+(\w+)\s*=\s*(?:req\.(?:uri\.)?params\.getOrElse\s*\(\s*"([^"]+)"\s*,\s*"([^"]*)"\s*\))/g,
  )) {
    paramRefs[m[1]] = { source: "query", name: m[2], default: m[3] };
  }

  /** @param {string} expr */
  function mapFromExpr(expr) {
    const m = /Map\s*\(/.exec(expr);
    if (!m || m.index === undefined) return null;
    const bal = extractBalancedParenInner(expr, m.index + m[0].length - 1);
    if (!bal) return null;
    return parseScalaMapReturnTree(bal.inner, paramRefs);
  }

  const statusMap = /complete\s*\(\s*(StatusCodes\.\w+|\d+)\s*,\s*Map\s*\(/.exec(bodySlice);
  const statusTuple = /complete\s*\(\s*\(\s*(StatusCodes\.\w+|\d+)\s*,\s*Map\s*\(/.exec(bodySlice);
  const plainMap = /complete\s*\(\s*Map\s*\(/.exec(bodySlice);
  const litComplete = /complete\s*\(\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*")\s*\)/.exec(bodySlice);
  const refComplete = /complete\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/.exec(bodySlice);
  const http4sCtorRe = new RegExp(
    `\\b(${HTTP4S_RESPONSE_CTOR})\\s*\\(\\s*Map\\s*\\(`,
  );
  const http4sLitRe = new RegExp(
    `\\b(${HTTP4S_RESPONSE_CTOR})\\s*\\(\\s*(true|false|-?\\d+(?:\\.\\d+)?|"[^"]*")\\s*\\)`,
  );
  const http4sRefRe = new RegExp(
    `\\b(${HTTP4S_RESPONSE_CTOR})\\s*\\(\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\)`,
  );
  const http4sMap = http4sCtorRe.exec(bodySlice);
  const http4sLit = http4sLitRe.exec(bodySlice);
  const http4sRef = http4sRefRe.exec(bodySlice);

  if (statusMap) {
    status = parseScalaHttpStatus(statusMap[1]);
    const mapArg = extractBalancedParenInner(bodySlice, statusMap.index + statusMap[0].lastIndexOf("("));
    returnTree = mapArg ? parseScalaMapReturnTree(mapArg.inner, paramRefs) : null;
    kind = returnTree ? "json" : null;
  } else if (statusTuple) {
    status = parseScalaHttpStatus(statusTuple[1]);
    const mapStart = bodySlice.indexOf("Map(", statusTuple.index ?? 0);
    const mapArg = mapStart >= 0 ? extractBalancedParenInner(bodySlice, mapStart + 3) : null;
    returnTree = mapArg ? parseScalaMapReturnTree(mapArg.inner, paramRefs) : null;
    kind = returnTree ? "json" : null;
  } else if (plainMap) {
    const mapArg = extractBalancedParenInner(bodySlice, plainMap.index + plainMap[0].lastIndexOf("("));
    returnTree = mapArg ? parseScalaMapReturnTree(mapArg.inner, paramRefs) : null;
    kind = returnTree ? "json" : null;
  } else if (http4sMap && http4sMap[1] !== "complete") {
    status = HTTP4S_STATUS[http4sMap[1]] ?? 200;
    const mapStart = bodySlice.indexOf("Map(", http4sMap.index ?? 0);
    const mapArg = mapStart >= 0 ? extractBalancedParenInner(bodySlice, mapStart + 3) : null;
    returnTree = mapArg ? parseScalaMapReturnTree(mapArg.inner, paramRefs) : null;
    kind = returnTree ? "json" : null;
  } else if (litComplete) {
    const v = parseLiteralToken(litComplete[1]);
    if (v !== null) {
      returnTree = { t: "lit", v };
      kind = "scalar-lit";
    }
  } else if (http4sLit && http4sLit[1] !== "complete") {
    status = HTTP4S_STATUS[http4sLit[1]] ?? 200;
    const v = parseLiteralToken(http4sLit[2]);
    if (v !== null) {
      returnTree = { t: "lit", v };
      kind = "scalar-lit";
    }
  } else if (refComplete && paramRefs[refComplete[1]]) {
    returnTree = { t: "ref", ...paramRefs[refComplete[1]] };
    kind = "scalar-ref";
  } else if (http4sRef && http4sRef[1] !== "complete" && paramRefs[http4sRef[2]]) {
    status = HTTP4S_STATUS[http4sRef[1]] ?? 200;
    returnTree = { t: "ref", ...paramRefs[http4sRef[2]] };
    kind = "scalar-ref";
  } else {
    // Tapir serverLogicSuccess body: Right/IO.pure/pure wrappers then bare Map/lit/ref
    let slice = bodySlice.trim();
    const wrap = /^(?:Right|IO\.pure|pure)\s*\(/.exec(slice);
    if (wrap) {
      const bal = extractBalancedParenInner(slice, wrap[0].length - 1);
      if (bal) slice = bal.inner.trim();
    }
    const bareMap = /^Map\s*\(/.exec(slice);
    if (bareMap) {
      const mapArg = extractBalancedParenInner(slice, bareMap[0].length - 1);
      returnTree = mapArg ? parseScalaMapReturnTree(mapArg.inner, paramRefs) : null;
      kind = returnTree ? "json" : null;
    } else {
      const bareLit = /^(true|false|-?\d+(?:\.\d+)?|"([^"]*)")\s*$/.exec(slice);
      if (bareLit) {
        const v =
          bareLit[2] !== undefined ? bareLit[2] : parseLiteralToken(bareLit[1]);
        if (v !== null) {
          returnTree = { t: "lit", v };
          kind = "scalar-lit";
        }
      } else {
        const bareRef = /^([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(slice);
        if (bareRef && paramRefs[bareRef[1]]) {
          returnTree = { t: "ref", ...paramRefs[bareRef[1]] };
          kind = "scalar-ref";
        }
      }
    }
  }

  return { status, returnTree, kind };
}

/**
 * @param {object} ctx
 * @param {{ returnTree: object | null, status?: number, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerScalaHandlerBodyFull(ctx, parsed, loc) {
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
        provenance: [webir.provenance("hub-ingest", "scala-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "scala-handler-body")],
  });
}

/**
 * @param {object} opts
 */
export function liftScalaFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseScalaRoutes(source, file).map((r) => ({
    ...r,
    path: normalizeScalaRoutePath(r.path),
  }));
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const extracted = extractScalaRouteBody(source, idx);
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-scala:handler-body", { file, line: r.line });
    } else {
      const { line } = extracted;
      const loc = { file, line };
      const stripped = stripScalaEndpointLambda(extracted.bodySlice);
      const bodySlice = stripped.body;
      /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
      const paramRefs = { ...pathParamRefsFromPath(r.path) };
      // Finch query binders: `get("search" :: param[String]("q")) { q => … }`
      const finch = findFinchEndpointAt(source, idx);
      if (finch) {
        for (const q of finch.queryBinds) {
          paramRefs[q.varName] = {
            source: "query",
            name: q.queryName,
            default: "",
          };
        }
      }
      // Tapir query / status: `endpoint.get.in(query[String]("q")).out(statusCode(…))`
      const tapir = findTapirEndpointAt(source, idx);
      if (tapir) {
        for (const q of tapir.queryBinds) {
          paramRefs[q.varName] = {
            source: "query",
            name: q.queryName,
            default: "",
          };
        }
      }
      let { status, returnTree, kind } = parseScalaBodyReturn(bodySlice, paramRefs);
      if (tapir?.status != null && (status == null || status === 200)) {
        status = tapir.status;
      }

      if (
        kind === "scalar-lit" &&
        returnTree?.t === "lit" &&
        !(typeof status === "number" && status !== 200)
      ) {
        bodyId = lowerHubLiteral(ctx, returnTree.v, loc);
      } else if (returnTree || (typeof status === "number" && status !== 200)) {
        bodyId =
          lowerScalaHandlerBodyFull(ctx, { returnTree, status, line }, loc) ??
          hubHandlerBodyHole(ctx, "hub-scala:handler-body", loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-scala:handler-body", loc);
      }
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
