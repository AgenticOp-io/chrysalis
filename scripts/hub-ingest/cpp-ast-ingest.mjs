/**
 * C++ hub ingest — Crow (`CROW_ROUTE`) + cpp-httplib (`svr.Get/Post/…`) deepened
 * for D6448-ST cwl-api flagship: brace-bounded handler bodies, crow::json::wvalue /
 * httplib set_content JSON, path/query refs, crow::response(status, …) (hub-flagship-cpp).
 * Prefer this over silver file-lift when HTTP framework routes are present.
 */
import {
  emitHubRoute,
  hubHandlerBodyHole,
  hubOrigin,
  HUB_T,
  lowerHubLiteral,
} from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";
import { extractBalancedBraceInner } from "./go-ast-ingest.mjs";
import { lineAt } from "./pattern-route-parsers.mjs";

/**
 * @param {string} language
 * @param {string} ext
 */
export function canCppAstIngest(language, ext) {
  return language === "cpp" && ext.toLowerCase() === ".cpp";
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
 * Crow typed captures → `{name}` using handler path-param names in order.
 * @param {string} path
 * @param {string[]} pathParamNames
 */
export function normalizeCrowRoutePath(path, pathParamNames = []) {
  let i = 0;
  return path.replace(/<(?:int|uint|double|string|path)>/gi, () => {
    const name = pathParamNames[i++] ?? `p${i}`;
    return `{${name}}`;
  });
}

/**
 * cpp-httplib regex captures → `{name}` when `auto name = req.matches[N]` is known.
 * Literal Express-like `:id` stays; bare regex groups become `{p1}` without names.
 * @param {string} path
 * @param {Record<number, string>} matchNames — 1-based match index → var name
 */
export function normalizeHttplibRoutePath(path, matchNames = {}) {
  // Unescape raw-string / slash-heavy regex paths like /items/([^/]+)
  let p = path;
  if (p.startsWith("R\"(") && p.endsWith(")\"")) {
    p = p.slice(3, -2);
  } else if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
    p = p.slice(1, -1);
  }
  let group = 0;
  p = p.replace(/\((?:\?:)?[^)]+\)/g, () => {
    group += 1;
    const name = matchNames[group] ?? `p${group}`;
    return `{${name}}`;
  });
  // Drop regex anchors / noise that httplib sometimes wraps
  p = p.replace(/^\^/, "").replace(/\$$/, "");
  return p.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
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
  for (const m of path.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)) {
    refs[m[1]] = { source: "path", name: m[1] };
  }
  return refs;
}

/**
 * @param {string} paramSource — lambda parameter list
 */
function crowPathParamNames(paramSource) {
  /** @type {string[]} */
  const names = [];
  for (const part of paramSource.split(",")) {
    const p = part.trim();
    if (!p) continue;
    if (/crow::request\b/.test(p) || /\bRequest\b/.test(p) || /\bResponse\b/.test(p)) continue;
    const m = p.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*$/);
    if (m) names.push(m[1]);
  }
  return names;
}

/**
 * @param {string} methodsInner
 */
function parseCrowMethods(methodsInner) {
  /** @type {string[]} */
  const methods = [];
  for (const m of methodsInner.matchAll(/HTTPMethod::(Get|Post|Put|Patch|Delete|Head|Options)/gi)) {
    methods.push(m[1].toUpperCase());
  }
  for (const m of methodsInner.matchAll(/"([A-Za-z]+)"_method/g)) {
    methods.push(m[1].toUpperCase());
  }
  return methods.length > 0 ? methods : ["GET"];
}

/**
 * Parse Crow `CROW_ROUTE(app, "/path")[.methods(...)]([](…){…})` registrations.
 * @param {string} source
 * @param {string} [file]
 */
