/**
 * Swift hub ingest — Vapor `app.*` routes deepened for D6448-ST cwl-api flagship:
 * multi-segment PathComponents (`app.get("items", ":id")`) and single-string
 * templates, brace-bounded closures, dict returns (+ path/query refs),
 * encodeResponse status, scalar returns (hub-flagship-swift). Prefer this over
 * thin pattern-route-lift.
 */
import { parseSwiftRoutes } from "./pattern-route-parsers.mjs";
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { extractBalancedBraceInner } from "./go-ast-ingest.mjs";

export { parseSwiftRoutes };

const SWIFT_HTTP_STATUS = {
  ok: 200,
  created: 201,
  accepted: 202,
  noContent: 204,
  badRequest: 400,
  notFound: 404,
};

/**
 * @param {string} language
 * @param {string} ext
 */
export function canSwiftAstIngest(language, ext) {
  return language === "swift" && ext.toLowerCase() === ".swift";
}

/**
 * Normalize Vapor `:name` path templates to CWL `{name}` form.
 * @param {string} path
 */
export function normalizeSwiftRoutePath(path) {
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
 * @param {string} statusRaw
 */
function parseSwiftHttpStatus(statusRaw) {
  const n = statusRaw.trim().replace(/^HTTPStatus\./, "").replace(/^\./, "");
  if (/^\d+$/.test(n)) return Number.parseInt(n, 10);
  if (SWIFT_HTTP_STATUS[n] !== undefined) return SWIFT_HTTP_STATUS[n];
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
 * @param {string} source
 * @param {number} openIdx — index of `[`
 */
function extractBalancedBracketInner(source, openIdx) {
  if (source[openIdx] !== "[") return null;
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
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) return { inner: source.slice(openIdx + 1, i), end: i };
    }
  }
  return null;
}

/**
 * Bound Vapor `app.get(...) { ... }` closure body.
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractSwiftRouteBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);
  const braceM = slice.match(/\)\s*(?:throws\s+)?(?:->\s*[\w.<>,\s\[\]]+)?\s*\{/);
  if (!braceM || braceM.index === undefined) return null;
  const openInSlice = braceM.index + braceM[0].lastIndexOf("{");
  const absOpen = fromIndex + openInSlice;
  const bal = extractBalancedBraceInner(source, absOpen);
  if (!bal) return null;
  return {
    bodySlice: bal.inner,
    line: source.slice(0, absOpen).split("\n").length,
  };
}

/**
 * @param {string} dictInner
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseSwiftDictReturnTree(dictInner, paramRefs) {
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of dictInner.matchAll(/"([^"]+)"\s*:\s*([^,\]]+)/g)) {
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
function parseSwiftBodyReturn(bodySlice, paramRefs) {
  /** @type {number | undefined} */
  let status;
  /** @type {object | null} */
  let returnTree = null;
  /** @type {"json" | "scalar-lit" | "scalar-ref" | null} */
  let kind = null;

  for (const m of bodySlice.matchAll(
    /(?:let|var)\s+(\w+)\s*=\s*req\.parameters\.get\s*\(\s*"([^"]+)"\s*\)\s*!?(?:\s*\?\?\s*"([^"]*)")?/g,
  )) {
    // Path params: prefer bare refs (no empty-string default) so CWL emits `param name`
    // rather than collapsing `?? ""` to a literal (matches kotlin/java flagship).
    paramRefs[m[1]] = {
      source: "path",
      name: m[2],
      ...(m[3] !== undefined && m[3] !== "" ? { default: m[3] } : {}),
    };
  }
  for (const m of bodySlice.matchAll(
    /(?:let|var)\s+(\w+)\s*=\s*(?:\(try\?\s*)?req\.query\.get\s*\([^,]+,\s*at:\s*"([^"]+)"\s*\)(?:\s*\?\?\s*"([^"]*)")?/g,
  )) {
    paramRefs[m[1]] = {
      source: "query",
      name: m[2],
      ...(m[3] !== undefined ? { default: m[3] } : {}),
    };
  }
  for (const m of bodySlice.matchAll(
    /(?:let|var)\s+(\w+)\s*=\s*req\.query\s*\[\s*"([^"]+)"\s*\](?:\s*\?\?\s*"([^"]*)")?/g,
  )) {
    paramRefs[m[1]] = {
      source: "query",
      name: m[2],
      ...(m[3] !== undefined ? { default: m[3] } : {}),
    };
  }

  const encodeStatus = /(?:return\s+)?(?:try\s+await\s+)?\[/.exec(bodySlice);
  const encodeTail = /\.encodeResponse\s*\(\s*status:\s*(?:HTTPStatus\.)?\.?(\w+)/.exec(bodySlice);
  const plainReturnDict = /return\s*\[/.exec(bodySlice);
  const litReturn = /return\s+(true|false|-?\d+(?:\.\d+)?|"[^"]*")\s*$/m.exec(bodySlice);
  const refReturn = /return\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/m.exec(bodySlice);

  if (encodeStatus && encodeTail) {
    status = parseSwiftHttpStatus(encodeTail[1]);
    const openIdx = (encodeStatus.index ?? 0) + encodeStatus[0].length - 1;
    const dict = extractBalancedBracketInner(bodySlice, openIdx);
    returnTree = dict ? parseSwiftDictReturnTree(dict.inner, paramRefs) : null;
    kind = returnTree ? "json" : null;
  } else if (plainReturnDict) {
    const openIdx = (plainReturnDict.index ?? 0) + plainReturnDict[0].length - 1;
    const dict = extractBalancedBracketInner(bodySlice, openIdx);
    returnTree = dict ? parseSwiftDictReturnTree(dict.inner, paramRefs) : null;
    kind = returnTree ? "json" : null;
  } else if (litReturn) {
    const v = parseLiteralToken(litReturn[1]);
    if (v !== null) {
      returnTree = { t: "lit", v };
      kind = "scalar-lit";
    }
  } else if (refReturn && paramRefs[refReturn[1]]) {
    returnTree = { t: "ref", ...paramRefs[refReturn[1]] };
    kind = "scalar-ref";
  }

  return { status, returnTree, kind };
}

/**
 * @param {object} ctx
 * @param {{ returnTree: object | null, status?: number, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerSwiftHandlerBodyFull(ctx, parsed, loc) {
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
        provenance: [webir.provenance("hub-ingest", "swift-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "swift-handler-body")],
  });
}

/**
 * @param {object} opts
 */
export function liftSwiftFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseSwiftRoutes(source, file).map((r) => ({
    ...r,
    path: normalizeSwiftRoutePath(r.path),
  }));
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const idx = source.split("\n").slice(0, (r.line ?? 1) - 1).join("\n").length;
    const extracted = extractSwiftRouteBody(source, idx);
    let bodyId;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-swift:handler-body", { file, line: r.line });
    } else {
      const { bodySlice, line } = extracted;
      const loc = { file, line };
      /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
      const paramRefs = { ...pathParamRefsFromPath(r.path) };
      const { status, returnTree, kind } = parseSwiftBodyReturn(bodySlice, paramRefs);

      if (kind === "scalar-lit" && returnTree?.t === "lit") {
        bodyId = lowerHubLiteral(ctx, returnTree.v, loc);
      } else if (returnTree || (typeof status === "number" && status !== 200)) {
        bodyId =
          lowerSwiftHandlerBodyFull(ctx, { returnTree, status, line }, loc) ??
          hubHandlerBodyHole(ctx, "hub-swift:handler-body", loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-swift:handler-body", loc);
      }
    }
    emitHubRoute({ webir, builder, wr, language, file, route: r, bodyId });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