export function parseCppCrowRoutes(source, file = "") {
  /** @type {Array<{ method: string, path: string, line: number, name?: string, index: number, dialect: string }>} */
  const routes = [];
  const seen = new Set();
  const re = /CROW_ROUTE\s*\(\s*\w+\s*,\s*"([^"]+)"\s*\)/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const rawPath = m[1];
    const after = source.slice(m.index + m[0].length, m.index + m[0].length + 400);
    const methodsM = /^\s*\.methods\s*\(/.exec(after);
    /** @type {string[]} */
    let methods = ["GET"];
    let cursor = m.index + m[0].length;
    if (methodsM) {
      const openIdx = cursor + (methodsM.index ?? 0) + methodsM[0].length - 1;
      const bal = extractBalancedParenInner(source, openIdx);
      if (bal) {
        methods = parseCrowMethods(bal.inner);
        cursor = bal.end + 1;
      }
    }
    const slice = source.slice(cursor, cursor + 2000);
    const lam = slice.match(/\(\s*(?:\[[^\]]*\]\s*)?\(([^)]*)\)\s*(?:mutable\s*)?\{/);
    const pathNames = lam ? crowPathParamNames(lam[1]) : [];
    const path = normalizeCrowRoutePath(rawPath, pathNames);
    for (const method of methods) {
      const key = `${method}:${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      routes.push({
        method,
        path,
        line: lineAt(source, m.index),
        name: `cpp_${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
        index: m.index,
        dialect: "crow",
        file,
        pathParamNames: pathNames,
      });
    }
  }
  return routes;
}

/**
 * Parse cpp-httplib `svr.Get/Post/Put/Patch/Delete("/path"|R"(…)", [](…){…})`.
 * @param {string} source
 * @param {string} [file]
 */
export function parseCppHttplibRoutes(source, file = "") {
  /** @type {Array<{ method: string, path: string, line: number, name?: string, index: number, dialect: string }>} */
  const routes = [];
  const seen = new Set();
  const re = /\.\s*(Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const method = m[1].toUpperCase();
    let i = m.index + m[0].length;
    /** @type {string | null} */
    let rawPath = null;
    if (source.startsWith('R"(', i)) {
      const start = i + 3;
      const end = source.indexOf(')"', start);
      if (end < 0) continue;
      rawPath = source.slice(start, end);
      i = end + 2;
    } else if (source[i] === '"' || source[i] === "'") {
      const quote = source[i];
      i += 1;
      let buf = "";
      while (i < source.length) {
        if (source[i] === "\\") {
          buf += source[i + 1] ?? "";
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          i += 1;
          break;
        }
        buf += source[i];
        i += 1;
      }
      rawPath = buf;
    } else {
      continue;
    }
    if (!rawPath) continue;
    const path = normalizeHttplibRoutePath(rawPath);
    const key = `${method}:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({
      method,
      path,
      rawPath,
      line: lineAt(source, m.index),
      name: `cpp_${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
      index: m.index,
      dialect: "httplib",
      file,
    });
  }
  return routes;
}

/**
 * @param {string} source
 */
export function parseCppRoutes(source, file = "") {
  const crow = parseCppCrowRoutes(source, file);
  if (crow.length > 0) return crow;
  return parseCppHttplibRoutes(source, file);
}

/**
 * Bound Crow/httplib lambda body after a route registration.
 * @param {string} source
 * @param {number} fromIndex
 */
export function extractCppHandlerBody(source, fromIndex) {
  const slice = source.slice(fromIndex, fromIndex + 8000);
  // Crow: CROW_ROUTE… ([](args){ … })  or  ([](){ … })
  // httplib: .Get("…", [](const httplib::Request& req, httplib::Response& res){ … })
  const lam = slice.match(
    /\(\s*(?:\[[^\]]*\]\s*)?\(([^)]*)\)\s*(?:mutable\s*)?\{|\b(?:Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*(?:R"\([^)]*\)"|R"[^"]*"|"(?:[^"\\]|\\.)*")\s*,\s*(?:\[[^\]]*\]\s*)?\(([^)]*)\)\s*(?:mutable\s*)?\{/,
  );
  if (!lam || lam.index === undefined) return null;
  const openInSlice = lam.index + lam[0].lastIndexOf("{");
  const absOpen = fromIndex + openInSlice;
  const bal = extractBalancedBraceInner(source, absOpen);
  if (!bal) return null;
  const paramSource = lam[1] ?? lam[2] ?? "";
  return {
    paramSource,
    bodySlice: bal.inner,
    line: source.slice(0, absOpen).split("\n").length,
    absOpen,
    absEnd: bal.end,
  };
}

/**
 * @param {string} jsonInner
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseCppJsonObjectTree(jsonInner, paramRefs) {
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const pair of jsonInner.matchAll(/"([^"]+)"\s*:\s*([^,\}\n]+)/g)) {
    const key = pair[1];
    let rawVal = pair[2].trim().replace(/,$/, "");
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
 * Crow `x["k"] = v;` assignments → return tree object.
 * @param {string} bodySlice
 * @param {string} varName
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseCrowWvalueAssignments(bodySlice, varName, paramRefs) {
  const re = new RegExp(
    String.raw`${varName}\s*\[\s*"([^"]+)"\s*\]\s*=\s*([^;]+);`,
    "g",
  );
  /** @type {Array<{ key: string, value: object }>} */
  const entries = [];
  for (const m of bodySlice.matchAll(re)) {
    const key = m[1];
    const rawVal = m[2].trim();
    const lit = parseLiteralToken(rawVal);
    if (lit !== null) {
      entries.push({ key, value: { t: "lit", v: lit } });
    } else if (paramRefs[rawVal]) {
      entries.push({ key, value: { t: "ref", ...paramRefs[rawVal] } });
    } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(rawVal) && paramRefs[rawVal]) {
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
function collectCppParamRefs(bodySlice, paramRefs) {
  // Crow: auto q = req.url_params.get("q");  /  string q = req.url_params.get("q");
  for (const m of bodySlice.matchAll(
    /(?:auto|std::string|string)\s+(\w+)\s*=\s*\w+\.url_params\.get\s*\(\s*"([^"]+)"\s*\)/g,
  )) {
    paramRefs[m[1]] = { source: "query", name: m[2], default: "" };
  }
  // httplib: auto q = req.get_param_value("q");
  for (const m of bodySlice.matchAll(
    /(?:auto|std::string|string)\s+(\w+)\s*=\s*\w+\.get_param_value\s*\(\s*"([^"]+)"\s*\)/g,
  )) {
    paramRefs[m[1]] = { source: "query", name: m[2], default: "" };
  }
  // httplib: auto id = req.matches[1];
  for (const m of bodySlice.matchAll(
    /(?:auto|std::string|string)\s+(\w+)\s*=\s*\w+\.matches\s*\[\s*(\d+)\s*\]/g,
  )) {
    paramRefs[m[1]] = { source: "path", name: m[1] };
    paramRefs[`__match_${m[2]}`] = { source: "path", name: m[1], matchIndex: Number(m[2]) };
  }
}

/**
 * @param {string} bodySlice
 * @param {Record<string, { source: string, name: string, default?: unknown }>} paramRefs
 */
function parseCppBodyReturn(bodySlice, paramRefs) {
  collectCppParamRefs(bodySlice, paramRefs);

  /** @type {number | undefined} */
  let status;
  /** @type {object | null} */
  let returnTree = null;
  /** @type {"json" | "scalar-lit" | "scalar-ref" | null} */
  let kind = null;

  // httplib: res.status = 201;
  const statusAssign = bodySlice.match(/\bres\.status\s*=\s*(\d+)\s*;/);
  if (statusAssign) status = Number.parseInt(statusAssign[1], 10);

  // Crow: return crow::response(201, x);  or return crow::response(202, x);
  const crowResp = bodySlice.match(
    /return\s+crow::response\s*\(\s*(\d+)\s*,\s*(\w+)\s*\)\s*;/,
  );
  if (crowResp) {
    status = Number.parseInt(crowResp[1], 10);
    const tree = parseCrowWvalueAssignments(bodySlice, crowResp[2], paramRefs);
    if (tree) {
      returnTree = tree;
      kind = "json";
      return { status, returnTree, kind };
    }
  }

  // Crow: return crow::response(200, "ok"); / crow::response("ok");
  const crowRespLit = bodySlice.match(
    /return\s+crow::response\s*\(\s*(?:(\d+)\s*,\s*)?(true|false|-?\d+|"([^"]*)")\s*\)\s*;/,
  );
  if (crowRespLit) {
    if (crowRespLit[1]) status = Number.parseInt(crowRespLit[1], 10);
    const lit =
      crowRespLit[3] !== undefined
        ? crowRespLit[3]
        : parseLiteralToken(crowRespLit[2]);
    if (lit !== null) {
      returnTree = { t: "lit", v: lit };
      kind = "scalar-lit";
      return { status, returnTree, kind };
    }
  }

  // Crow: return crow::json::wvalue(true|42|"x"|userId);
  const crowWvalScalar = bodySlice.match(
    /return\s+crow::json::wvalue\s*\(\s*(true|false|-?\d+|"([^"]*)"|([A-Za-z_][A-Za-z0-9_]*))\s*\)\s*;/,
  );
  if (crowWvalScalar) {
    if (crowWvalScalar[3] && paramRefs[crowWvalScalar[3]]) {
      returnTree = { t: "ref", ...paramRefs[crowWvalScalar[3]] };
      kind = "scalar-ref";
      return { status, returnTree, kind };
    }
    const lit =
      crowWvalScalar[2] !== undefined
        ? crowWvalScalar[2]
        : parseLiteralToken(crowWvalScalar[1]);
    if (lit !== null) {
      returnTree = { t: "lit", v: lit };
      kind = "scalar-lit";
      return { status, returnTree, kind };
    }
  }

  // Crow / nlohmann: x["k"] = v;  (same assignment shape)
  const wvalDecl =
    bodySlice.match(/crow::json::wvalue\s+(\w+)\s*;/) ||
    bodySlice.match(/nlohmann::json\s+(\w+)\s*;/);
  const returnVar = bodySlice.match(/return\s+(\w+)\s*;/);
  const dumpSet =
    wvalDecl &&
    bodySlice.match(
      new RegExp(
        String.raw`res\.set_content\s*\(\s*${wvalDecl[1]}\.dump\s*\(\s*\)\s*,\s*"application/json"\s*\)`,
      ),
    );
  if (wvalDecl && ((returnVar && returnVar[1] === wvalDecl[1]) || dumpSet)) {
    const tree = parseCrowWvalueAssignments(bodySlice, wvalDecl[1], paramRefs);
    if (tree) {
      returnTree = tree;
      kind = "json";
      return { status, returnTree, kind };
    }
  }

  // httplib scalar/text set_content — also accept path-param var as body
  const setContentVar = bodySlice.match(
    /res\.set_content\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*"([^"]+)"\s*\)/,
  );
  if (setContentVar && paramRefs[setContentVar[1]]) {
    returnTree = { t: "ref", ...paramRefs[setContentVar[1]] };
    kind = "scalar-ref";
    return { status, returnTree, kind };
  }

  // Crow bare: return true; / return 42; / return "ok"; / return userId;
  const bareReturn = bodySlice.match(
    /return\s+(true|false|-?\d+(?:\.\d+)?|"([^"]*)"|([A-Za-z_][A-Za-z0-9_]*))\s*;/,
  );
  if (bareReturn && !/crow::/.test(bareReturn[0])) {
    if (bareReturn[2] !== undefined) {
      returnTree = { t: "lit", v: bareReturn[2] };
      kind = "scalar-lit";
      return { status, returnTree, kind };
    }
    if (bareReturn[3] && paramRefs[bareReturn[3]]) {
      returnTree = { t: "ref", ...paramRefs[bareReturn[3]] };
      kind = "scalar-ref";
      return { status, returnTree, kind };
    }
    if (bareReturn[1] && !bareReturn[3]) {
      const lit = parseLiteralToken(bareReturn[1]);
      if (lit !== null) {
        returnTree = { t: "lit", v: lit };
        kind = "scalar-lit";
        return { status, returnTree, kind };
      }
    }
    // `return true` — bareReturn[1] is true/false/-?\d when no group 3
    if (/^(true|false|-?\d+(?:\.\d+)?)$/.test(bareReturn[1])) {
      const lit = parseLiteralToken(bareReturn[1]);
      if (lit !== null) {
        returnTree = { t: "lit", v: lit };
        kind = "scalar-lit";
        return { status, returnTree, kind };
      }
    }
  }

  // httplib: res.set_content(R"({"k":…})", "application/json");
  const setContent = bodySlice.match(
    /res\.set_content\s*\(\s*(?:R"\(([\s\S]*?)\)"|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'))\s*,\s*"([^"]+)"\s*\)/,
  );
  if (setContent) {
    const body = setContent[1] ?? (setContent[2] ? setContent[2].slice(1, -1) : "");
    const ct = setContent[3];
    if (/json/i.test(ct) && body.trim().startsWith("{")) {
      const tree = parseCppJsonObjectTree(body.trim().slice(1, -1), paramRefs);
      if (tree) {
        returnTree = tree;
        kind = "json";
        return { status, returnTree, kind };
      }
    }
    // Scalar / text
    const lit = parseLiteralToken(body) ?? (/^(true|false|-?\d+)$/.test(body.trim()) ? parseLiteralToken(body.trim()) : body);
    if (lit !== null && lit !== undefined) {
      // httplib often writes JSON bools as text "true"
      if (body.trim() === "true" || body.trim() === "false") {
        returnTree = { t: "lit", v: body.trim() === "true" };
      } else if (/^-?\d+$/.test(body.trim())) {
        returnTree = { t: "lit", v: Number.parseInt(body.trim(), 10) };
      } else {
        returnTree = { t: "lit", v: typeof lit === "string" ? lit : lit };
      }
      kind = "scalar-lit";
      return { status, returnTree, kind };
    }
  }

  return { status, returnTree, kind };
}

/**
 * @param {object} ctx
 * @param {{ returnTree: object | null, status?: number, line: number }} parsed
 * @param {{ file: string, line?: number }} loc
 */
function lowerCppHandlerBodyFull(ctx, parsed, loc) {
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
        provenance: [webir.provenance("hub-ingest", "cpp-ast:json-status")],
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
    provenance: [webir.provenance("hub-ingest", "cpp-handler-body")],
  });
}

/**
 * Refine httplib regex path using `req.matches[N]` variable names from the body.
 * @param {object} route
 * @param {string} bodySlice
 */
function refineHttplibPath(route, bodySlice) {
  if (route.dialect !== "httplib" || !route.rawPath) return route.path;
  /** @type {Record<number, string>} */
  const matchNames = {};
  for (const m of bodySlice.matchAll(
    /(?:auto|std::string|string)\s+(\w+)\s*=\s*\w+\.matches\s*\[\s*(\d+)\s*\]/g,
  )) {
    matchNames[Number(m[2])] = m[1];
  }
  return normalizeHttplibRoutePath(route.rawPath, matchNames);
}

/**
 * @param {object} opts
 */
export function liftCppFileToWebir(opts) {
  const { webir, builder, wr, source, file, language } = opts;
  const data = webir.dataDialect.builders(builder);
  const effect = webir.effectDialect.builders(builder);
  const ctx = { data, effect, webir };
  const routes = parseCppRoutes(source, file);
  if (routes.length === 0) {
    return { routeCount: 0, astRouteCount: 0, usedAst: false };
  }

  for (const r of routes) {
    const extracted = extractCppHandlerBody(source, r.index);
    let bodyId;
    let path = r.path;
    if (!extracted) {
      bodyId = hubHandlerBodyHole(ctx, "hub-cpp:handler-body", { file, line: r.line });
    } else {
      const { bodySlice, line, paramSource } = extracted;
      const loc = { file, line };
      path = refineHttplibPath(r, bodySlice);
      // Re-normalize Crow path if we have fresher param names from the lambda
      if (r.dialect === "crow" && /<\w+>/.test(r.path) === false) {
        // already normalized at parse time
      }
      /** @type {Record<string, { source: string, name: string, default?: unknown }>} */
      const paramRefs = { ...pathParamRefsFromPath(path) };
      for (const name of crowPathParamNames(paramSource)) {
        if (!paramRefs[name]) paramRefs[name] = { source: "path", name };
      }
      const { status, returnTree, kind } = parseCppBodyReturn(bodySlice, paramRefs);

      if (kind === "scalar-lit" && returnTree?.t === "lit") {
        bodyId = lowerHubLiteral(ctx, returnTree.v, loc);
      } else if (kind === "scalar-ref" && returnTree) {
        bodyId =
          lowerCppHandlerBodyFull(ctx, { returnTree, status, line }, loc) ??
          hubHandlerBodyHole(ctx, "hub-cpp:handler-body", loc);
      } else if (returnTree || (typeof status === "number" && status !== 200)) {
        bodyId =
          lowerCppHandlerBodyFull(ctx, { returnTree, status, line }, loc) ??
          hubHandlerBodyHole(ctx, "hub-cpp:handler-body", loc);
      } else {
        bodyId = hubHandlerBodyHole(ctx, "hub-cpp:handler-body", loc);
      }
    }
    emitHubRoute({
      webir,
      builder,
      wr,
      language,
      file,
      route: { ...r, path, name: `cpp_${r.method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}` },
      bodyId,
    });
  }

  return { routeCount: routes.length, astRouteCount: routes.length, usedAst: true };
}
